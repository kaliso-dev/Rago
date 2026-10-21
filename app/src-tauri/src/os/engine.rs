//! Moteur de Rago OS : applique et remet chaque réglage du catalogue, action par action.
//!
//! Valeurs de registre, services et tâches passent par le registre des réglages de l'app (applied.json, backup.rs), sous
//! l'identifiant `os.<réglage>` : l'état d'avant de chaque élément y est relevé une seule fois, avant la première
//! modification, par Rago OS ou par un réglage classique de l'app. Un élément touché par les deux n'est remis que
//! quand le dernier réglage qui le tient est retiré, et c'est toujours la valeur d'origine qui revient.
//! Applications du Store et actions natives (fond d'écran, écran de verrouillage, thème, plan d'alimentation) sont
//! gardées dans l'état de Rago OS (state.rs), avec ce qu'il faut pour les remettre.
//!
//! Chaque étape est notée sur disque avant d'être faite : une activation coupée (PC éteint, app tuée) laisse un état
//! que la reprise ou la remise sait finir, jamais une valeur modifiée sans son état d'avant.

use serde::{Deserialize, Serialize};

use super::catalog::{Action, Native, Refresh, Start, Tweak};
use super::state::OsState;
use crate::backup::{hex, Ledger, Probe, Saved};

/// Préfixe des réglages de Rago OS dans applied.json.
pub const PREFIX: &str = "os.";

pub fn ledger_id(tweak: &str) -> String {
    format!("{PREFIX}{tweak}")
}

pub fn is_os(ledger_id: &str) -> bool {
    ledger_id.starts_with(PREFIX)
}

/// Application du Store retirée du compte, avec de quoi la réinscrire.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Appx {
    pub name: String,
    pub full_name: String,
    pub family: String,
    #[serde(default)]
    pub location: Option<String>,
}

/// Ce que le moteur demande à Windows. `win.rs` le fait vraiment ; les tests utilisent un faux système en mémoire.
pub trait Host {
    fn read(&self, probe: &Probe) -> Saved;
    fn restore(&self, probe: &Probe, saved: &Saved) -> Result<(), String>;
    fn write_reg(&self, key: &str, name: &str, kind: u32, data: &[u8]) -> Result<(), String>;
    fn set_task(&self, path: &str, enabled: bool) -> Result<(), String>;
    fn set_service(&self, name: &str, start: Start) -> Result<(), String>;
    /// Paquet installé pour le compte du joueur.
    fn appx_find(&self, name: &str) -> Option<Appx>;
    fn appx_remove(&self, app: &Appx) -> Result<(), String>;
    fn appx_restore(&self, app: &Appx) -> Result<(), String>;
    /// Pose l'action native et renvoie ce qu'il faut garder pour la remettre.
    fn native_apply(&self, what: Native) -> Result<serde_json::Value, String>;
    /// Remet l'état d'avant, sauf si le joueur a changé lui-même depuis (son nouveau choix reste).
    fn native_revert(&self, what: Native, saved: &serde_json::Value) -> Result<(), String>;
    /// L'action native est-elle toujours en place ?
    fn native_in_place(&self, what: Native, saved: &serde_json::Value) -> bool;
    /// Repose l'action native (choix du joueur changé, ou remise par Windows) en gardant l'état d'avant Rago OS ;
    /// renvoie ce qu'il faut garder désormais.
    fn native_update(&self, what: Native, saved: &serde_json::Value) -> Result<serde_json::Value, String> {
        self.native_apply(what).map(|_| saved.clone())
    }
    fn refresh(&self, what: Refresh);
}

/// Élément du registre des réglages qu'une action modifie : valeur, Start du service, tâche planifiée.
pub fn probe_of(action: &Action) -> Option<Probe> {
    Some(match action {
        Action::Reg { key, name, .. } => Probe::Reg { key: key.clone(), name: name.clone() },
        Action::Service { name, .. } => Probe::Reg { key: service_key(name), name: "Start".into() },
        Action::Task { path, .. } => Probe::Task { path: path.clone() },
        Action::Appx { .. } | Action::Native { .. } => return None,
    })
}

pub fn service_key(name: &str) -> String {
    format!(r"HKLM\SYSTEM\CurrentControlSet\Services\{name}")
}

/// Valeur que l'action laisse dans l'élément.
fn target(action: &Action) -> Option<Saved> {
    match action {
        Action::Reg { .. } => action.reg_bytes().map(|(kind, data)| Saved::Value { kind, data: hex(&data) }),
        Action::Service { start, .. } => Some(Saved::Value { kind: super::catalog::REG_DWORD, data: hex(&start.value().to_le_bytes()) }),
        Action::Task { enabled, .. } => Some(Saved::Task { enabled: Some(*enabled) }),
        _ => None,
    }
}

/// L'élément n'existe pas sur ce PC : service ou tâche absents (édition, build), rien à faire ni à remettre.
fn missing(action: &Action, now: &Saved) -> bool {
    match action {
        Action::Service { .. } => matches!(now, Saved::Absent { .. }),
        Action::Task { .. } => matches!(now, Saved::Task { enabled: None }),
        _ => false,
    }
}

fn same(now: &Saved, want: &Saved) -> bool {
    match (now, want) {
        (Saved::Value { kind: a, data: x }, Saved::Value { kind: b, data: y }) => a == b && x.eq_ignore_ascii_case(y),
        _ => now == want,
    }
}

#[derive(Debug, Clone, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub errors: Vec<String>,
    /// actions sans objet sur ce PC (service, tâche ou application absents)
    pub skipped: usize,
    pub changed: usize,
}

impl Outcome {
    pub fn ok(&self) -> bool {
        self.errors.is_empty()
    }
}

/// Persistance entre deux étapes (applied.json et l'état de Rago OS). Les tests n'écrivent rien.
pub trait Save {
    fn ledger(&self, ledger: &Ledger);
    fn state(&self, state: &OsState);
}

/// Applique un réglage. Idempotent : un réglage déjà appliqué ne relève rien de nouveau (l'état d'avant reste celui
/// d'origine) et ne refait que ce qui n'est plus en place. `force` : remettre aussi les actions natives que le joueur
/// a changées depuis (bouton « Réappliquer » d'une dérive).
pub fn apply(host: &dyn Host, save: &dyn Save, ledger: &mut Ledger, state: &mut OsState, tweak: &Tweak, ts: u64, force: bool) -> Outcome {
    let tid = ledger_id(&tweak.id);
    let mut out = Outcome::default();

    // 1. relevé de l'état d'avant de chaque élément, noté avec le réglage avant toute écriture
    let mut writes: Vec<(&Action, Probe)> = Vec::new();
    for action in &tweak.actions {
        let Some(probe) = probe_of(action) else { continue };
        let now = host.read(&probe);
        if missing(action, &now) {
            out.skipped += 1;
            continue;
        }
        // déjà relevé (réapplication, ou élément d'un réglage classique de l'app) : l'état d'origine reste
        ledger.record_before(probe.clone(), now);
        writes.push((action, probe));
    }
    let natives: Vec<Native> = tweak.natives().collect();
    if natives.contains(&Native::Powerplan) {
        // le plan actif d'origine, partagé avec les plans des réglages classiques
        ledger.record_before(Probe::PwrActive, host.read(&Probe::PwrActive));
    }
    let mut probes: Vec<String> = writes.iter().map(|(_, p)| p.id()).collect();
    if natives.contains(&Native::Powerplan) {
        probes.push(Probe::PwrActive.id());
    }
    let ok_before = ledger.tweaks.get(&tid).map(|a| a.ok).unwrap_or(false);
    ledger.set_applied(&tid, None, ok_before, true, probes, ts);
    save.ledger(ledger);

    // 2. écritures
    for (action, probe) in &writes {
        let want = target(action);
        if want.as_ref().is_some_and(|w| same(&host.read(probe), w)) {
            continue;
        }
        let r = match action {
            Action::Reg { key, name, .. } => {
                let (kind, data) = action.reg_bytes().expect("valeur vérifiée par les tests du catalogue");
                host.write_reg(key, name, kind, &data)
            }
            Action::Service { name, start } => host.set_service(name, *start),
            Action::Task { path, enabled } => host.set_task(path, *enabled),
            _ => Ok(()),
        };
        match r {
            Ok(()) => out.changed += 1,
            Err(e) => out.errors.push(format!("{} : {e}", describe(action))),
        }
        let after = host.read(probe);
        if !matches!(after, Saved::Unknown) {
            ledger.set_after(&probe.id(), after);
        } else if let Some(w) = want {
            ledger.set_after(&probe.id(), w);
        }
    }

    // 3. applications du Store : notées avant d'être retirées
    for action in &tweak.actions {
        let Action::Appx { name } = action else { continue };
        let fresh = !state.appx.contains_key(name);
        let Some(app) = host.appx_find(name) else {
            if fresh {
                out.skipped += 1;
            }
            continue;
        };
        if fresh {
            state.appx.insert(name.clone(), app.clone());
            save.state(state);
        }
        match host.appx_remove(&app) {
            Ok(()) => out.changed += 1,
            Err(e) => {
                out.errors.push(format!("{name} : {e}"));
                // toujours installée : rien à réinscrire plus tard
                if fresh && host.appx_find(name).is_some() {
                    state.appx.remove(name);
                }
            }
        }
    }

    // 4. actions natives : l'état d'avant n'est relevé qu'à la première pose
    for what in natives {
        if let Some(saved) = state.natives.get(&what) {
            if !force || host.native_in_place(what, saved) {
                continue;
            }
            // reposée à la demande : l'état d'avant gardé reste celui d'origine
            match host.native_update(what, saved) {
                Ok(kept) => {
                    state.natives.insert(what, kept);
                    out.changed += 1;
                }
                Err(e) => out.errors.push(format!("{what:?} : {e}")),
            }
            continue;
        }
        match host.native_apply(what) {
            Ok(saved) => {
                state.natives.insert(what, saved);
                out.changed += 1;
            }
            Err(e) => out.errors.push(format!("{what:?} : {e}")),
        }
    }
    save.state(state);

    for r in &tweak.refresh {
        host.refresh(*r);
    }
    let probes = ledger.tweaks.get(&tid).map(|a| a.probes.clone()).unwrap_or_default();
    ledger.set_applied(&tid, None, out.ok(), true, probes, ts);
    save.ledger(ledger);
    out
}

/// Remet le réglage comme avant Rago OS. En cas d'échec il reste noté appliqué : un nouvel essai remet ce qui manque
/// (chaque remise vérifie d'abord si l'élément est déjà comme avant).
pub fn revert(host: &dyn Host, save: &dyn Save, ledger: &mut Ledger, state: &mut OsState, tweak: &Tweak) -> Outcome {
    let tid = ledger_id(&tweak.id);
    let mut out = Outcome::default();
    for e in ledger.releasable(&tid) {
        match host.restore(&e.probe, &e.before) {
            Ok(()) => out.changed += 1,
            Err(err) => out.errors.push(format!("{} : {err}", describe_probe(&e.probe))),
        }
    }
    for what in tweak.natives() {
        let Some(saved) = state.natives.get(&what).cloned() else { continue };
        match host.native_revert(what, &saved) {
            Ok(()) => {
                state.natives.remove(&what);
                out.changed += 1;
            }
            Err(e) => out.errors.push(format!("{what:?} : {e}")),
        }
    }
    for action in &tweak.actions {
        let Action::Appx { name } = action else { continue };
        let Some(app) = state.appx.get(name).cloned() else { continue };
        match host.appx_restore(&app) {
            Ok(()) => {
                state.appx.remove(name);
                out.changed += 1;
            }
            Err(e) => out.errors.push(format!("{name} : {e}")),
        }
    }
    save.state(state);
    for r in &tweak.refresh {
        host.refresh(*r);
    }
    if out.ok() {
        ledger.release(&tid);
    }
    save.ledger(ledger);
    out
}

/// État d'un réglage sur ce PC.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// appliqué par Rago OS (noté dans applied.json)
    pub applied: bool,
    /// tout ce qu'il pose est en place en ce moment (par Rago OS, l'app, Windows ou le joueur)
    pub in_place: bool,
}

pub fn status(host: &dyn Host, ledger: &Ledger, state: &OsState, tweak: &Tweak) -> Status {
    let applied = ledger.tweaks.contains_key(&ledger_id(&tweak.id));
    let in_place = tweak.actions.iter().all(|a| match a {
        Action::Appx { name } => host.appx_find(name).is_none(),
        Action::Native { what } => state.natives.get(what).is_some_and(|s| host.native_in_place(*what, s)),
        _ => {
            let probe = probe_of(a).expect("élément du registre");
            let now = host.read(&probe);
            // illisible (hors de Windows) : rien à signaler
            matches!(now, Saved::Unknown) || missing(a, &now) || target(a).is_some_and(|w| same(&now, &w))
        }
    });
    Status { applied, in_place }
}

fn describe(action: &Action) -> String {
    match action {
        Action::Reg { key, name, .. } => format!("{key}\\{name}"),
        Action::Service { name, .. } => format!("service {name}"),
        Action::Task { path, .. } => format!("task {path}"),
        Action::Appx { name } => name.clone(),
        Action::Native { what } => format!("{what:?}"),
    }
}

fn describe_probe(p: &Probe) -> String {
    match p {
        Probe::Reg { key, name } => format!("{key}\\{name}"),
        Probe::Task { path } => format!("task {path}"),
        Probe::PwrActive => "active power plan".into(),
        other => other.id(),
    }
}

#[cfg(test)]
pub mod fake {
    //! Faux Windows en mémoire pour les tests du moteur.
    use super::*;
    use std::cell::RefCell;
    use std::collections::{BTreeMap, HashMap};

    #[derive(Default)]
    pub struct Fake {
        pub values: RefCell<HashMap<String, (u32, Vec<u8>)>>,
        pub tasks: RefCell<HashMap<String, bool>>,
        pub apps: RefCell<BTreeMap<String, Appx>>,
        pub natives: RefCell<BTreeMap<Native, String>>,
        pub active_plan: RefCell<String>,
        /// écritures refusées (clé de registre)
        pub refuse: RefCell<Vec<String>>,
        pub writes: RefCell<usize>,
    }

    fn vid(key: &str, name: &str) -> String {
        format!("{}|{}", key.to_lowercase(), name.to_lowercase())
    }

    impl Fake {
        pub fn set(&self, key: &str, name: &str, v: u32) {
            self.values.borrow_mut().insert(vid(key, name), (4, v.to_le_bytes().to_vec()));
        }
        pub fn get(&self, key: &str, name: &str) -> Option<u32> {
            self.values.borrow().get(&vid(key, name)).map(|(_, d)| u32::from_le_bytes([d[0], d[1], d[2], d[3]]))
        }
        pub fn app(&self, name: &str) {
            let a = Appx { name: name.into(), full_name: format!("{name}_1.0_x64"), family: format!("{name}_8wekyb3d8bbwe"), location: None };
            self.apps.borrow_mut().insert(name.into(), a);
        }
    }

    impl Host for Fake {
        fn read(&self, probe: &Probe) -> Saved {
            match probe {
                Probe::Reg { key, name } => match self.values.borrow().get(&vid(key, name)) {
                    Some((kind, data)) => Saved::Value { kind: *kind, data: hex(data) },
                    None => Saved::Absent { created: None },
                },
                Probe::Task { path } => Saved::Task { enabled: self.tasks.borrow().get(path).copied() },
                Probe::PwrActive => Saved::Active { guid: self.active_plan.borrow().clone() },
                _ => Saved::Unknown,
            }
        }
        fn restore(&self, probe: &Probe, saved: &Saved) -> Result<(), String> {
            match (probe, saved) {
                (Probe::Reg { key, name }, Saved::Value { kind, data }) => {
                    self.values.borrow_mut().insert(vid(key, name), (*kind, crate::backup::unhex(data)));
                }
                (Probe::Reg { key, name }, Saved::Absent { .. }) => {
                    self.values.borrow_mut().remove(&vid(key, name));
                }
                (Probe::Task { path }, Saved::Task { enabled: Some(on) }) => {
                    self.tasks.borrow_mut().insert(path.clone(), *on);
                }
                (Probe::PwrActive, Saved::Active { guid }) => *self.active_plan.borrow_mut() = guid.clone(),
                _ => {}
            }
            Ok(())
        }
        fn write_reg(&self, key: &str, name: &str, kind: u32, data: &[u8]) -> Result<(), String> {
            if self.refuse.borrow().iter().any(|k| k.eq_ignore_ascii_case(key)) {
                return Err("access denied".into());
            }
            *self.writes.borrow_mut() += 1;
            self.values.borrow_mut().insert(vid(key, name), (kind, data.to_vec()));
            Ok(())
        }
        fn set_task(&self, path: &str, enabled: bool) -> Result<(), String> {
            self.tasks.borrow_mut().insert(path.into(), enabled);
            Ok(())
        }
        fn set_service(&self, name: &str, start: Start) -> Result<(), String> {
            self.set(&service_key(name), "Start", start.value());
            Ok(())
        }
        fn appx_find(&self, name: &str) -> Option<Appx> {
            self.apps.borrow().get(name).cloned()
        }
        fn appx_remove(&self, app: &Appx) -> Result<(), String> {
            self.apps.borrow_mut().remove(&app.name);
            Ok(())
        }
        fn appx_restore(&self, app: &Appx) -> Result<(), String> {
            self.apps.borrow_mut().insert(app.name.clone(), app.clone());
            Ok(())
        }
        fn native_apply(&self, what: Native) -> Result<serde_json::Value, String> {
            let before = self.natives.borrow().get(&what).cloned().unwrap_or_else(|| "windows".into());
            self.natives.borrow_mut().insert(what, "rago".into());
            if what == Native::Powerplan {
                *self.active_plan.borrow_mut() = "rago".into();
            }
            Ok(serde_json::json!({ "before": before }))
        }
        fn native_revert(&self, what: Native, saved: &serde_json::Value) -> Result<(), String> {
            if self.natives.borrow().get(&what).map(String::as_str) == Some("rago") {
                self.natives.borrow_mut().insert(what, saved["before"].as_str().unwrap().into());
            }
            Ok(())
        }
        fn native_in_place(&self, what: Native, _saved: &serde_json::Value) -> bool {
            self.natives.borrow().get(&what).map(String::as_str) == Some("rago")
        }
        fn refresh(&self, _what: Refresh) {}
    }

    pub struct NoSave;
    impl Save for NoSave {
        fn ledger(&self, _ledger: &Ledger) {}
        fn state(&self, _state: &OsState) {}
    }
}

#[cfg(test)]
mod tests {
    use super::fake::{Fake, NoSave};
    use super::*;
    use crate::os::catalog::{self, RegKind};

    fn tweak(id: &str, actions: Vec<Action>) -> Tweak {
        Tweak {
            id: id.into(),
            category: "privacy".into(),
            profiles: vec![],
            reboot: catalog::Reboot::None,
            refresh: vec![],
            min_build: None,
            actions,
        }
    }

    fn dword(key: &str, name: &str, v: u32) -> Action {
        Action::Reg { key: key.into(), name: name.into(), kind: RegKind::Dword, value: v.into() }
    }

    const K: &str = r"HKCU\Software\Rago\Test";

    #[test]
    fn apply_then_revert_puts_back_the_original_or_its_absence() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.set(K, "A", 7);
        let t = tweak("x", vec![dword(K, "A", 0), dword(K, "B", 1)]);
        let out = apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        assert!(out.ok() && out.changed == 2, "{out:?}");
        assert_eq!((host.get(K, "A"), host.get(K, "B")), (Some(0), Some(1)));
        assert!(status(&host, &l, &s, &t).applied && status(&host, &l, &s, &t).in_place);
        let out = revert(&host, &NoSave, &mut l, &mut s, &t);
        assert!(out.ok(), "{out:?}");
        assert_eq!((host.get(K, "A"), host.get(K, "B")), (Some(7), None));
        assert!(l.tweaks.is_empty() && l.saved.is_empty());
    }

    #[test]
    fn applying_twice_keeps_the_original_and_writes_nothing() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.set(K, "A", 7);
        let t = tweak("x", vec![dword(K, "A", 0)]);
        apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        let writes = *host.writes.borrow();
        let out = apply(&host, &NoSave, &mut l, &mut s, &t, 2, false);
        assert_eq!((out.changed, *host.writes.borrow()), (0, writes));
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert_eq!(host.get(K, "A"), Some(7));
    }

    #[test]
    fn a_value_shared_with_a_classic_tweak_waits_for_the_last_one() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.set(K, "A", 7);
        // réglage classique de l'app appliqué avant, sur la même valeur
        l.record_before(Probe::Reg { key: K.into(), name: "A".into() }, host.read(&Probe::Reg { key: K.into(), name: "A".into() }));
        l.set_applied("win_x", None, true, true, vec![Probe::Reg { key: K.into(), name: "A".into() }.id()], 0);
        host.set(K, "A", 0);
        let t = tweak("x", vec![dword(K, "A", 0)]);
        apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        revert(&host, &NoSave, &mut l, &mut s, &t);
        // toujours tenue par le réglage classique
        assert_eq!(host.get(K, "A"), Some(0));
        for e in l.release("win_x") {
            host.restore(&e.probe, &e.before).unwrap();
        }
        assert_eq!(host.get(K, "A"), Some(7));
    }

    #[test]
    fn missing_services_and_tasks_are_skipped() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.set(&service_key("MapsBroker"), "Start", 2);
        host.tasks.borrow_mut().insert(r"\Microsoft\Windows\Maps\MapsUpdateTask".into(), true);
        let t = tweak(
            "services.maps",
            vec![
                Action::Service { name: "MapsBroker".into(), start: Start::Disabled },
                Action::Service { name: "Fax".into(), start: Start::Disabled },
                Action::Task { path: r"\Microsoft\Windows\Maps\MapsUpdateTask".into(), enabled: false },
                Action::Task { path: r"\Microsoft\Windows\Maps\Gone".into(), enabled: false },
            ],
        );
        let out = apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        assert_eq!((out.changed, out.skipped), (2, 2), "{out:?}");
        assert!(host.get(&service_key("Fax"), "Start").is_none());
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert_eq!(host.get(&service_key("MapsBroker"), "Start"), Some(2));
        assert_eq!(host.tasks.borrow()[r"\Microsoft\Windows\Maps\MapsUpdateTask"], true);
    }

    #[test]
    fn store_apps_come_back_and_absent_ones_are_skipped() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.app("Microsoft.BingNews");
        let t = tweak("apps", vec![Action::Appx { name: "Microsoft.BingNews".into() }, Action::Appx { name: "Microsoft.People".into() }]);
        let out = apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        assert_eq!((out.changed, out.skipped), (1, 1));
        assert!(host.appx_find("Microsoft.BingNews").is_none() && s.appx.contains_key("Microsoft.BingNews"));
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert!(host.appx_find("Microsoft.BingNews").is_some() && s.appx.is_empty());
    }

    #[test]
    fn natives_keep_the_first_state_and_respect_a_later_choice() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.natives.borrow_mut().insert(Native::Wallpaper, "mine".into());
        let t = tweak("brand.wallpaper", vec![Action::Native { what: Native::Wallpaper }]);
        apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        // le joueur change son fond : la dérive ne le remplace qu'avec « Réappliquer »
        host.natives.borrow_mut().insert(Native::Wallpaper, "holiday".into());
        assert!(!status(&host, &l, &s, &t).in_place);
        apply(&host, &NoSave, &mut l, &mut s, &t, 2, false);
        assert_eq!(host.natives.borrow()[&Native::Wallpaper], "holiday");
        apply(&host, &NoSave, &mut l, &mut s, &t, 3, true);
        assert_eq!(host.natives.borrow()[&Native::Wallpaper], "rago");
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert_eq!(host.natives.borrow()[&Native::Wallpaper], "mine");
    }

    #[test]
    fn power_plan_keeps_the_original_active_plan() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        *host.active_plan.borrow_mut() = "balanced".into();
        let t = tweak("perf.powerplan", vec![Action::Native { what: Native::Powerplan }]);
        apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        assert_eq!(*host.active_plan.borrow(), "rago");
        assert!(l.has(&Probe::PwrActive.id()));
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert_eq!(*host.active_plan.borrow(), "balanced");
    }

    #[test]
    fn a_refused_write_is_reported_and_stays_revertible() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        host.refuse.borrow_mut().push(K.into());
        let t = tweak("x", vec![dword(K, "A", 0), dword(r"HKCU\Other", "B", 1)]);
        let out = apply(&host, &NoSave, &mut l, &mut s, &t, 1, false);
        assert_eq!(out.errors.len(), 1);
        assert!(!l.tweaks[&ledger_id("x")].ok);
        revert(&host, &NoSave, &mut l, &mut s, &t);
        assert_eq!(host.get(r"HKCU\Other", "B"), None);
    }

    #[test]
    fn whole_catalog_round_trips() {
        let (host, mut l, mut s) = (Fake::default(), Ledger::default(), OsState::default());
        for name in ["Microsoft.BingNews", "Microsoft.Copilot", "Clipchamp.Clipchamp"] {
            host.app(name);
        }
        host.set(r"HKCU\Control Panel\Accessibility\StickyKeys", "Flags", 510);
        let snapshot = host.values.borrow().clone();
        let c = catalog::get();
        for t in &c.tweaks {
            let out = apply(&host, &NoSave, &mut l, &mut s, t, 1, false);
            assert!(out.ok(), "{} : {out:?}", t.id);
            assert!(status(&host, &l, &s, t).in_place, "{} pas en place", t.id);
        }
        for t in c.tweaks.iter().rev() {
            assert!(revert(&host, &NoSave, &mut l, &mut s, t).ok(), "{}", t.id);
        }
        assert_eq!(*host.values.borrow(), snapshot);
        assert!(l.tweaks.is_empty() && l.saved.is_empty() && s.appx.is_empty() && s.natives.is_empty());
        assert_eq!(host.apps.borrow().len(), 3);
    }
}
