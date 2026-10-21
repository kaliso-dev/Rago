//! Rago OS : transforme le Windows installé et activé du joueur (registre, stratégies, services, tâches, applications
//! du Store, API de Windows et fenêtres de Rago Shell), sans jamais toucher aux fichiers de Windows ni à son activation,
//! et le remet exactement comme avant d'un clic (« Désactiver et tout restaurer »), à la fin de Premium et à la
//! désinstallation.
//!
//! - catalog.rs : réglages (src/data/os.json), profils, options
//! - engine.rs : application, remise et état de chaque réglage
//! - state.rs : choix du joueur, ce qui a été retiré ou posé hors d'applied.json, journal de l'opération en cours
//! - preflight.rs : vérifications avant l'activation
//! - win.rs : actions sur Windows
//! - resident.rs : Rago Shell (animation de démarrage, Dynamic Island)
//! - translucenttb.rs : barre des tâches transparente, en option

pub mod catalog;
pub mod engine;
pub mod preflight;
pub mod resident;
pub mod state;
pub mod translucenttb;
#[cfg(windows)]
pub mod win;

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use crate::backup::Ledger;
use catalog::Reboot;
use engine::{Host, Save};
use state::{Failure, Job, JobKind, OsState};

/// Envoi d'un événement à l'interface (None : remise sans fenêtre).
pub type Emit = Arc<dyn Fn(&str, serde_json::Value) + Send + Sync>;

pub struct Os {
    state: Mutex<OsState>,
    running: AtomicBool,
    cancel: AtomicBool,
    pub data_dir: PathBuf,
    pub resource_dir: PathBuf,
    meter: resident::Meter,
}

struct Disk;

impl Save for Disk {
    fn ledger(&self, ledger: &Ledger) {
        ledger.save();
    }
    fn state(&self, state: &OsState) {
        state.save();
    }
}

/// Hors de Windows (démo) et dans les tests, même sous Windows : rien n'est lu ni écrit sur le PC qui les lance.
struct Nothing;

impl Host for Nothing {
    fn read(&self, _probe: &crate::backup::Probe) -> crate::backup::Saved {
        crate::backup::Saved::Unknown
    }
    fn restore(&self, _p: &crate::backup::Probe, _s: &crate::backup::Saved) -> Result<(), String> {
        Ok(())
    }
    fn write_reg(&self, _k: &str, _n: &str, _t: u32, _d: &[u8]) -> Result<(), String> {
        Ok(())
    }
    fn set_task(&self, _p: &str, _e: bool) -> Result<(), String> {
        Ok(())
    }
    fn set_service(&self, _n: &str, _s: catalog::Start) -> Result<(), String> {
        Ok(())
    }
    fn appx_find(&self, _n: &str) -> Option<engine::Appx> {
        None
    }
    fn appx_remove(&self, _a: &engine::Appx) -> Result<(), String> {
        Ok(())
    }
    fn appx_restore(&self, _a: &engine::Appx) -> Result<(), String> {
        Ok(())
    }
    fn native_apply(&self, _w: catalog::Native) -> Result<serde_json::Value, String> {
        Ok(serde_json::Value::Null)
    }
    fn native_revert(&self, _w: catalog::Native, _s: &serde_json::Value) -> Result<(), String> {
        Ok(())
    }
    fn native_in_place(&self, _w: catalog::Native, _s: &serde_json::Value) -> bool {
        true
    }
    fn refresh(&self, _w: catalog::Refresh) {}
}

fn host(data_dir: &Path, resource_dir: &Path) -> Box<dyn Host> {
    #[cfg(windows)]
    if !cfg!(test) {
        return Box::new(win::WinHost::new(data_dir, resource_dir));
    }
    let _ = (data_dir, resource_dir);
    Box::new(Nothing)
}

fn restart_explorer() {
    #[cfg(windows)]
    if !cfg!(test) {
        win::restart_explorer();
    }
}

fn now_ms() -> u64 {
    crate::history::now_ms()
}

/// Le PC a redémarré depuis `marked` (ms) : son démarrage est plus récent, à quelques secondes près.
#[cfg(windows)]
fn booted_since(marked: u64) -> bool {
    let up = unsafe { windows_sys::Win32::System::SystemInformation::GetTickCount64() };
    now_ms().saturating_sub(up) > marked + 5_000
}

#[cfg(not(windows))]
fn booted_since(_marked: u64) -> bool {
    false
}

/// Ce que l'interface demande à l'activation (ou en changeant la sélection pendant que Rago OS est actif).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub profile: Option<String>,
    pub selection: Vec<String>,
    #[serde(default)]
    pub features: BTreeMap<String, bool>,
    /// le point de restauration a échoué et le joueur continue sans
    #[serde(default)]
    pub skip_restore_point: bool,
    /// réappliquer aussi ce que le joueur ou Windows a changé depuis (bouton d'une dérive)
    #[serde(default)]
    pub force: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TweakView {
    pub id: String,
    #[serde(flatten)]
    pub status: engine::Status,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobView {
    pub kind: JobKind,
    pub done: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub build: u32,
    pub active: bool,
    pub profile: Option<String>,
    pub selection: Vec<String>,
    pub features: BTreeMap<String, bool>,
    pub activated_at: Option<u64>,
    pub tweaks: Vec<TweakView>,
    /// appliqués mais plus en place (Windows Update, le joueur, une autre app)
    pub drift: Vec<String>,
    /// Windows a changé de build depuis l'activation
    pub windows_updated: bool,
    pub failed: Vec<Failure>,
    /// opération coupée (PC éteint, app fermée) : à reprendre ou à annuler
    pub interrupted: Option<JobView>,
    pub running: bool,
    pub restart_pending: bool,
    pub shell_installed: bool,
    pub translucenttb: TtbView,
    /// applications retirées que Windows n'a pas pu réinscrire : à réinstaller depuis le Store
    pub apps_to_reinstall: Vec<engine::Appx>,
    pub restore_point: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TtbView {
    pub installed: bool,
    pub applied: bool,
    /// coupé par Rago Shell après des redémarrages de l'Explorateur en boucle
    pub stopped_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct Progress<'a> {
    kind: &'a str,
    phase: &'a str,
    index: usize,
    total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<&'a str>,
    status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Done {
    pub kind: String,
    pub ok: usize,
    pub failed: usize,
    pub cancelled: bool,
    /// un redémarrage du PC finit l'opération
    pub restart: bool,
    pub restore_failed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn emit<S: Serialize>(e: Option<&Emit>, event: &str, payload: S) {
    if let (Some(e), Ok(v)) = (e, serde_json::to_value(payload)) {
        e(event, v);
    }
}

pub const FEATURES: [&str; 3] = ["boot", "island", "translucenttb"];

impl Os {
    pub fn new(data_dir: PathBuf, resource_dir: PathBuf) -> Self {
        let state = OsState::load(data_dir.join("os.json"));
        Os { state: Mutex::new(state), running: AtomicBool::new(false), cancel: AtomicBool::new(false), data_dir, resource_dir, meter: Default::default() }
    }

    fn host(&self) -> Box<dyn Host> {
        host(&self.data_dir, &self.resource_dir)
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::SeqCst);
    }

    pub fn usage(&self) -> resident::Usage {
        self.meter.sample()
    }

    /// Quelque chose de Rago OS reste sur ce PC (actif, ou opération coupée).
    pub fn needs_restore(&self, ledger: &Ledger) -> bool {
        let s = self.state.lock().unwrap();
        s.active || !s.is_clean(ledger)
    }

    pub fn overview(&self, ledger: &Mutex<Ledger>) -> Overview {
        let host = self.host();
        let facts_build = preflight::read(false).build;
        let c = catalog::get();
        // Rago Shell a coupé TranslucentTB (Explorateur en boucle) : ses réglages d'avant reviennent, option coupée
        let report = resident::report();
        if report.ttb_stopped.is_some() {
            let mut s = self.state.lock().unwrap();
            if let Some(saved) = s.translucenttb.take() {
                let _ = translucenttb::revert(&saved, None);
            }
            s.features.insert("translucenttb".into(), false);
            s.save();
        }
        {
            let mut s = self.state.lock().unwrap();
            if s.restart_pending && booted_since(s.restart_marked) {
                s.restart_pending = false;
                s.save();
            }
        }
        let s = self.state.lock().unwrap().clone();
        let l = ledger.lock().unwrap();
        let tweaks: Vec<TweakView> = c
            .tweaks
            .iter()
            .filter(|t| t.runs_on(facts_build) || l.tweaks.contains_key(&engine::ledger_id(&t.id)))
            .map(|t| TweakView { id: t.id.clone(), status: engine::status(host.as_ref(), &l, &s, t) })
            .collect();
        let drift = tweaks.iter().filter(|t| t.status.applied && !t.status.in_place).map(|t| t.id.clone()).collect();
        let features = FEATURES.iter().map(|f| (f.to_string(), s.feature(f))).collect();
        let interrupted = s.job.as_ref().filter(|_| !self.is_running()).map(|j| JobView {
            kind: j.kind,
            done: j.done.len(),
            total: j.apply.len() + j.revert.len(),
        });
        let apps_to_reinstall = if s.active { Vec::new() } else { s.appx.values().cloned().collect() };
        Overview {
            build: facts_build,
            active: s.active,
            profile: s.profile.clone(),
            selection: s.selection.clone(),
            features,
            activated_at: s.activated_at,
            tweaks,
            drift,
            windows_updated: s.active && s.build != 0 && facts_build != 0 && s.build != facts_build,
            failed: s.failed.clone(),
            interrupted,
            running: self.is_running(),
            restart_pending: s.restart_pending,
            shell_installed: resident::installed(&self.resource_dir),
            translucenttb: TtbView {
                installed: translucenttb::find().is_some(),
                applied: s.translucenttb.is_some(),
                stopped_at: report.ttb_stopped,
            },
            apps_to_reinstall,
            restore_point: s.restore_point,
        }
    }

    pub fn preflight(&self, selection: &[String], busy: bool) -> Vec<preflight::Check> {
        let f = preflight::read(busy || self.is_running());
        preflight::checks(&f, selection.iter().any(|id| id == "perf.powerplan"))
    }

    /// Lance l'activation (ou le changement de sélection) dans un thread. `ledger` : applied.json, partagé avec les
    /// réglages classiques de l'app.
    pub fn start_apply(self: &Arc<Self>, ledger: Arc<Mutex<Ledger>>, req: Request, emit_fn: Emit, legacy_busy: bool) -> Result<(), String> {
        let checks = self.preflight(&req.selection, legacy_busy);
        if preflight::blocked(&checks) {
            return Err(format!("preflight_blocked:{}", checks.iter().filter(|c| c.level == preflight::Level::Block).map(|c| c.id).collect::<Vec<_>>().join(",")));
        }
        if self.running.swap(true, Ordering::SeqCst) {
            return Err("os_running".into());
        }
        self.cancel.store(false, Ordering::SeqCst);
        let me = Arc::clone(self);
        std::thread::spawn(move || {
            let _one = crate::runner::exclusive();
            let done = me.apply_now(&ledger, &req, Some(&emit_fn));
            me.running.store(false, Ordering::SeqCst);
            emit(Some(&emit_fn), "os:done", done);
        });
        Ok(())
    }

    /// Lance « Désactiver et tout restaurer » dans un thread.
    pub fn start_restore(self: &Arc<Self>, ledger: Arc<Mutex<Ledger>>, emit_fn: Emit) -> Result<(), String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Err("os_running".into());
        }
        self.cancel.store(false, Ordering::SeqCst);
        let me = Arc::clone(self);
        std::thread::spawn(move || {
            let _one = crate::runner::exclusive();
            let done = me.restore_now(&ledger, Some(&emit_fn), &|| false);
            me.running.store(false, Ordering::SeqCst);
            emit(Some(&emit_fn), "os:done", done);
        });
        Ok(())
    }

    fn apply_now(&self, ledger: &Mutex<Ledger>, req: &Request, ev: Option<&Emit>) -> Done {
        let c = catalog::get();
        let build = preflight::read(false).build;
        let mut done = Done { kind: "apply".into(), ..Default::default() };
        let progress = |phase: &str, index: usize, total: usize, id: Option<&str>, status: &str, message: Option<String>| {
            emit(ev, "os:progress", Progress { kind: "apply", phase, index, total, id, status, message });
        };

        // point de restauration avant la toute première activation
        let first = self.state.lock().unwrap().restore_point.is_none();
        if first && !req.skip_restore_point {
            progress("restore_point", 0, 0, None, "running", None);
            match restore_point() {
                Ok(()) => {
                    let mut s = self.state.lock().unwrap();
                    s.restore_point = Some(now_ms());
                    s.save();
                }
                Err(e) => {
                    done.restore_failed = true;
                    done.error = Some(e);
                    return done;
                }
            }
        }

        let wanted: Vec<String> = c.tweaks.iter().filter(|t| req.selection.contains(&t.id) && t.runs_on(build)).map(|t| t.id.clone()).collect();
        let (revert_ids, apply_ids) = {
            let l = ledger.lock().unwrap();
            let mut applied: Vec<(&String, u64)> = l.tweaks.iter().filter(|(id, _)| engine::is_os(id)).map(|(id, a)| (id, a.ts)).collect();
            applied.sort_by(|a, b| b.1.cmp(&a.1));
            let revert: Vec<String> = applied
                .into_iter()
                .map(|(id, _)| id.trim_start_matches(engine::PREFIX).to_string())
                .filter(|id| !wanted.contains(id))
                .collect();
            (revert, wanted.clone())
        };
        {
            let mut s = self.state.lock().unwrap();
            // opération coupée reprise : ce qui était fait reste fait
            let resumed = s.job.as_ref().filter(|j| j.kind == JobKind::Apply).map(|j| j.done.clone()).unwrap_or_default();
            s.job = Some(Job { kind: JobKind::Apply, apply: apply_ids.clone(), revert: revert_ids.clone(), done: resumed, started: now_ms() });
            s.profile = req.profile.clone();
            s.selection = req.selection.clone();
            for (k, v) in &req.features {
                s.features.insert(k.clone(), *v);
            }
            s.failed.clear();
            s.save();
        }

        let host = self.host();
        let total = revert_ids.len() + apply_ids.len();
        let (mut explorer, mut restart) = (false, false);
        let steps: Vec<(bool, String)> = revert_ids.iter().map(|id| (false, id.clone())).chain(apply_ids.iter().map(|id| (true, id.clone()))).collect();
        for (i, (apply, id)) in steps.iter().enumerate() {
            if self.cancel.load(Ordering::SeqCst) {
                done.cancelled = true;
                return done;
            }
            if self.state.lock().unwrap().job.as_ref().is_some_and(|j| j.done.contains(id)) {
                continue;
            }
            let Some(t) = c.tweak(id) else { continue };
            progress("tweak", i, total, Some(id), "running", None);
            let out = {
                let mut l = ledger.lock().unwrap();
                let mut s = self.state.lock().unwrap();
                if *apply {
                    engine::apply(host.as_ref(), &Disk, &mut l, &mut s, t, now_ms(), req.force)
                } else {
                    engine::revert(host.as_ref(), &Disk, &mut l, &mut s, t)
                }
            };
            if out.changed > 0 {
                explorer |= t.reboot == Reboot::Explorer;
                restart |= t.reboot == Reboot::Restart;
            }
            let mut s = self.state.lock().unwrap();
            if out.ok() {
                done.ok += 1;
                progress("tweak", i, total, Some(id), if out.changed == 0 && out.skipped > 0 { "skipped" } else { "ok" }, None);
            } else {
                done.failed += 1;
                let error = out.errors.join(" ; ");
                progress("tweak", i, total, Some(id), "failed", Some(error.clone()));
                s.failed.push(Failure { id: id.clone(), error });
            }
            if let Some(j) = s.job.as_mut() {
                j.done.push(id.clone());
            }
            s.save();
        }

        progress("features", total, total, None, "running", None);
        let welcome = {
            let mut s = self.state.lock().unwrap();
            s.active = true;
            s.activated_at.get_or_insert(now_ms());
            s.build = build;
            if restart {
                s.restart_pending = true;
                s.restart_marked = now_ms();
            }
            s.job = None;
            s.save();
            s.feature("boot")
        };
        if let Err(e) = self.sync_features() {
            let mut s = self.state.lock().unwrap();
            s.failed.push(Failure { id: "features".into(), error: e });
            s.save();
        }
        if explorer {
            progress("explorer", total, total, None, "running", None);
            restart_explorer();
        }
        // le moment « nouvel OS » : l'animation de Rago OS dévoile le bureau transformé
        if welcome {
            let _ = resident::send(&self.resource_dir, &["--welcome"]);
        }
        done.restart = restart;
        done
    }

    /// Remet tout comme avant Rago OS. `stop_when` : vrai quand la remise n'a plus lieu d'être (licence revenue),
    /// lu entre deux réglages.
    pub fn restore_now(&self, ledger: &Mutex<Ledger>, ev: Option<&Emit>, stop_when: &dyn Fn() -> bool) -> Done {
        let c = catalog::get();
        let mut done = Done { kind: "restore".into(), ..Default::default() };
        let progress = |phase: &str, index: usize, total: usize, id: Option<&str>, status: &str, message: Option<String>| {
            emit(ev, "os:progress", Progress { kind: "restore", phase, index, total, id, status, message });
        };

        // Rago Shell et la barre transparente d'abord : plus rien de Rago OS à l'écran
        progress("features", 0, 0, None, "running", None);
        resident::stop();
        let _ = resident::set_autostart(&self.resource_dir, false, &self.data_dir.join("run"));
        {
            let mut s = self.state.lock().unwrap();
            if let Some(saved) = s.translucenttb.clone() {
                if translucenttb::revert(&saved, translucenttb::find().as_ref()).is_ok() {
                    s.translucenttb = None;
                }
            }
            s.save();
        }

        let ids: Vec<String> = {
            let l = ledger.lock().unwrap();
            let s = self.state.lock().unwrap();
            let mut applied: Vec<(String, u64)> = l
                .tweaks
                .iter()
                .filter(|(id, _)| engine::is_os(id))
                .map(|(id, a)| (id.trim_start_matches(engine::PREFIX).to_string(), a.ts))
                .collect();
            applied.sort_by(|a, b| b.1.cmp(&a.1));
            let mut ids: Vec<String> = applied.into_iter().map(|(id, _)| id).collect();
            // applications ou actions natives notées sans leur réglage (activation coupée au mauvais moment)
            for t in &c.tweaks {
                let holds = t.natives().any(|n| s.natives.contains_key(&n))
                    || t.actions.iter().any(|a| matches!(a, catalog::Action::Appx { name } if s.appx.contains_key(name)));
                if holds && !ids.contains(&t.id) {
                    ids.push(t.id.clone());
                }
            }
            ids
        };
        {
            let mut s = self.state.lock().unwrap();
            let resumed = s.job.as_ref().filter(|j| j.kind == JobKind::Restore).map(|j| j.done.clone()).unwrap_or_default();
            s.job = Some(Job { kind: JobKind::Restore, apply: vec![], revert: ids.clone(), done: resumed, started: now_ms() });
            s.failed.clear();
            s.save();
        }
        let host = self.host();
        let (mut explorer, mut restart) = (false, false);
        let total = ids.len();
        for (i, id) in ids.iter().enumerate() {
            if stop_when() {
                done.cancelled = true;
                return done;
            }
            let Some(t) = c.tweak(id) else {
                // réglage retiré du catalogue depuis : on oublie sa place dans applied.json, ses valeurs reviennent
                let mut l = ledger.lock().unwrap();
                for e in l.release(&engine::ledger_id(id)) {
                    let _ = host.restore(&e.probe, &e.before);
                }
                l.save();
                continue;
            };
            progress("tweak", i, total, Some(id), "running", None);
            let out = {
                let mut l = ledger.lock().unwrap();
                let mut s = self.state.lock().unwrap();
                engine::revert(host.as_ref(), &Disk, &mut l, &mut s, t)
            };
            if out.changed > 0 {
                explorer |= t.reboot == Reboot::Explorer;
                restart |= t.reboot == Reboot::Restart;
            }
            let mut s = self.state.lock().unwrap();
            if out.ok() {
                done.ok += 1;
                progress("tweak", i, total, Some(id), "ok", None);
            } else {
                done.failed += 1;
                let error = out.errors.join(" ; ");
                progress("tweak", i, total, Some(id), "failed", Some(error.clone()));
                s.failed.push(Failure { id: id.clone(), error });
            }
            if let Some(j) = s.job.as_mut() {
                j.done.push(id.clone());
            }
            s.save();
        }
        {
            let mut s = self.state.lock().unwrap();
            s.active = false;
            s.activated_at = None;
            s.restart_pending = restart;
            if restart {
                s.restart_marked = now_ms();
            }
            s.job = None;
            s.save();
        }
        resident::clear_report();
        if explorer {
            progress("explorer", total, total, None, "running", None);
            restart_explorer();
        }
        done.restart = restart;
        done
    }

    /// Met les options (animation, Dynamic Island, barre transparente) en accord avec l'état : Rago Shell configuré et
    /// lancé à l'ouverture de session s'il a quelque chose à faire, TranslucentTB réglé ou remis.
    pub fn sync_features(&self) -> Result<(), String> {
        let (active, boot, island, ttb, ttb_saved) = {
            let s = self.state.lock().unwrap();
            (s.active, s.feature("boot"), s.feature("island"), s.feature("translucenttb"), s.translucenttb.clone())
        };
        let mut errors = Vec::new();
        let shell = active && (boot || island);
        let lang = crate::background::Background::load(&self.data_dir, false).prefs().lang;
        if let Err(e) = resident::write_config(&resident::Config { boot: active && boot, island: active && island, ttb_guard: active && ttb, lang }) {
            errors.push(e);
        }
        if resident::installed(&self.resource_dir) {
            if let Err(e) = resident::set_autostart(&self.resource_dir, shell, &self.data_dir.join("run")) {
                errors.push(e);
            }
            if shell {
                // déjà lancé : il relit ses options
                let _ = resident::send(&self.resource_dir, &["--reload"]);
            } else {
                resident::stop();
            }
        }
        match (active && ttb, ttb_saved) {
            (true, None) => match translucenttb::find() {
                Some(pkg) => match translucenttb::apply(&pkg) {
                    Ok(saved) => {
                        resident::clear_report();
                        let mut s = self.state.lock().unwrap();
                        s.translucenttb = Some(saved);
                        s.save();
                    }
                    Err(e) => errors.push(e),
                },
                None => errors.push("translucenttb_missing".into()),
            },
            (false, Some(saved)) => {
                translucenttb::revert(&saved, translucenttb::find().as_ref())?;
                let mut s = self.state.lock().unwrap();
                s.translucenttb = None;
                s.save();
            }
            _ => {}
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors.join(" ; "))
        }
    }

    /// Option changée par le joueur. Rago OS inactif : seulement retenue pour la prochaine activation.
    pub fn set_feature(&self, id: &str, on: bool) -> Result<(), String> {
        if !FEATURES.contains(&id) {
            return Err("unknown feature".into());
        }
        let active = {
            let mut s = self.state.lock().unwrap();
            s.features.insert(id.into(), on);
            s.save();
            s.active
        };
        if !active {
            return Ok(());
        }
        let r = self.sync_features();
        if id == "translucenttb" && on && r.as_ref().is_err_and(|e| e.contains("translucenttb_missing")) {
            // pas installé : l'option reste coupée, l'interface propose le Store
            let mut s = self.state.lock().unwrap();
            s.features.insert(id.into(), false);
            s.save();
            return Err("translucenttb_missing".into());
        }
        r
    }

    /// Opération coupée abandonnée par le joueur : son journal est oublié (ce qui a été appliqué reste noté et se remet
    /// avec « Tout restaurer »).
    pub fn forget_job(&self) {
        let mut s = self.state.lock().unwrap();
        if s.job.as_ref().is_some_and(|j| j.kind == JobKind::Apply) {
            s.job = None;
            s.active = true;
            s.save();
        }
    }

    pub fn clear_restart(&self) {
        let mut s = self.state.lock().unwrap();
        s.restart_pending = false;
        s.save();
    }

    /// Au lancement de l'app : une remise coupée (PC éteint pendant « Tout restaurer ») reprend d'elle-même.
    pub fn interrupted_restore(&self) -> bool {
        self.state.lock().unwrap().job.as_ref().is_some_and(|j| j.kind == JobKind::Restore)
    }
}

/// Point de restauration système avant la première activation (même script que les réglages classiques).
fn restore_point() -> Result<(), String> {
    #[cfg(windows)]
    if !cfg!(test) {
        let out = crate::shell::hidden("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", crate::runner::RESTORE_POINT_PS])
            .output()
            .map_err(|e| e.to_string())?;
        return if out.status.success() {
            Ok(())
        } else {
            Err(crate::backup::decode_text(&out.stderr).trim().lines().last().unwrap_or("restore point failed").to_string())
        };
    }
    Ok(())
}

/// Désinstallation : Rago OS est remis avant les réglages classiques, sans fenêtre.
pub fn uninstall(data_dir: &Path, resource_dir: &Path, ledger: &Mutex<Ledger>) {
    let os = Os::new(data_dir.to_path_buf(), resource_dir.to_path_buf());
    if os.needs_restore(&ledger.lock().unwrap()) {
        os.restore_now(ledger, None, &|| false);
    }
    resident::stop();
    let _ = resident::set_autostart(resource_dir, false, &data_dir.join("run"));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rago-os-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn activation_then_restore_leaves_nothing_behind() {
        let dir = temp("cycle");
        let os = Os::new(dir.clone(), dir.join("resources"));
        let ledger = Mutex::new(Ledger::default());
        let selection = catalog::get().profile("balanced", preflight::read(false).build);
        let req = Request { profile: Some("balanced".into()), selection: selection.clone(), features: BTreeMap::new(), skip_restore_point: false, force: false };
        let d = os.apply_now(&ledger, &req, None);
        assert_eq!((d.ok, d.failed), (selection.len(), 0), "{d:?}");
        let ov = os.overview(&ledger);
        assert!(ov.active && ov.interrupted.is_none() && ov.restore_point.is_some());
        assert_eq!(ov.tweaks.iter().filter(|t| t.status.applied).count(), selection.len());
        // changer de profil retire ce qui n'en fait plus partie
        let fewer: Vec<String> = selection.iter().take(5).cloned().collect();
        os.apply_now(&ledger, &Request { selection: fewer.clone(), ..req.clone() }, None);
        assert_eq!(ledger.lock().unwrap().tweaks.len(), 5);
        let d = os.restore_now(&ledger, None, &|| false);
        assert_eq!(d.failed, 0);
        assert!(!os.needs_restore(&ledger.lock().unwrap()));
        assert!(ledger.lock().unwrap().tweaks.is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_cut_restore_resumes_and_classic_tweaks_stay() {
        let dir = temp("resume");
        let os = Os::new(dir.clone(), dir.join("resources"));
        let ledger = Mutex::new(Ledger::default());
        ledger.lock().unwrap().set_applied("net_nagle", None, true, true, vec![], 1);
        let req = Request { profile: None, selection: vec!["privacy.telemetry".into(), "ads.tips".into()], features: BTreeMap::new(), skip_restore_point: true, force: false };
        os.apply_now(&ledger, &req, None);
        // licence revenue au milieu : la remise s'arrête, et reprend plus tard là où elle était
        let d = os.restore_now(&ledger, None, &|| true);
        assert!(d.cancelled && os.interrupted_restore());
        os.restore_now(&ledger, None, &|| false);
        let l = ledger.lock().unwrap();
        assert_eq!(l.tweaks.keys().collect::<Vec<_>>(), vec!["net_nagle"]);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
