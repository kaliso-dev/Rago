//! Réparations faites à chaque lancement de l'app, sans rien demander au joueur : ce qu'une version précédente a laissé
//! sur le PC et qui peut le faire planter ou fausser l'annulation.
//!
//! RAG-67 (2026-10-13) : jusqu'à 1.1.9, « Power optimization », « Disable timer coalescing », « Advanced hitreg suite »,
//! « Disable Power Throttling » et les packs graphiques (NVIDIA, AMD, GPU général, AMD avancé) mettaient
//! `CoalescingTimerInterval` à 0 dans les clés de `HKLM\SYSTEM\CurrentControlSet\Control`. Cette valeur n'est pas
//! documentée par Microsoft ; le noyau la lit au démarrage et divise par elle : à 0, écran bleu 0x7E (exception
//! c0000094, division par zéro) quelques minutes après le démarrage (Windows 11 24H2), même après avoir décoché les
//! réglages Advanced, puisque des réglages Safe l'écrivaient aussi. Au lancement, l'app supprime la valeur là où elle
//! vaut 0 : Windows reprend sa valeur interne au démarrage suivant. Une valeur différente de 0 n'est pas touchée.
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

/// Au lancement de l'app : les réparations ci-dessus, le registre des réglages enregistré s'il a changé, et une ligne
/// dans logs\repairs.log pour chaque valeur supprimée (le support peut la lire).
pub fn at_startup(sys: &Sys, ledger: &mut Ledger, logs_dir: &Path) -> Vec<String> {
    let (removed, mut changed) = remove_zero_values(sys, ledger, &timer_probes());
    changed |= hitreg_suite_without_backup(ledger);
    if changed {
        ledger.save();
    }
    if !removed.is_empty() {
        let _ = std::fs::create_dir_all(logs_dir);
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(logs_dir.join("repairs.log")) {
            let ts = crate::history::now_ms();
            for r in &removed {
                let _ = writeln!(f, "{ts} removed {r} (0: blue screen 0x7E after startup, RAG-67)");
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
