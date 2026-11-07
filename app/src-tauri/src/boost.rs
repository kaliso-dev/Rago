//! Mode jeu total (Rago OS) : le temps d'une partie, les services Windows non essentiels qui tournent sont arrêtés,
//! puis relancés à la fin. Demandé par Rago OS au lancement d'un jeu (bridge.rs), et par lui seul.
//! - Seulement des services sans rôle pendant une partie : indexation, impression, télémétrie, rapports d'erreurs,
//!   préchargement, cartes, géolocalisation, partage des mises à jour… Jamais la sécurité (Defender, pare-feu, Windows
//!   Update), le réseau, le son, les périphériques, les anti-triches ni Xbox (sauvegardes des jeux du Store).
//! - On arrête un service, on ne change jamais son type de démarrage : Windows peut le relancer s'il en a besoin, et un
//!   redémarrage du PC remet tout comme avant quoi qu'il arrive.
//! - Les services arrêtés par Rago sont notés sur le disque (boost.json) avant d'être arrêtés : fin de partie, fin
//!   demandée par Rago OS, Rago OS fermé en pleine partie (l'app voit la partie finir) ou app relancée après un arrêt
//!   brutal, ils sont relancés. Un service déjà arrêté avant la partie reste arrêté.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// (nom du service, ce qu'il fait, en clair)
pub const SERVICES: &[(&str, &str)] = &[
    ("WSearch", "Indexation de la recherche"),
    ("Spooler", "Impression"),
    ("SysMain", "Préchargement des applis (SysMain)"),
    ("DiagTrack", "Télémétrie de Windows"),
    ("dmwappushservice", "Messages de télémétrie"),
    ("WerSvc", "Rapports d'erreurs"),
    ("DoSvc", "Partage des mises à jour avec d'autres PC"),
    ("MapsBroker", "Cartes hors connexion"),
    ("lfsvc", "Géolocalisation"),
    ("PcaSvc", "Assistant de compatibilité des programmes"),
    ("TrkWks", "Suivi des liens de fichiers"),
    ("WMPNetworkSvc", "Partage multimédia du Lecteur Windows"),
    ("Fax", "Télécopie"),
    ("RetailDemo", "Mode démo des magasins"),
    ("wisvc", "Programme Windows Insider"),
    ("DPS", "Diagnostics de performances"),
    ("WdiServiceHost", "Diagnostics (hôte du service)"),
    ("WdiSystemHost", "Diagnostics (hôte du système)"),
    ("edgeupdate", "Mises à jour de Microsoft Edge"),
    ("edgeupdatem", "Mises à jour de Microsoft Edge (2)"),
    ("gupdate", "Mises à jour de Google"),
    ("gupdatem", "Mises à jour de Google (2)"),
];

#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
struct Saved {
    /// services arrêtés par Rago pour la partie en cours, à relancer
    stopped: Vec<String>,
}

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub active: bool,
    /// services arrêtés pour la partie (nom affichable)
    pub stopped: Vec<String>,
}

pub struct Boost {
    path: PathBuf,
    saved: Mutex<Saved>,
}

impl Boost {
    /// Relance ce qu'une partie précédente a laissé arrêté (app fermée ou PC qui plante en pleine partie).
    pub fn new(data_dir: &Path) -> Self {
        let path = data_dir.join("boost.json");
        let saved: Saved = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        let b = Boost { path, saved: Mutex::new(saved) };
        if b.is_active() {
            b.off();
        }
        b
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Saved> {
        self.saved.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn save(&self, s: &Saved) {
        if s.stopped.is_empty() {
            let _ = std::fs::remove_file(&self.path);
        } else if let Ok(json) = serde_json::to_vec(s) {
            let _ = std::fs::write(&self.path, json);
        }
    }

    pub fn is_active(&self) -> bool {
        !self.lock().stopped.is_empty()
    }

    pub fn state(&self) -> State {
        let s = self.lock();
        State { active: !s.stopped.is_empty(), stopped: s.stopped.iter().map(|n| label(n).to_string()).collect() }
    }

    /// Arrête les services de la liste qui tournent ; une seconde demande pendant la partie ne fait rien de plus.
    pub fn on(&self) -> State {
        let mut s = self.lock();
        if s.stopped.is_empty() {
            let running: Vec<String> = SERVICES.iter().filter(|(n, _)| win::is_running(n)).map(|(n, _)| n.to_string()).collect();
            // noté avant d'arrêter : un arrêt brutal pendant la boucle laisse quand même de quoi tout relancer
            s.stopped = running.clone();
            self.save(&s);
            let stopped: Vec<String> = running.into_iter().filter(|n| win::stop(n)).collect();
            s.stopped = stopped;
            self.save(&s);
        }
        State { active: !s.stopped.is_empty(), stopped: s.stopped.iter().map(|n| label(n).to_string()).collect() }
    }

    /// Relance les services arrêtés pour la partie.
    pub fn off(&self) -> State {
        let mut s = self.lock();
        for n in std::mem::take(&mut s.stopped) {
            win::start(&n);
        }
        self.save(&s);
        State::default()
    }
}

fn label(name: &str) -> &str {
    SERVICES.iter().find(|(n, _)| *n == name).map(|(_, l)| *l).unwrap_or(name)
}

#[cfg(windows)]
mod win {
    use windows_sys::Win32::System::Services::*;

    struct Handle(SC_HANDLE);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe { CloseServiceHandle(self.0) };
        }
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn open(name: &str, access: u32) -> Option<(Handle, Handle)> {
        let scm = unsafe { OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT) };
        if scm.is_null() {
            return None;
        }
        let scm = Handle(scm);
        let svc = unsafe { OpenServiceW(scm.0, wide(name).as_ptr(), access) };
        if svc.is_null() {
            return None;
        }
        Some((scm, Handle(svc)))
    }

    fn current(svc: &Handle) -> Option<u32> {
        let mut st: SERVICE_STATUS = unsafe { std::mem::zeroed() };
        (unsafe { QueryServiceStatus(svc.0, &mut st) } != 0).then_some(st.dwCurrentState)
    }

    pub fn is_running(name: &str) -> bool {
        open(name, SERVICE_QUERY_STATUS).is_some_and(|(_, svc)| current(&svc) == Some(SERVICE_RUNNING))
    }

    /// Demande l'arrêt et attend au plus 3 s qu'il soit effectif.
    pub fn stop(name: &str) -> bool {
        let Some((_scm, svc)) = open(name, SERVICE_STOP | SERVICE_QUERY_STATUS) else {
            return false;
        };
        let mut st: SERVICE_STATUS = unsafe { std::mem::zeroed() };
        if unsafe { ControlService(svc.0, SERVICE_CONTROL_STOP, &mut st) } == 0 {
            return false;
        }
        for _ in 0..30 {
            if current(&svc) == Some(SERVICE_STOPPED) {
                return true;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        // toujours en cours d'arrêt : il s'arrêtera, on le relancera à la fin
        true
    }

    pub fn start(name: &str) {
        if let Some((_scm, svc)) = open(name, SERVICE_START | SERVICE_QUERY_STATUS) {
            if current(&svc) != Some(SERVICE_RUNNING) {
                unsafe { StartServiceW(svc.0, 0, std::ptr::null()) };
            }
        }
    }
}

#[cfg(not(windows))]
mod win {
    pub fn is_running(_: &str) -> bool {
        false
    }
    pub fn stop(_: &str) -> bool {
        false
    }
    pub fn start(_: &str) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jamais_de_service_de_securite_ni_de_reseau() {
        let forbidden = ["WinDefend", "mpssvc", "wuauserv", "BFE", "Dnscache", "Dhcp", "nsi", "Audiosrv", "AudioEndpointBuilder",
            "vgc", "vgk", "EasyAntiCheat", "BEService", "FACEIT", "XblAuthManager", "XblGameSave", "GamingServices", "BITS",
            "CryptSvc", "EventLog", "Schedule", "RpcSs", "hidserv", "TokenBroker", "WlanSvc"];
        for (n, _) in SERVICES {
            assert!(!forbidden.iter().any(|f| f.eq_ignore_ascii_case(n)), "{n} ne doit pas être arrêté");
        }
    }

    #[test]
    fn rien_a_relancer_sans_partie() {
        let dir = std::env::temp_dir().join(format!("rago-boost-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let b = Boost::new(&dir);
        assert!(!b.is_active());
        assert_eq!(b.off(), State::default());
        let _ = std::fs::remove_dir_all(dir);
    }
}
