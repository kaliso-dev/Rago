//! Usage du PC en direct pour le tableau de bord : mémoire vive, processeur et carte graphique, en %.
//!
//! Un fil mesure toutes les secondes tant que l'interface demande des valeurs, et s'arrête seul
//! quelques secondes après la dernière demande (fenêtre réduite, autre page) : rien ne tourne quand
//! personne ne regarde. Une mesure que Windows ne fournit pas vaut `None`, jamais un faux 0 %.

use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

const PERIOD: Duration = Duration::from_secs(1);
/// sans demande depuis ce délai, le fil s'arrête
const IDLE: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveStats {
    /// false jusqu'à la première mesure : le processeur et la carte graphique se mesurent sur un intervalle
    pub ready: bool,
    /// pourcentages de 0 à 100 ; None quand la mesure est indisponible sur ce PC
    pub ram: Option<f32>,
    pub cpu: Option<f32>,
    pub gpu: Option<f32>,
    /// mémoire vive utilisée et totale, en octets (None si indisponible)
    pub ram_used: Option<u64>,
    pub ram_total: Option<u64>,
}

#[derive(Default)]
struct Shared {
    latest: LiveStats,
    last_poll: Option<Instant>,
    running: bool,
}

#[derive(Default)]
pub struct Sampler(Arc<Mutex<Shared>>);

fn lock(m: &Mutex<Shared>) -> MutexGuard<'_, Shared> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl Sampler {
    /// Dernière mesure ; relance le fil de mesure s'il s'était arrêté.
    pub fn latest(&self) -> LiveStats {
        let mut s = lock(&self.0);
        s.last_poll = Some(Instant::now());
        if !s.running {
            let shared = Arc::clone(&self.0);
            s.running = std::thread::Builder::new()
                .name("rago-stats".into())
                .spawn(move || sample_loop(&shared))
                .is_ok();
            if !s.running {
                return LiveStats { ready: true, ..Default::default() };
            }
        }
        s.latest
    }
}

fn sample_loop(shared: &Mutex<Shared>) {
    let mut probe = Probe::open();
    loop {
        std::thread::sleep(PERIOD);
        let stats = probe.sample();
        let mut s = lock(shared);
        if s.last_poll.map_or(true, |t| t.elapsed() > IDLE) {
            // la prochaine demande repartira d'une mesure neuve plutôt que d'afficher une vieille valeur
            s.latest = LiveStats::default();
            s.running = false;
            return;
        }
        s.latest = stats;
    }
}

struct Probe {
    sys: sysinfo::System,
    #[cfg(windows)]
    cpu: Option<pdh::Counter>,
    #[cfg(windows)]
    gpu: Option<pdh::Counter>,
}

impl Probe {
    fn open() -> Self {
        #[allow(unused_mut)]
        let mut sys = sysinfo::System::new();
        #[cfg(not(windows))]
        sys.refresh_cpu_usage();
        Self {
            sys,
            // compteurs de Windows en anglais (indépendants de la langue du système)
            #[cfg(windows)]
            cpu: pdh::Counter::open(r"\Processor Information(_Total)\% Processor Time")
                .or_else(|| pdh::Counter::open(r"\Processor(_Total)\% Processor Time")),
            #[cfg(windows)]
            gpu: pdh::Counter::open(r"\GPU Engine(*)\Utilization Percentage"),
        }
    }

    fn sample(&mut self) -> LiveStats {
        self.sys.refresh_memory();
        let total = self.sys.total_memory();
        let used = total.saturating_sub(self.sys.available_memory());
        let ram = if total > 0 { pct(used as f64 / total as f64 * 100.0) } else { None };
        let (ram_used, ram_total) = if ram.is_some() { (Some(used), Some(total)) } else { (None, None) };

        #[cfg(windows)]
        let (cpu, gpu) = (
            self.cpu.as_ref().and_then(|c| c.value()).and_then(pct),
            self.gpu
                .as_ref()
                .and_then(|c| c.values())
                .and_then(|v| busiest_engine(v.iter().map(|(n, x)| (n.as_str(), *x))))
                .and_then(pct),
        );
        #[cfg(not(windows))]
        let (cpu, gpu) = {
            self.sys.refresh_cpu_usage();
            let cpu = if self.sys.cpus().is_empty() { None } else { pct(self.sys.global_cpu_usage() as f64) };
            (cpu, None)
        };

        LiveStats { ready: true, ram, cpu, gpu, ram_used, ram_total }
    }
}

fn pct(v: f64) -> Option<f32> {
    v.is_finite().then(|| v.clamp(0.0, 100.0) as f32)
}

/// Charge du moteur de carte graphique le plus occupé, comme le Gestionnaire des tâches. Les instances
/// « pid_1234_luid_0x…_phys_0_eng_3_engtype_3D » se regroupent par moteur (tout ce qui suit le pid) :
/// la charge d'un moteur est la somme de ses processus. None sans aucune instance mesurée.
#[cfg_attr(not(windows), allow(dead_code))]
fn busiest_engine<'a>(items: impl IntoIterator<Item = (&'a str, f64)>) -> Option<f64> {
    let mut engines: HashMap<&str, f64> = HashMap::new();
    for (name, v) in items {
        if !v.is_finite() {
            continue;
        }
        let engine = name.find("luid_").map_or(name, |i| &name[i..]);
        *engines.entry(engine).or_default() += v;
    }
    engines.into_values().reduce(f64::max)
}

/// Compteurs de performance de Windows (PDH), une requête par compteur : un compteur absent
/// (carte graphique sans pilote WDDM 2, compteurs désactivés) ne bloque pas les autres.
#[cfg(windows)]
mod pdh {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::System::Performance::{
        PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterArrayW,
        PdhGetFormattedCounterValue, PdhOpenQueryW, PDH_CSTATUS_NEW_DATA, PDH_CSTATUS_VALID_DATA,
        PDH_FMT_COUNTERVALUE, PDH_FMT_COUNTERVALUE_ITEM_W, PDH_FMT_DOUBLE, PDH_HCOUNTER, PDH_HQUERY,
        PDH_MORE_DATA,
    };

    pub struct Counter {
        query: PDH_HQUERY,
        counter: PDH_HCOUNTER,
    }

    fn valid(status: u32) -> bool {
        status == PDH_CSTATUS_VALID_DATA || status == PDH_CSTATUS_NEW_DATA
    }

    impl Counter {
        pub fn open(path: &str) -> Option<Self> {
            let path: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
            let mut query: PDH_HQUERY = null_mut();
            let mut counter: PDH_HCOUNTER = null_mut();
            unsafe {
                if PdhOpenQueryW(null(), 0, &mut query) != 0 {
                    return None;
                }
                if PdhAddEnglishCounterW(query, path.as_ptr(), 0, &mut counter) != 0 {
                    PdhCloseQuery(query);
                    return None;
                }
                // premier relevé : un pourcentage se calcule entre deux relevés
                PdhCollectQueryData(query);
            }
            Some(Self { query, counter })
        }

        fn collect(&self) -> bool {
            unsafe { PdhCollectQueryData(self.query) == 0 }
        }

        /// Compteur à une seule instance (`_Total`).
        pub fn value(&self) -> Option<f64> {
            if !self.collect() {
                return None;
            }
            let mut v = PDH_FMT_COUNTERVALUE::default();
            unsafe {
                if PdhGetFormattedCounterValue(self.counter, PDH_FMT_DOUBLE, null_mut(), &mut v) != 0 || !valid(v.CStatus) {
                    return None;
                }
                Some(v.Anonymous.doubleValue)
            }
        }

        /// Compteur à instances (`*`) : nom et valeur de chaque instance mesurée.
        pub fn values(&self) -> Option<Vec<(String, f64)>> {
            if !self.collect() {
                return None;
            }
            // la liste des instances peut grandir entre la demande de taille et la lecture
            for _ in 0..3 {
                let (mut size, mut count) = (0u32, 0u32);
                let r = unsafe { PdhGetFormattedCounterArrayW(self.counter, PDH_FMT_DOUBLE, &mut size, &mut count, null_mut()) };
                if r == 0 {
                    return Some(Vec::new());
                }
                if r != PDH_MORE_DATA {
                    return None;
                }
                // tampon aligné sur 8 octets : il commence par les éléments (avec des f64), puis les noms
                let mut buf = vec![0u64; (size as usize).div_ceil(8)];
                let items = buf.as_mut_ptr() as *mut PDH_FMT_COUNTERVALUE_ITEM_W;
                let r = unsafe { PdhGetFormattedCounterArrayW(self.counter, PDH_FMT_DOUBLE, &mut size, &mut count, items) };
                if r == PDH_MORE_DATA {
                    continue;
                }
                if r != 0 {
                    return None;
                }
                let items = unsafe { std::slice::from_raw_parts(items, count as usize) };
                return Some(
                    items
                        .iter()
                        .filter(|i| valid(i.FmtValue.CStatus))
                        .map(|i| unsafe { (wide_to_string(i.szName), i.FmtValue.Anonymous.doubleValue) })
                        .collect(),
                );
            }
            None
        }
    }

    unsafe fn wide_to_string(p: *const u16) -> String {
        if p.is_null() {
            return String::new();
        }
        let mut len = 0;
        while *p.add(len) != 0 {
            len += 1;
        }
        String::from_utf16_lossy(std::slice::from_raw_parts(p, len))
    }

    impl Drop for Counter {
        fn drop(&mut self) {
            unsafe { PdhCloseQuery(self.query) };
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gpu_load_is_the_busiest_engine_summed_over_processes() {
        let items = [
            ("pid_100_luid_0x00000000_0x0000C8B5_phys_0_eng_0_engtype_3D", 30.0),
            ("pid_200_luid_0x00000000_0x0000C8B5_phys_0_eng_0_engtype_3D", 25.5),
            ("pid_100_luid_0x00000000_0x0000C8B5_phys_0_eng_3_engtype_VideoDecode", 40.0),
            ("pid_300_luid_0x00000000_0x0000D1A2_phys_0_eng_0_engtype_3D", 12.0),
            ("pid_300_luid_0x00000000_0x0000D1A2_phys_0_eng_1_engtype_Copy", f64::NAN),
        ];
        assert_eq!(busiest_engine(items), Some(55.5));
        assert_eq!(busiest_engine([("pid_1_luid_0x0_0x1_phys_0_eng_0_engtype_3D", 0.0)]), Some(0.0));
        // aucune instance : pas de faux 0 %
        assert_eq!(busiest_engine(std::iter::empty()), None);
    }

    #[test]
    fn percentages_are_clamped_and_never_invented() {
        assert_eq!(pct(104.2), Some(100.0));
        assert_eq!(pct(-0.3), Some(0.0));
        assert_eq!(pct(f64::NAN), None);
    }

    #[test]
    fn sampler_measures_ram_and_cpu() {
        let sampler = Sampler::default();
        assert!(!sampler.latest().ready, "pas de valeur avant la première mesure");
        let started = Instant::now();
        let stats = loop {
            let s = sampler.latest();
            if s.ready || started.elapsed() > Duration::from_secs(10) {
                break s;
            }
            std::thread::sleep(Duration::from_millis(100));
        };
        assert!(stats.ready);
        let ram = stats.ram.expect("RAM mesurée");
        assert!(ram > 0.0 && ram <= 100.0);
        let (used, total) = (stats.ram_used.unwrap(), stats.ram_total.unwrap());
        assert!(used > 0 && used <= total);
        let cpu = stats.cpu.expect("processeur mesuré");
        assert!((0.0..=100.0).contains(&cpu));
        if let Some(gpu) = stats.gpu {
            assert!((0.0..=100.0).contains(&gpu));
        }
    }

    #[cfg(windows)]
    #[test]
    fn gpu_counter_reads_when_windows_has_it() {
        // les machines de CI n'ont pas toujours de carte graphique : on vérifie la lecture quand il y en a une
        if let Some(c) = pdh::Counter::open(r"\GPU Engine(*)\Utilization Percentage") {
            std::thread::sleep(Duration::from_millis(500));
            if let Some(values) = c.values() {
                assert!(values.iter().all(|(_, v)| v.is_finite()));
            }
        }
    }
}
