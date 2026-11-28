//! Réparations faites à chaque lancement de l'app, sans rien demander au joueur : ce qu'une version précédente a laissé
//! sur le PC et qui peut le faire planter ou fausser l'annulation.
//!
//! RAG-67 (2026-10-13) : jusqu'à 1.1.9, « Power optimization », « Disable timer coalescing », « Advanced hitreg suite »,
//! « Disable Power Throttling » et les packs graphiques (NVIDIA, AMD, GPU général, AMD avancé) mettaient
//! `CoalescingTimerInterval` à 0 dans les clés de `HKLM\SYSTEM\CurrentControlSet\Control`. Cette valeur n'est pas
//! documentée par Microsoft ; le noyau la lit au démarrage et divise par elle : à 0, écran bleu 0x7E (exception
//! c0000094, division par zéro) quelques minutes après le démarrage (Windows 11 24H2), même après avoir décoché les
//! réglages Advanced, puisque des réglages Safe l'écrivaient aussi. Au lancement, l'app supprime la valeur là où elle
//! vaut 0 : Windows reprend sa valeur interne au prochain démarrage complet, « Redémarrer » ou le redémarrage après un
//! écran bleu. Avec le démarrage rapide de Windows (actif par défaut), « Arrêter » met le noyau en veille prolongée et
//! ne relit pas la valeur : le PC peut planter une fois de plus. L'interface demande donc, une fois, de redémarrer
//! (`take_repair_notice`, lib.rs). Une valeur différente de 0 n'est pas touchée.
//!
//! Priorité des jeux (2026-11-13, `lower_game_priority`) : les « Haute » que Rago avait écrites passent à « Supérieure
//! à la normale ».
//! L'app tourne en administrateur (app.manifest) : elle peut écrire dans HKLM sans rien demander.

use std::collections::HashSet;
use std::io::Write;
use std::path::Path;

use crate::backup::{Ledger, Probe, Saved, Sys};

pub const TIMER_VALUE: &str = "CoalescingTimerInterval";
/// Les huit clés où les scripts jusqu'à 1.1.9 écrivaient la valeur.
pub const TIMER_KEYS: [&str; 8] = [
    r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Executive",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Power\ModernSleep",
    r"HKLM\SYSTEM\CurrentControlSet\Control\Power",
    r"HKLM\SYSTEM\CurrentControlSet\Control",
];

pub fn timer_probes() -> Vec<Probe> {
    TIMER_KEYS.iter().map(|k| Probe::Reg { key: k.to_string(), name: TIMER_VALUE.into() }).collect()
}

/// Nombre entier qui vaut 0 (REG_DWORD, REG_DWORD_BIG_ENDIAN ou REG_QWORD) : la valeur qui fait planter.
pub fn is_zero(s: &Saved) -> bool {
    matches!(s, Saved::Value { kind: 4 | 5 | 11, data } if !data.is_empty() && data.bytes().all(|b| b == b'0'))
}

/// Supprime celles des valeurs `probes` qui valent 0, puis met le registre des réglages d'accord (`forget_zero`).
/// Renvoie les valeurs supprimées, et si le registre des réglages a changé.
pub fn remove_zero_values(sys: &Sys, ledger: &mut Ledger, probes: &[Probe]) -> (Vec<String>, bool) {
    let mut removed = Vec::new();
    for p in probes {
        if is_zero(&sys.read(p)) {
            let _ = sys.restore(p, &Saved::Absent { created: None });
            if let (true, Probe::Reg { key, name }) = (is_zero(&sys.read(p)), p) {
                // clé que l'app n'ouvre pas en accès complet : reg.exe, comme les anciens scripts qui l'ont écrite
                let _ = crate::shell::hidden("reg.exe")
                    .args(["delete", key, "/v", name, "/f"])
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .status();
            }
            if !is_zero(&sys.read(p)) {
                if let Probe::Reg { key, name } = p {
                    removed.push(format!("{key}\\{name}"));
                }
            }
        }
    }
    let changed = forget_zero(ledger, probes, &|p| sys.read(p));
    (removed, changed)
}

/// Le registre des réglages ne doit jamais remettre ces valeurs à 0 en annulant un réglage : un état d'avant à 0 (PC
/// passé avant par l'ancien .bat ou un autre optimiseur) devient « absente », la valeur de Windows. La valeur posée par
/// Rago (`after`) suit l'état actuel, sinon le réglage afficherait « Changé par Windows ».
pub fn forget_zero(ledger: &mut Ledger, probes: &[Probe], now: &dyn Fn(&Probe) -> Saved) -> bool {
    let ids: HashSet<String> = probes.iter().map(Probe::id).collect();
    let mut changed = false;
    for (_, e) in ledger.saved.iter_mut().filter(|(id, _)| ids.contains(id.as_str())) {
        if is_zero(&e.before) {
            e.before = Saved::Absent { created: None };
            changed = true;
        }
        if e.after.as_ref().is_some_and(is_zero) {
            match now(&e.probe) {
                // encore à 0 (suppression refusée) : on réessaiera au prochain lancement
                c if is_zero(&c) => {}
                // illisible : plus de comparaison pour cette valeur
                Saved::Unknown => {
                    e.after = None;
                    changed = true;
                }
                c => {
                    e.after = Some(c);
                    changed = true;
                }
            }
        }
    }
    changed
}

/// RAG-68 (2026-10-13) : jusqu'à 1.1.9, le relevé d'« Advanced hitreg suite » s'arrêtait sur un bloc vide avant sa
/// première ligne. Le réglage était marqué sauvegardé sans rien de relevé : le décocher ne remettait aucune de ses
/// valeurs. Sans relevé, il repasse au retour par les valeurs de Windows, comme un réglage appliqué avant 1.1.6.
/// Appliqué avec le relevé réparé, il a des éléments relevés et n'est pas touché.
pub fn hitreg_suite_without_backup(ledger: &mut Ledger) -> bool {
    match ledger.tweaks.get_mut("hitreg_suite") {
        Some(a) if a.backup && a.probes.is_empty() => {
            a.backup = false;
            true
        }
        _ => false,
    }
}

/// Réglage retiré « Disable timer coalescing » : il ne posait que `CoalescingTimerInterval` à 0 dans les huit clés.
pub const POW_TIMER: &str = "pow_timer";

/// M2 (revue du 2026-10-13) : une fois les huit valeurs réparées (absentes, ou non nulles), « Disable timer coalescing »
/// n'a plus rien d'appliqué sur ce PC. Il quitte le registre des réglages : plus de carte « Réglages retirés encore
/// appliqués » ni de « Remettre comme avant » qui supprimerait des valeurs déjà parties et proposerait un redémarrage
/// inutile. Les éléments qu'un autre réglage encore appliqué tient (pow_main…) restent gardés (`Ledger::release`). Une
/// valeur encore à 0 (suppression refusée) ou illisible : il reste, on réessaie au lancement suivant. Ce qu'on perd :
/// une valeur d'avant non nulle posée à la main avant Rago (1500…), qui reste absente, c'est-à-dire la valeur de Windows.
/// Renvoie true s'il a été oublié.
pub fn forget_pow_timer(ledger: &mut Ledger, now: &dyn Fn(&Probe) -> Saved) -> bool {
    if !ledger.tweaks.contains_key(POW_TIMER) {
        return false;
    }
    let repaired = timer_probes().iter().all(|p| match now(p) {
        Saved::Unknown => false,
        s => !is_zero(&s),
    });
    if repaired {
        ledger.release(POW_TIMER);
    }
    repaired
}

// ------------------------------------------------------------------ priorité des jeux (2026-11-13)

/// Streams Discord qui saccadent et PC qui rame (signalé le 2026-11-13) : « Advanced per-game priority » (pri_game, et
/// les presets par jeu qui l'appliquent) et l'option de priorité du Packet Optimizer pour Minecraft mettaient le jeu en
/// priorité « Haute » (3) dans `Image File Execution Options\<exe>\PerfOptions\CpuPriorityClass`, que Windows lit à
/// chaque lancement du jeu. En « Haute », le jeu passe avant Discord (capture et encodage du stream) et les autres
/// programmes dès que le processeur est plein. Les deux écrivent maintenant « Supérieure à la normale » (6), choix de
/// Sofiene. Au lancement, l'app passe à 6 les 3 qu'elle a elle-même écrits ; un 3 d'avant Rago (choix du joueur, autre
/// optimiseur) ou mis depuis par quelqu'un d'autre n'est pas touché. Un pri_game appliqué avant 1.1.6 (sans relevé)
/// n'est pas repris : le réappliquer suffit.
pub const PRIORITY_VALUE: &str = "CpuPriorityClass";
pub const HIGH: u32 = 3;
pub const ABOVE_NORMAL: u32 = 6;
pub const PRI_GAME: &str = "pri_game";
pub const IFEO: &str = r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options";
/// Exes du Packet Optimizer (`$Games` de netopt/common.ps1).
pub const NETOPT_GAMES: [&str; 3] = ["javaw.exe", "java.exe", "Minecraft.Windows.exe"];

pub fn priority_probe(exe: &str) -> Probe {
    Probe::Reg { key: format!(r"{IFEO}\{exe}\PerfOptions"), name: PRIORITY_VALUE.into() }
}

fn dword_value(v: u32) -> Saved {
    Saved::Value { kind: 4, data: crate::backup::hex(&v.to_le_bytes()) }
}

fn is_high(s: &Saved) -> bool {
    crate::backup::dword(s) == Some(HIGH)
}

/// Exe (en minuscules) d'une valeur `CpuPriorityClass` des PerfOptions d'IFEO ; None pour toute autre valeur.
pub fn priority_exe(p: &Probe) -> Option<String> {
    let Probe::Reg { key, name } = p else { return None };
    if !name.eq_ignore_ascii_case(PRIORITY_VALUE) {
        return None;
    }
    let key = key.to_lowercase();
    let exe = key.strip_prefix(&format!("{}\\", IFEO.to_lowercase()))?.strip_suffix("\\perfoptions")?;
    (!exe.is_empty() && !exe.contains('\\')).then(|| exe.to_string())
}

/// Ligne `reg` de la sauvegarde du Packet Optimizer (snapshot.json) pour la priorité de cet exe. Le moteur y écrit le
/// chemin PowerShell (`HKLM:\SOFTWARE\…`), le nom, `E` (la valeur existait) et `V` (la valeur, en texte).
fn snap_entry<'a>(snap: &'a mut serde_json::Value, exe: &str) -> Option<&'a mut serde_json::Map<String, serde_json::Value>> {
    let want = priority_probe(exe).id();
    snap.get_mut("reg")?.as_array_mut()?.iter_mut().filter_map(|r| r.as_object_mut()).find(|r| {
        match (r.get("P").and_then(|v| v.as_str()), r.get("N").and_then(|v| v.as_str())) {
            (Some(key), Some(name)) => Probe::Reg { key: key.replacen(":\\", "\\", 1), name: name.into() }.id() == want,
            _ => false,
        }
    })
}

/// La sauvegarde du Packet Optimizer avait 3 pour cet exe : Some(true) ; autre chose ou absente : Some(false) ; pas
/// dans la sauvegarde : None.
fn snap_high(snap: &mut serde_json::Value, exe: &str) -> Option<bool> {
    let r = snap_entry(snap, exe)?;
    let existed = r.get("E").and_then(|v| v.as_bool()).unwrap_or(false);
    let v = match r.get("V") {
        Some(serde_json::Value::String(s)) => s.trim().to_string(),
        Some(serde_json::Value::Number(n)) => n.to_string(),
        _ => String::new(),
    };
    Some(existed && v == HIGH.to_string())
}

/// Ce que `lower_game_priority` a fait.
#[derive(Debug, Default, PartialEq)]
pub struct Lowered {
    /// valeurs passées de 3 à 6 dans le registre
    pub reg: Vec<String>,
    /// le registre des réglages a changé (valeur posée par Rago, ou valeur d'avant)
    pub ledger: bool,
    /// la sauvegarde du Packet Optimizer a changé : à réécrire
    pub snapshot: bool,
    /// une valeur n'a pas pu être écrite : on réessaie au prochain lancement
    pub failed: bool,
}

/// Passe à 6 les priorités « Haute » posées par Rago : celles de pri_game (sa valeur posée est 3, ou inconnue pour un
/// réglage appliqué avant le suivi des valeurs posées) et, si `netopt_high` (Packet Optimizer appliqué avec l'option
/// de priorité avant le 2026-11-13, `netopt::wrote_high`), celles du Packet Optimizer. Avec la sauvegarde du Packet
/// Optimizer (`snapshot`), les deux retours arrière sont mis d'accord quand les deux sont appliqués sur Minecraft :
/// - 3 dans la sauvegarde mais pas avant pri_game : c'est pri_game qui l'avait écrit, appliqué en premier. La remise du
///   Packet Optimizer (ou une application sans l'option) rendra 6, la nouvelle valeur de pri_game, et plus 3 ;
/// - 3 avant pri_game mais pas dans la sauvegarde : c'est le Packet Optimizer, appliqué en premier. Décocher pri_game
///   rendra 6, la nouvelle valeur du Packet Optimizer.
///
/// Un 3 présent avant les deux reste le choix du joueur : remis tel quel au retour arrière.
pub fn lower_game_priority(
    ledger: &mut Ledger,
    netopt_high: bool,
    mut snapshot: Option<&mut serde_json::Value>,
    now: &dyn Fn(&Probe) -> Saved,
    write: &dyn Fn(&Probe, &Saved) -> bool,
) -> Lowered {
    let mut out = Lowered::default();
    let above = dword_value(ABOVE_NORMAL);
    let held: HashSet<String> = ledger.tweaks.get(PRI_GAME).map(|a| a.probes.iter().cloned().collect()).unwrap_or_default();
    let mut targets: Vec<Probe> = ledger
        .saved
        .iter()
        .filter(|(id, e)| held.contains(id) && priority_exe(&e.probe).is_some() && e.after.as_ref().map_or(true, is_high))
        .map(|(_, e)| e.probe.clone())
        .collect();
    if netopt_high {
        for p in NETOPT_GAMES.map(priority_probe) {
            if !targets.iter().any(|t| t.id() == p.id()) {
                targets.push(p);
            }
        }
    }
    for p in &targets {
        if is_high(&now(p)) {
            if !(write(p, &above) && crate::backup::dword(&now(p)) == Some(ABOVE_NORMAL)) {
                out.failed = true;
                continue;
            }
            if let Probe::Reg { key, name } = p {
                out.reg.push(format!("{key}\\{name}"));
            }
        }
        // la valeur posée par Rago suit l'état actuel, sinon pri_game afficherait « Changé par Windows »
        if crate::backup::dword(&now(p)) == Some(ABOVE_NORMAL) {
            let id = p.id();
            if let Some((_, e)) = ledger.saved.iter_mut().find(|(i, _)| *i == id && held.contains(i)) {
                if e.after.as_ref().map_or(true, is_high) {
                    e.after = Some(above.clone());
                    out.ledger = true;
                }
            }
        }
    }
    if let Some(snap) = snapshot.as_deref_mut() {
        let netopt: HashSet<String> = NETOPT_GAMES.iter().map(|e| e.to_lowercase()).collect();
        for (_, e) in ledger.saved.iter_mut().filter(|(id, _)| held.contains(id)) {
            let Some(exe) = priority_exe(&e.probe).filter(|x| netopt.contains(x)) else { continue };
            match snap_high(snap, &exe) {
                Some(true) if !is_high(&e.before) => {
                    if let Some(r) = snap_entry(snap, &exe) {
                        r.insert("V".into(), serde_json::Value::String(ABOVE_NORMAL.to_string()));
                        out.snapshot = true;
                    }
                }
                Some(false) if netopt_high && is_high(&e.before) => {
                    e.before = above.clone();
                    out.ledger = true;
                }
                _ => {}
            }
        }
    }
    out
}

/// snapshot.json du moteur, et s'il commence par un BOM : Windows PowerShell l'écrit en UTF-8 avec BOM, et lit en
/// ANSI un fichier sans BOM (les noms de cartes réseau accentués seraient abîmés).
fn read_snapshot(path: &Path) -> Option<(serde_json::Value, bool)> {
    let bytes = std::fs::read(path).ok()?;
    let (bom, body) = match bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        Some(body) => (true, body),
        None => (false, &bytes[..]),
    };
    Some((serde_json::from_slice(body).ok()?, bom))
}

/// Réécrit la sauvegarde d'un coup (fichier à côté puis renommé) : coupée en route, l'ancienne reste entière.
fn write_snapshot(path: &Path, v: &serde_json::Value, bom: bool) -> bool {
    let Ok(json) = serde_json::to_vec_pretty(v) else { return false };
    let mut bytes = if bom { vec![0xEF, 0xBB, 0xBF] } else { Vec::new() };
    bytes.extend(json);
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, bytes).is_ok() && std::fs::rename(&tmp, path).is_ok()
}

/// `lower_game_priority` sur ce PC. La sauvegarde du Packet Optimizer est réécrite si elle change ; son application
/// est marquée « Supérieure à la normale » quand tout est passé, pour ne plus y revenir (un 3 que le joueur mettrait
/// ensuite lui-même reste à 3).
fn game_priority_at_startup(sys: &Sys, ledger: &mut Ledger, data_dir: &Path) -> Lowered {
    let netopt_high = crate::netopt::wrote_high(data_dir);
    let snap_path = crate::netopt::snapshot_path(data_dir);
    let mut snapshot = read_snapshot(&snap_path);
    let out = lower_game_priority(
        ledger,
        netopt_high,
        snapshot.as_mut().map(|(v, _)| v),
        &|p| sys.read(p),
        &|p, s| sys.restore(p, s).is_ok(),
    );
    let mut ok = !out.failed;
    if let (true, Some((v, bom))) = (out.snapshot, &snapshot) {
        ok &= write_snapshot(&snap_path, v, *bom);
    }
    if netopt_high && ok {
        crate::netopt::set_above_normal(data_dir);
    }
    out
}

/// Au lancement de l'app : les réparations ci-dessus, le registre des réglages enregistré s'il a changé, et une ligne
/// dans logs\repairs.log pour chaque valeur supprimée ou changée (le support peut la lire). Renvoie les valeurs à 0
/// supprimées (l'interface demande alors de redémarrer).
pub fn at_startup(sys: &Sys, ledger: &mut Ledger, data_dir: &Path) -> Vec<String> {
    let logs_dir = data_dir.join("logs");
    let (removed, mut changed) = remove_zero_values(sys, ledger, &timer_probes());
    changed |= hitreg_suite_without_backup(ledger);
    let forgot = forget_pow_timer(ledger, &|p| sys.read(p));
    changed |= forgot;
    let prio = game_priority_at_startup(sys, ledger, data_dir);
    changed |= prio.ledger;
    if changed {
        ledger.save();
    }
    if !removed.is_empty() || forgot || !prio.reg.is_empty() || prio.snapshot {
        let _ = std::fs::create_dir_all(&logs_dir);
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(logs_dir.join("repairs.log")) {
            let ts = crate::history::now_ms();
            for r in &removed {
                let _ = writeln!(f, "{ts} removed {r} (0: blue screen 0x7E after startup, RAG-67)");
            }
            if forgot {
                let _ = writeln!(f, "{ts} {POW_TIMER} (retired) no longer applied: its only values are gone");
            }
            for r in &prio.reg {
                let _ = writeln!(f, "{ts} {r}: High (3) -> Above normal (6), the game no longer starves Discord and the stream");
            }
            if prio.snapshot {
                let _ = writeln!(f, "{ts} Packet Optimizer backup: Minecraft priority 3 -> 6 (written by Advanced per-game priority)");
            }
        }
    }
    removed
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::backup::SavedEntry;

    fn zero() -> Saved {
        Saved::Value { kind: 4, data: "00000000".into() }
    }

    #[test]
    fn zero_is_only_an_integer_zero() {
        assert!(is_zero(&zero()));
        assert!(is_zero(&Saved::Value { kind: 11, data: "0000000000000000".into() }));
        assert!(!is_zero(&Saved::Value { kind: 4, data: "dc050000".into() }), "1500");
        assert!(!is_zero(&Saved::Value { kind: 1, data: "3000".into() }), "texte « 0 »");
        assert!(!is_zero(&Saved::Absent { created: None }));
        assert!(!is_zero(&Saved::Unknown));
    }

    #[test]
    fn the_eight_keys_of_the_old_scripts() {
        let ids: HashSet<String> = timer_probes().iter().map(Probe::id).collect();
        assert_eq!(ids.len(), 8);
        // écrites « Kernel » ou « kernel », « HKEY_LOCAL_MACHINE\SYSTEM » ou « HKLM\System » : même élément pour le
        // registre des réglages
        for (key, name) in [
            (r"HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel", "CoalescingTimerInterval"),
            (r"HKLM\System\CurrentControlSet\Control\Power\ModernSleep", "coalescingtimerinterval"),
            (r"HKLM\System\CurrentControlSet\Control", "CoalescingTimerInterval"),
        ] {
            let p = Probe::Reg { key: crate::backup::normalize_key(key).unwrap(), name: name.into() };
            assert!(ids.contains(&p.id()), "{key}");
        }
    }

    fn entry(probe: Probe, before: Saved, after: Option<Saved>) -> (String, SavedEntry) {
        (probe.id(), SavedEntry { probe, before, after })
    }

    #[test]
    fn ledger_never_puts_the_zero_back() {
        let probes = timer_probes();
        let other = Probe::Reg { key: r"HKLM\SOFTWARE\Test".into(), name: "A".into() };
        let mut l = Ledger::default();
        // relevé avant Rago : déjà 0 (ancien .bat) ; posé par Rago : 0
        l.saved.push(entry(probes[0].clone(), zero(), Some(zero())));
        // relevé avant Rago : absente ; posé par Rago : 0
        l.saved.push(entry(probes[6].clone(), Saved::Absent { created: Some(r"HKLM\X".into()) }, Some(zero())));
        // une autre valeur à 0 n'est pas concernée
        l.saved.push(entry(other.clone(), zero(), Some(zero())));
        l.set_applied("pow_main", None, true, true, vec![probes[0].id(), probes[6].id(), other.id()], 1);
        assert!(forget_zero(&mut l, &probes, &|_| Saved::Absent { created: None }));
        assert_eq!(l.saved[0].1.before, Saved::Absent { created: None });
        assert_eq!(l.saved[0].1.after, Some(Saved::Absent { created: None }));
        assert_eq!(l.saved[1].1.before, Saved::Absent { created: Some(r"HKLM\X".into()) }, "état d'avant gardé");
        assert_eq!(l.saved[2].1.before, zero());
        assert!(!forget_zero(&mut l, &probes, &|_| Saved::Absent { created: None }), "une seule fois");
        // plus de « Changé par Windows » pour ces valeurs
        let views = l.views(&|p| if p.id() == other.id() { zero() } else { Saved::Absent { created: None } });
        assert!(!views[0].drift);
        // décocher remet « absente », jamais 0
        let back = l.release("pow_main");
        assert!(back.iter().filter(|e| e.probe != other).all(|e| !is_zero(&e.before)));
    }

    #[test]
    fn hitreg_suite_without_probes_goes_back_to_windows_values() {
        let mut l = Ledger::default();
        l.set_applied("hitreg_suite", Some("good".into()), true, true, vec![], 1);
        l.set_applied("ping_main", Some("config3".into()), true, true, vec![], 1);
        assert!(hitreg_suite_without_backup(&mut l));
        assert!(!l.tweaks["hitreg_suite"].backup);
        assert!(l.tweaks["ping_main"].backup, "relevé sans élément normal : seulement netsh et PowerShell");
        assert!(!hitreg_suite_without_backup(&mut l));
        // appliqué avec le relevé réparé
        let mut l = Ledger::default();
        l.set_applied("hitreg_suite", Some("good".into()), true, true, vec!["reg|hklm\\a|b".into()], 1);
        assert!(!hitreg_suite_without_backup(&mut l));
        assert!(l.tweaks["hitreg_suite"].backup);
    }

    #[test]
    fn pow_timer_is_forgotten_once_its_values_are_repaired() {
        // retiré du catalogue (carte « Réglages retirés »), plus jamais lancé
        assert_eq!(crate::catalog::name_of(POW_TIMER), "Disable timer coalescing");
        assert!(!crate::catalog::is_switch(POW_TIMER) && crate::catalog::script(POW_TIMER, None, None).is_none());
        let probes = timer_probes();
        let absent = || Saved::Absent { created: None };
        let mut l = Ledger::default();
        for p in &probes {
            l.saved.push(entry(p.clone(), absent(), Some(zero())));
        }
        l.set_applied(POW_TIMER, None, true, true, probes.iter().map(Probe::id).collect(), 1);
        // pow_main tient aussi la première valeur : elle reste gardée pour lui
        l.set_applied("pow_main", None, true, true, vec![probes[0].id()], 2);
        // une valeur encore à 0 (suppression refusée), ou illisible : il reste appliqué
        let one_zero = |p: &Probe| if p.id() == probes[3].id() { zero() } else { absent() };
        assert!(!forget_pow_timer(&mut l, &one_zero));
        assert!(!forget_pow_timer(&mut l, &|_| Saved::Unknown));
        assert!(l.tweaks.contains_key(POW_TIMER));
        // toutes absentes (ou une valeur non nulle posée par un autre) : il part, une seule fois
        let repaired = |p: &Probe| if p.id() == probes[5].id() { Saved::Value { kind: 4, data: "dc050000".into() } } else { absent() };
        assert!(forget_pow_timer(&mut l, &repaired));
        assert!(!l.tweaks.contains_key(POW_TIMER));
        assert!(l.tweaks.contains_key("pow_main"));
        assert!(l.has(&probes[0].id()), "élément tenu par pow_main : gardé");
        assert!(!l.has(&probes[1].id()), "élément de pow_timer seul : oublié");
        assert!(!forget_pow_timer(&mut l, &repaired), "une seule fois");
        // jamais appliqué : rien
        let mut empty = Ledger::default();
        assert!(!forget_pow_timer(&mut empty, &|_| absent()));
    }

    fn dw(v: u32) -> Saved {
        Saved::Value { kind: 4, data: crate::backup::hex(&v.to_le_bytes()) }
    }

    /// Registre de test : id de l'élément -> valeur.
    struct FakeReg(std::cell::RefCell<std::collections::HashMap<String, Saved>>);
    impl FakeReg {
        fn new(values: &[(&Probe, Saved)]) -> Self {
            FakeReg(std::cell::RefCell::new(values.iter().map(|(p, v)| (p.id(), v.clone())).collect()))
        }
        fn get(&self, p: &Probe) -> Saved {
            self.0.borrow().get(&p.id()).cloned().unwrap_or(Saved::Absent { created: None })
        }
        fn set(&self, p: &Probe, v: &Saved) -> bool {
            self.0.borrow_mut().insert(p.id(), v.clone());
            true
        }
    }

    #[test]
    fn priority_exe_reads_only_the_cpu_priority_of_a_game() {
        let p = |key: &str, name: &str| Probe::Reg { key: key.into(), name: name.into() };
        let ifeo = r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options";
        assert_eq!(priority_exe(&p(&format!(r"{ifeo}\javaw.exe\PerfOptions"), "CpuPriorityClass")).as_deref(), Some("javaw.exe"));
        assert_eq!(priority_exe(&priority_probe("League of Legends.exe")).as_deref(), Some("league of legends.exe"));
        assert_eq!(priority_exe(&p(&format!(r"{}\cs2.exe\perfoptions", ifeo.to_lowercase()), "cpupriorityclass")).as_deref(), Some("cs2.exe"));
        assert_eq!(priority_exe(&p(&format!(r"{ifeo}\javaw.exe\PerfOptions"), "IoPriority")), None);
        assert_eq!(priority_exe(&p(&format!(r"{ifeo}\javaw.exe"), "CpuPriorityClass")), None);
        assert_eq!(priority_exe(&p(r"HKLM\SOFTWARE\Test\javaw.exe\PerfOptions", "CpuPriorityClass")), None);
        assert_eq!(priority_exe(&Probe::RegKey { key: format!(r"{ifeo}\javaw.exe\PerfOptions") }), None);
    }

    /// 2026-11-13 : plus aucune priorité « Haute » écrite pour un jeu. Chaque exe dont pri_game écrit la priorité est
    /// dans son relevé (le registre des réglages le garde, la réparation le retrouve), et le Packet Optimizer écrit 6.
    #[test]
    fn games_are_set_to_above_normal_never_high() {
        let scripts: std::collections::HashMap<String, std::collections::HashMap<String, String>> =
            serde_json::from_str(include_str!("../scripts/scripts.json")).unwrap();
        let probes: std::collections::HashMap<String, std::collections::HashMap<String, String>> =
            serde_json::from_str(include_str!("../scripts/probes.json")).unwrap();
        assert_eq!(scripts[PRI_GAME].len(), 16);
        for (v, script) in &scripts[PRI_GAME] {
            let probed: HashSet<String> = crate::backup::parse_markers(&probes[PRI_GAME][v].replace("echo @@RAGO", "@@RAGO"))
                .iter()
                .filter_map(priority_exe)
                .collect();
            let mut n = 0;
            for l in script.lines().filter(|l| l.contains("Image File Execution Options") && l.contains("CpuPriorityClass")) {
                assert!(l.ends_with(r#"/t REG_DWORD /d "6" /f"#), "pri_game:{v} : {l}");
                let exe = l.split(r"Image File Execution Options\").nth(1).unwrap().split('\\').next().unwrap().to_lowercase();
                assert!(probed.contains(&exe), "pri_game:{v} : {exe} absent du relevé");
                n += 1;
            }
            assert!(n > 0, "pri_game:{v} n'écrit plus la priorité du jeu");
        }
        let apply = include_str!("../netopt/apply.ps1");
        assert!(apply.contains("RSet $k 'CpuPriorityClass' 6 'DWord'"));
        assert!(!apply.contains("'CpuPriorityClass' 3") && !apply.contains("PriorityClass = 'High'"));
        let common = include_str!("../netopt/common.ps1");
        let games = format!("$Games  = @('{}')", NETOPT_GAMES.join("', '"));
        assert!(common.contains(&games), "NETOPT_GAMES ne suit plus $Games de common.ps1");
    }

    #[test]
    fn high_priority_written_by_rago_goes_to_above_normal() {
        let [javaw, fortnite, cs2, apex] = ["javaw.exe", "FortniteClient-Win64-Shipping.exe", "cs2.exe", "r5apex.exe"].map(priority_probe);
        let io = Probe::Reg { key: format!(r"{IFEO}\javaw.exe\PerfOptions"), name: "IoPriority".into() };
        let csrss = priority_probe("csrss.exe");
        let absent = || Saved::Absent { created: None };
        let mut l = Ledger::default();
        // posé par Rago, toujours à 3
        l.saved.push(entry(javaw.clone(), absent(), Some(dw(3))));
        // changé depuis par le joueur (2, normale) : pas touché
        l.saved.push(entry(fortnite.clone(), absent(), Some(dw(3))));
        // déjà à 3 avant Rago : passe à 6 tant que pri_game est appliqué, le retour arrière rendra 3
        l.saved.push(entry(cs2.clone(), dw(3), Some(dw(3))));
        // relevé d'avant le suivi des valeurs posées
        l.saved.push(entry(apex.clone(), absent(), None));
        // priorité disque : pas concernée
        l.saved.push(entry(io.clone(), absent(), Some(dw(3))));
        // un autre réglage : pas concerné
        l.saved.push(entry(csrss.clone(), absent(), Some(dw(3))));
        l.set_applied(PRI_GAME, Some("minecraft".into()), true, true, [&javaw, &fortnite, &cs2, &apex, &io].map(Probe::id).to_vec(), 1);
        l.set_applied("in_advanced", None, true, true, vec![csrss.id()], 2);
        let reg = FakeReg::new(&[(&javaw, dw(3)), (&fortnite, dw(2)), (&cs2, dw(3)), (&apex, dw(3)), (&io, dw(3)), (&csrss, dw(3))]);
        let out = lower_game_priority(&mut l, false, None, &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert_eq!(out.reg.len(), 3, "{:?}", out.reg);
        assert!(out.ledger && !out.snapshot && !out.failed);
        for p in [&javaw, &cs2, &apex] {
            assert_eq!(reg.get(p), dw(6));
        }
        assert_eq!(reg.get(&fortnite), dw(2));
        assert_eq!(reg.get(&io), dw(3));
        assert_eq!(reg.get(&csrss), dw(3));
        let after = |p: &Probe| l.saved.iter().find(|(id, _)| *id == p.id()).unwrap().1.clone();
        assert_eq!(after(&javaw).after, Some(dw(6)), "plus de « Changé par Windows »");
        assert_eq!(after(&apex).after, Some(dw(6)));
        assert_eq!(after(&fortnite).after, Some(dw(3)));
        assert_eq!(after(&cs2).before, dw(3), "le choix du joueur revient au retour arrière");
        // une seule fois
        let again = lower_game_priority(&mut l, false, None, &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert_eq!(again, Lowered::default());
        // écriture refusée : on réessaie au lancement suivant
        let mut l2 = Ledger::default();
        l2.saved.push(entry(javaw.clone(), absent(), Some(dw(3))));
        l2.set_applied(PRI_GAME, Some("minecraft".into()), true, true, vec![javaw.id()], 1);
        let reg2 = FakeReg::new(&[(&javaw, dw(3))]);
        let out = lower_game_priority(&mut l2, false, None, &|p| reg2.get(p), &|_, _| false);
        assert!(out.failed && out.reg.is_empty() && !out.ledger);
        assert_eq!(l2.saved[0].1.after, Some(dw(3)));
    }

    #[test]
    fn packet_optimizer_high_priority_goes_to_above_normal() {
        let [javaw, java, bedrock] = NETOPT_GAMES.map(priority_probe);
        let reg = FakeReg::new(&[(&javaw, dw(3)), (&bedrock, dw(3))]);
        // appliqué par le nouveau moteur (ou sans l'option) : rien
        let out = lower_game_priority(&mut Ledger::default(), false, None, &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert_eq!(out, Lowered::default());
        assert_eq!(reg.get(&javaw), dw(3));
        let out = lower_game_priority(&mut Ledger::default(), true, None, &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert_eq!(out.reg.len(), 2);
        assert_eq!(reg.get(&javaw), dw(6));
        assert_eq!(reg.get(&bedrock), dw(6));
        assert_eq!(reg.get(&java), Saved::Absent { created: None }, "absente : rien d'écrit");
    }

    fn snapshot(e: bool, v: &str) -> serde_json::Value {
        serde_json::json!({ "version": 2, "date": "2026-11-01 20:00", "reg": [
            { "P": r"HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\QoS", "N": "Do not use NLA", "T": "String", "E": false, "V": "" },
            { "P": r"HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\javaw.exe\PerfOptions",
              "N": "CpuPriorityClass", "T": "DWord", "E": e, "V": v },
        ]})
    }

    fn snap_v(s: &serde_json::Value) -> &str {
        s["reg"][1]["V"].as_str().unwrap()
    }

    /// pri_game et le Packet Optimizer appliqués tous les deux sur Minecraft : chaque retour arrière rend 6, pas 3.
    #[test]
    fn both_minecraft_restores_give_back_above_normal() {
        let javaw = priority_probe("javaw.exe");
        let absent = || Saved::Absent { created: None };
        let ledger = |before: Saved| {
            let mut l = Ledger::default();
            l.saved.push(entry(javaw.clone(), before, Some(dw(3))));
            l.set_applied(PRI_GAME, Some("minecraft".into()), true, true, vec![javaw.id()], 1);
            l
        };
        // pri_game d'abord (3 sur une valeur absente), puis le Packet Optimizer, qui a gardé ce 3 comme valeur d'avant
        let (mut l, mut snap) = (ledger(absent()), snapshot(true, "3"));
        let reg = FakeReg::new(&[(&javaw, dw(3))]);
        let out = lower_game_priority(&mut l, true, Some(&mut snap), &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert!(out.snapshot && out.ledger);
        assert_eq!(snap_v(&snap), "6", "la remise du Packet Optimizer rend 6");
        assert_eq!(snap["reg"][0]["V"], "", "le reste de la sauvegarde ne bouge pas");
        assert_eq!(l.saved[0].1.before, absent());
        assert_eq!(reg.get(&javaw), dw(6));
        // le Packet Optimizer d'abord (valeur absente), puis pri_game, qui a gardé son 3 comme valeur d'avant
        let (mut l, mut snap) = (ledger(dw(3)), snapshot(false, ""));
        let reg = FakeReg::new(&[(&javaw, dw(3))]);
        let out = lower_game_priority(&mut l, true, Some(&mut snap), &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert!(!out.snapshot && out.ledger);
        assert_eq!(l.saved[0].1.before, dw(6), "décocher pri_game rend 6");
        assert_eq!(snap_v(&snap), "");
        // 3 avant les deux : le choix du joueur, rendu tel quel par les deux retours arrière
        let (mut l, mut snap) = (ledger(dw(3)), snapshot(true, "3"));
        let reg = FakeReg::new(&[(&javaw, dw(3))]);
        let out = lower_game_priority(&mut l, true, Some(&mut snap), &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert!(!out.snapshot);
        assert_eq!(l.saved[0].1.before, dw(3));
        assert_eq!(snap_v(&snap), "3");
        assert_eq!(reg.get(&javaw), dw(6), "le Packet Optimizer appliqué veut maintenant 6");
        // Packet Optimizer appliqué par le nouveau moteur : son 6 n'est pas en cause, le 3 d'avant pri_game reste
        let (mut l, mut snap) = (ledger(dw(3)), snapshot(false, ""));
        let reg = FakeReg::new(&[(&javaw, dw(3))]);
        lower_game_priority(&mut l, false, Some(&mut snap), &|p| reg.get(p), &|p, v| reg.set(p, v));
        assert_eq!(l.saved[0].1.before, dw(3));
    }

    #[test]
    fn snapshot_is_rewritten_with_its_bom() {
        let dir = std::env::temp_dir().join(format!("rago-repair-snap-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("snapshot.json");
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend(br#"{"version":2,"adv":[{"Desc":"Carte r\u00e9seau","Kw":"*EEE","Val":"0"}],"reg":[]}"#);
        std::fs::write(&path, &bytes).unwrap();
        let (v, bom) = read_snapshot(&path).unwrap();
        assert!(bom);
        assert!(write_snapshot(&path, &v, bom));
        let back = std::fs::read(&path).unwrap();
        assert!(back.starts_with(&[0xEF, 0xBB, 0xBF]), "Windows PowerShell relit les accents grâce au BOM");
        assert_eq!(read_snapshot(&path).unwrap().0, v);
        assert_eq!(v["adv"][0]["Desc"], "Carte réseau");
        assert!(!path.with_extension("json.tmp").exists());
        std::fs::write(&path, br#"{"reg":[]}"#).unwrap();
        assert!(!read_snapshot(&path).unwrap().1, "sans BOM");
        std::fs::write(&path, b"{pas du json").unwrap();
        assert!(read_snapshot(&path).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// Sur Windows (CI) : une vraie valeur à 0 est supprimée, une valeur à 1500 reste.
    #[cfg(windows)]
    #[test]
    fn zero_values_are_removed_from_the_registry() {
        let root = format!(r"HKCU\Software\RagoOptimizerTest{}", std::process::id());
        let probes = [
            Probe::Reg { key: format!(r"{root}\kernel"), name: TIMER_VALUE.into() },
            Probe::Reg { key: format!(r"{root}\Power"), name: TIMER_VALUE.into() },
        ];
        let sys = Sys::new(std::env::temp_dir());
        sys.restore(&probes[0], &zero()).unwrap();
        sys.restore(&probes[1], &Saved::Value { kind: 4, data: "dc050000".into() }).unwrap();
        let mut l = Ledger::default();
        let (removed, _) = remove_zero_values(&sys, &mut l, &probes);
        assert_eq!(removed.len(), 1, "{removed:?}");
        assert!(matches!(sys.read(&probes[0]), Saved::Absent { .. }));
        assert_eq!(sys.read(&probes[1]), Saved::Value { kind: 4, data: "dc050000".into() });
        for p in &probes {
            let _ = sys.restore(p, &Saved::Absent { created: Some(root.clone()) });
        }
        assert!(matches!(sys.read(&probes[1]), Saved::Absent { created: Some(_) }), "clé de test supprimée");
    }
}
