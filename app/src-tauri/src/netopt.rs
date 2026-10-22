//! Network Optimizer : la page Optimiseur réseau, portée de network_optimizer.bat v2 (Sofiene, 2026-10-22).
//!
//! Aucun réglage ne raccourcit la route jusqu'au serveur : le ping ne baisse pas. Ce qui change, c'est la façon dont
//! Windows envoie, reçoit, confirme et renvoie les paquets (tampons de la carte réseau, reprise TCP après une perte,
//! délai des ACK, marquage QoS, économies d'énergie, trafic en fond) : moins d'à-coups au hitreg et au recul.
//!
//! Les curseurs de la page deviennent des valeurs exactes de Windows ici (`compute`, mêmes formules que le `:compute`
//! du .bat), puis le moteur PowerShell (netopt/*.ps1, chiffré dans l'exe comme les scripts) les écrit. Le moteur garde
//! les valeurs d'avant à la première application (snapshot.json) et sait les remettre à l'identique. Appliquer est
//! réservé à Premium (sa partie du moteur est dans les scripts Premium) ; remettre et tester restent gratuits.
//! La désinstallation et la fin de licence remettent les valeurs d'avant (`put_back`), comme les autres réglages.

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use crate::{catalog, shell};

/// Choix de la page (les O_* du .bat). Curseurs de 0 à 100.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Options {
    /// Smart Packets : marque QoS sur Minecraft, les gros téléchargeurs en arrière-plan
    pub smart: bool,
    /// 0 = latence la plus basse (tampons coupés), 100 = Windows
    pub latency: u32,
    /// 0 = Windows (stable), 100 = renvoi le plus rapide
    pub responsiveness: u32,
    /// 0 auto (d'après le type), 1 normal, 2 restricted, 3 highly restricted, 4 disabled, 5 experimental, 6 laisser
    pub tuning: u32,
    /// 1 fibre, 2 câble, 3 VDSL, 4 ADSL, 5 Wi-Fi, 6 4G/5G, 7 satellite
    pub line: u32,
    pub stable: bool,
    pub competitive: bool,
    /// 0 laisser, 1 automatique, 2 valeur
    pub mtu_mode: u32,
    pub mtu: u32,
    /// 0 = ACK immédiat, 100 = Windows
    pub delay: u32,
    /// force du marquage QoS : 0 aucun … 100 CS6
    pub priority: u32,
    /// 0 laisser, 1 CUBIC, 2 NewReno, 3 CTCP, 4 DCTCP, 5 BBR2
    pub congestion: u32,
    pub priority_mode: bool,
    /// couper les économies d'énergie de la carte réseau
    pub power_saving: bool,
    pub wifi: bool,
    pub bg_guard: bool,
    /// serveur de jeu des tests et du MTU automatique
    pub target: String,
    /// profil choisi (affichage)
    pub preset: String,
    pub expert: Expert,
}

/// Valeurs exactes (onglet Expert du .bat) : vides, elles suivent les curseurs.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Expert {
    pub min_rto: Option<u32>,
    pub initial_rto: Option<u32>,
    pub icw: Option<u32>,
    pub ack_frequency: Option<u32>,
    pub ack_timeout: Option<u32>,
    pub dscp: Option<u32>,
    pub timestamps: Option<bool>,
    pub ecn: Option<bool>,
    pub interrupt_moderation: Option<bool>,
}

impl Default for Options {
    /// Profil Équilibré, fibre (`:preset 3` du .bat)
    fn default() -> Self {
        Options {
            smart: true,
            latency: 50,
            responsiveness: 60,
            tuning: 0,
            line: 1,
            stable: true,
            competitive: false,
            mtu_mode: 1,
            mtu: 1500,
            delay: 30,
            priority: 60,
            congestion: 0,
            priority_mode: false,
            power_saving: true,
            wifi: false,
            bg_guard: false,
            target: "1.1.1.1".into(),
            preset: "balanced".into(),
            expert: Expert::default(),
        }
    }
}

/// Adresse de serveur acceptée (nom, IP, nom:port) : le moteur la reçoit par une variable d'environnement, jamais dans
/// le texte du script.
pub fn valid_target(t: &str) -> bool {
    let b = t.as_bytes();
    !b.is_empty() && b.len() <= 253 && b[0].is_ascii_alphanumeric() && b.iter().all(|c| c.is_ascii_alphanumeric() || b".:-".contains(c))
}

impl Options {
    /// Valeurs hors limites ramenées dans leurs bornes (`:sanitize` du .bat).
    pub fn sanitized(mut self) -> Self {
        self.latency = self.latency.min(100);
        self.responsiveness = self.responsiveness.min(100);
        self.tuning = self.tuning.min(6);
        self.line = self.line.clamp(1, 7);
        self.mtu_mode = self.mtu_mode.min(2);
        self.mtu = self.mtu.clamp(576, 1500);
        self.delay = self.delay.min(100);
        self.priority = self.priority.min(100);
        self.congestion = self.congestion.min(5);
        self.target = self.target.trim().to_string();
        if !valid_target(&self.target) {
            self.target = "1.1.1.1".into();
        }
        self.preset = self.preset.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '_').take(24).collect();
        let x = &mut self.expert;
        x.min_rto = x.min_rto.map(|v| v.clamp(20, 300));
        x.initial_rto = x.initial_rto.map(|v| v.clamp(300, 3000));
        x.icw = x.icw.map(|v| v.clamp(2, 64));
        x.ack_frequency = x.ack_frequency.map(|v| v.clamp(1, 255));
        x.ack_timeout = x.ack_timeout.map(|v| v.clamp(10, 600));
        x.dscp = x.dscp.map(|v| v.min(63));
        self
    }
}

/// Valeurs exactes écrites par le moteur (les C_* du .bat).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Values {
    /// limitation réseau multimédia coupée
    pub throttling_off: bool,
    pub rsc_off: bool,
    pub coalescing_off: bool,
    pub flow_control_off: bool,
    pub lso_off: bool,
    /// modération des interruptions : 0 pilote, 1 taux minimal (Intel), 2 coupée
    pub interrupt_moderation: u8,
    pub min_rto: u32,
    pub initial_rto: u32,
    pub system_responsiveness: u32,
    pub timestamps: bool,
    pub rtt_resiliency: bool,
    pub ecn: bool,
    pub auto_tuning: &'static str,
    /// "keep" : laissé tel quel
    pub tuning: &'static str,
    pub ack_frequency: u32,
    pub ack_timeout: u32,
    pub delayed_ack_ticks: u32,
    pub no_delay: bool,
    pub icw: Option<u32>,
    pub dscp: u32,
    pub congestion: &'static str,
}

const TUNINGS: [&str; 7] = ["", "normal", "restricted", "highlyrestricted", "disabled", "experimental", "keep"];
const CONGESTION: [&str; 6] = ["keep", "cubic", "newreno", "ctcp", "dctcp", "bbr2"];

/// Les curseurs en valeurs de Windows : mêmes formules et mêmes arrondis (entiers) que le `:compute` du .bat.
pub fn compute(o: &Options) -> Values {
    let x = &o.expert;
    // Latence : tampons de Windows et de la carte, coupés un à un en allant vers 0
    let agr = 100 - o.latency.min(100);
    let mut im = if agr >= 85 {
        2
    } else if agr >= 60 {
        1
    } else {
        0
    };
    match x.interrupt_moderation {
        Some(true) => im = 0,
        Some(false) => im = 2,
        None => {}
    }
    // Réactivité : délais de renvoi TCP, avec un plancher selon la ligne et sa stabilité
    let r = o.responsiveness.min(100);
    let mut min_rto = (300 - r * 28 / 10) / 10 * 10;
    let mut initial_rto = (1000 - r * 7) / 10 * 10;
    let (mut floor_min, mut floor_irto) = match o.line {
        2 => (30, 300),
        3 => (40, 600),
        4 => (60, 1000),
        5 => (60, 600),
        6 => (100, 1000),
        7 => (120, 1000),
        _ => (20, 300),
    };
    if !o.stable {
        floor_min = floor_min.max(120);
        floor_irto = 1000;
    }
    min_rto = x.min_rto.unwrap_or(min_rto.max(floor_min));
    initial_rto = x.initial_rto.unwrap_or(initial_rto.max(floor_irto));
    let auto_tuning = match o.line {
        2 | 7 => "restricted",
        3 | 6 => "highlyrestricted",
        4 => "disabled",
        _ => "normal",
    };
    let tuning = if o.tuning == 0 { auto_tuning } else { TUNINGS[o.tuning.min(6) as usize] };
    // Délai des paquets : ACK (0 = chaque paquet confirmé tout de suite, 100 = Windows)
    let d = o.delay.min(100);
    Values {
        throttling_off: agr >= 1,
        rsc_off: agr >= 20,
        coalescing_off: agr >= 40,
        flow_control_off: agr >= 50,
        lso_off: agr >= 60,
        interrupt_moderation: im,
        min_rto,
        initial_rto,
        system_responsiveness: 20 - r / 10,
        timestamps: x.timestamps.unwrap_or(!o.stable),
        rtt_resiliency: !o.stable,
        ecn: x.ecn.unwrap_or(false),
        auto_tuning,
        tuning,
        ack_frequency: x.ack_frequency.unwrap_or(if d >= 50 { 2 } else { 1 }),
        ack_timeout: x.ack_timeout.unwrap_or((10 + d * 30 / 100) / 10 * 10),
        delayed_ack_ticks: if d >= 75 {
            2
        } else if d >= 50 {
            1
        } else {
            0
        },
        no_delay: d < 50,
        icw: x.icw.map(|v| v / 2 * 2),
        dscp: x.dscp.unwrap_or(dscp_of(o.priority)),
        congestion: CONGESTION[o.congestion.min(5) as usize],
    }
}

/// Marque QoS d'après le curseur Priorité réseau : CS4, AF41, CS5, EF, puis CS6 (file « voix » du Wi-Fi).
pub fn dscp_of(priority: u32) -> u32 {
    match priority {
        0 => 0,
        1..=19 => 32,
        20..=39 => 34,
        40..=59 => 40,
        60..=89 => 46,
        _ => 48,
    }
}

/// Variables d'environnement du moteur, comme le .bat les lui passait.
fn env(o: &Options, v: &Values, x3d: bool) -> Vec<(&'static str, String)> {
    let b = |on: bool| if on { "1" } else { "0" }.to_string();
    let ed = |on: bool| if on { "enabled" } else { "disabled" }.to_string();
    vec![
        ("C_TUNE", v.tuning.into()),
        ("C_IRTO", v.initial_rto.to_string()),
        ("C_TS", ed(v.timestamps)),
        ("C_NONSACK", ed(v.rtt_resiliency)),
        ("C_ECN", ed(v.ecn)),
        ("C_CCP", v.congestion.into()),
        ("C_MINRTO", v.min_rto.to_string()),
        ("C_ACKTO", v.ack_timeout.to_string()),
        ("C_ACKFREQ", v.ack_frequency.to_string()),
        ("C_ICW", v.icw.map_or("keep".into(), |i| i.to_string())),
        ("C_DELACK", v.delayed_ack_ticks.to_string()),
        ("C_NODELAY", b(v.no_delay)),
        ("C_NTI", b(v.throttling_off)),
        ("C_SYSRESP", v.system_responsiveness.to_string()),
        ("C_RSC", b(v.rsc_off)),
        ("C_PCF", b(v.coalescing_off)),
        ("C_FC", b(v.flow_control_off)),
        ("C_LSO", b(v.lso_off)),
        ("C_IM", v.interrupt_moderation.to_string()),
        ("C_DSCP", v.dscp.to_string()),
        ("O_SMART", b(o.smart)),
        ("O_WIFI", b(o.wifi)),
        ("O_NPS", b(o.power_saving)),
        ("O_MTUMODE", o.mtu_mode.to_string()),
        ("O_MTU", o.mtu.to_string()),
        ("O_TARGET", o.target.clone()),
        ("O_PMODE", b(o.priority_mode)),
        ("O_COMP", b(o.competitive)),
        ("O_BGUARD", b(o.bg_guard)),
        ("RN_X3D", b(x3d)),
    ]
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Apply,
    Restore,
    Defaults,
    Quality,
    Loaded,
    Mtu,
    Detect,
    Status,
}

impl Action {
    pub fn parse(s: &str) -> Option<Action> {
        Some(match s {
            "apply" => Action::Apply,
            "restore" => Action::Restore,
            "defaults" => Action::Defaults,
            "quality" => Action::Quality,
            "loaded" => Action::Loaded,
            "mtu" => Action::Mtu,
            "detect" => Action::Detect,
            "status" => Action::Status,
            _ => return None,
        })
    }

    fn name(self) -> &'static str {
        match self {
            Action::Apply => "apply",
            Action::Restore => "restore",
            Action::Defaults => "defaults",
            Action::Quality => "quality",
            Action::Loaded => "loaded",
            Action::Mtu => "mtu",
            Action::Detect => "detect",
            Action::Status => "status",
        }
    }

    /// Change Windows (et coupe la connexion quelques secondes) : jamais en même temps qu'un lot de réglages.
    pub fn changes(self) -> bool {
        matches!(self, Action::Apply | Action::Restore | Action::Defaults)
    }

    /// Le moteur tourne au plus ce temps (la carte réseau qui redémarre attend jusqu'à 45 s, le MTU automatique mesure).
    fn limit(self) -> Duration {
        Duration::from_secs(if self.changes() { 240 } else { 90 })
    }
}

/// Une ligne du moteur, envoyée à la page (`netopt:line`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Line {
    pub action: &'static str,
    /// ok, warn, fail, info, title, progress
    pub tag: &'static str,
    pub text: String,
    pub step: Option<u32>,
    pub total: Option<u32>,
}

/// Fin d'une action : comptes du moteur et résultat d'un test.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub code: i32,
    pub ok: u32,
    pub warn: u32,
    pub fail: u32,
    pub result: Option<serde_json::Value>,
}

enum Parsed {
    Line(&'static str, String, Option<(u32, u32)>),
    Result(serde_json::Value),
    Sum(u32, u32, u32),
    Other,
}

fn parse(raw: &str) -> Parsed {
    let Some(rest) = raw.trim_end().strip_prefix("@@NO|") else {
        return Parsed::Other;
    };
    let (tag, text) = rest.split_once('|').unwrap_or((rest, ""));
    match tag {
        "OK" => Parsed::Line("ok", text.into(), None),
        "!" => Parsed::Line("warn", text.into(), None),
        "X" => Parsed::Line("fail", text.into(), None),
        ".." => Parsed::Line("info", text.into(), None),
        "#" => Parsed::Line("title", text.into(), None),
        "%" => {
            let (i, n) = text.split_once('|').unwrap_or(("0", "0"));
            Parsed::Line("progress", String::new(), Some((i.parse().unwrap_or(0), n.parse().unwrap_or(0))))
        }
        "=" => serde_json::from_str(text).map(Parsed::Result).unwrap_or(Parsed::Other),
        "sum" => {
            let n: Vec<u32> = text.split('|').map(|v| v.parse().unwrap_or(0)).collect();
            Parsed::Sum(n.first().copied().unwrap_or(0), n.get(1).copied().unwrap_or(0), n.get(2).copied().unwrap_or(0))
        }
        _ => Parsed::Other,
    }
}

/// Texte du moteur pour une action : partie gratuite, partie Premium pour appliquer, point d'entrée.
pub fn script(action: Action, premium: Option<&catalog::Bundle>) -> Result<String, String> {
    let common = catalog::plain_engine("netopt").ok_or("The network engine is missing from the app")?;
    let main = catalog::plain_engine("netopt.main").ok_or("The network engine is missing from the app")?;
    let apply = if action == Action::Apply {
        premium.and_then(|b| b.engine("netopt.apply")).ok_or("premium_scripts_unavailable")?
    } else {
        ""
    };
    Ok(format!("{common}\r\n{apply}\r\n{main}"))
}

/// Dossier du Network Optimizer dans les données de l'app : sauvegarde (snapshot.json), journal, dernier réglage.
pub fn dir(data_dir: &Path) -> PathBuf {
    data_dir.join("netopt")
}

/// Dernière application, gardée pour la page et pour la remise de la désinstallation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    pub options: Options,
    pub at: u64,
    pub ok: u32,
    pub warn: u32,
    pub fail: u32,
}

fn saved_path(data_dir: &Path) -> PathBuf {
    dir(data_dir).join("applied.json")
}

pub fn saved(data_dir: &Path) -> Option<Saved> {
    serde_json::from_slice(&fs::read(saved_path(data_dir)).ok()?).ok()
}

/// Vrai tant que des réglages du Network Optimizer sont posés par Rago (appliqués, pas encore remis).
pub fn applied(data_dir: &Path) -> bool {
    saved_path(data_dir).exists()
}

fn has_backup(data_dir: &Path) -> bool {
    dir(data_dir).join("snapshot.json").exists()
}

/// État pour la page.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub applied: Option<Saved>,
    pub backup: bool,
    pub busy: bool,
}

pub fn state(data_dir: &Path) -> State {
    State { applied: saved(data_dir), backup: has_backup(data_dir), busy: BUSY.load(Ordering::SeqCst) }
}

/// Une action à la fois.
static BUSY: AtomicBool = AtomicBool::new(false);

struct Busy;

impl Busy {
    fn take() -> Option<Busy> {
        (!BUSY.swap(true, Ordering::SeqCst)).then_some(Busy)
    }
}

impl Drop for Busy {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::SeqCst);
    }
}

/// Lance une action du moteur et attend sa fin. `on_line` reçoit chaque ligne. Appliquer demande `premium` (partie
/// Premium du moteur). `x3d` : Ryzen X3D à deux CCD, le mode Compétitif n'y change pas le mode d'alimentation.
pub fn run(
    data_dir: &Path,
    run_dir: &Path,
    action: Action,
    options: &Options,
    premium: Option<&catalog::Bundle>,
    x3d: bool,
    on_line: &dyn Fn(Line),
) -> Result<Outcome, String> {
    let _busy = Busy::take().ok_or("busy")?;
    let script = script(action, premium)?;
    // un lot de réglages ne tourne pas en même temps qu'une action qui change Windows
    let _one = action.changes().then(crate::runner::exclusive);
    let ndir = dir(data_dir);
    fs::create_dir_all(&ndir).map_err(|e| format!("Couldn't prepare {}: {e}", ndir.display()))?;
    fs::create_dir_all(run_dir).map_err(|e| e.to_string())?;
    let path = run_dir.join(format!("netopt-{}-{}.ps1", std::process::id(), crate::history::now_ms()));
    // BOM : PowerShell 5.1 lit sinon le fichier dans la page de code du système
    let mut body = vec![0xEF, 0xBB, 0xBF];
    body.extend_from_slice(script.as_bytes());
    fs::write(&path, body).map_err(|e| format!("Couldn't prepare the network engine: {e}"))?;
    let out = launch(&path, &ndir, action, options, x3d, on_line);
    let _ = fs::remove_file(&path);
    let out = out?;
    match action {
        Action::Apply if out.code == 0 => {
            let s = Saved { options: options.clone(), at: crate::history::now_ms(), ok: out.ok, warn: out.warn, fail: out.fail };
            if let Ok(bytes) = serde_json::to_vec_pretty(&s) {
                let _ = fs::write(saved_path(data_dir), bytes);
            }
        }
        Action::Restore | Action::Defaults if out.code == 0 => {
            let _ = fs::remove_file(saved_path(data_dir));
        }
        _ => {}
    }
    Ok(out)
}

fn launch(path: &Path, ndir: &Path, action: Action, options: &Options, x3d: bool, on_line: &dyn Fn(Line)) -> Result<Outcome, String> {
    let values = compute(options);
    let mut cmd = shell::hidden("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"])
        .arg(path)
        .env("RN_DIR", ndir)
        .env("RN_ACTION", action.name())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    for (k, v) in env(options, &values, x3d) {
        cmd.env(k, v);
    }
    let mut child = cmd.spawn().map_err(|e| format!("Couldn't start PowerShell: {e}"))?;
    // moteur bloqué (pilote qui ne répond plus) : arrêté au bout du délai, la page reprend la main
    let done = Arc::new(AtomicBool::new(false));
    let pid = child.id();
    {
        let done = Arc::clone(&done);
        let limit = action.limit();
        std::thread::spawn(move || {
            let t = std::time::Instant::now();
            while t.elapsed() < limit {
                if done.load(Ordering::SeqCst) {
                    return;
                }
                std::thread::sleep(Duration::from_millis(250));
            }
            if !done.load(Ordering::SeqCst) {
                let _ = shell::hidden("taskkill.exe").args(["/PID", &pid.to_string(), "/T", "/F"]).status();
            }
        });
    }
    let mut out = Outcome::default();
    let name = action.name();
    if let Some(stdout) = child.stdout.take() {
        for raw in BufReader::new(stdout).split(b'\n').map_while(Result::ok) {
            match parse(&String::from_utf8_lossy(&raw)) {
                Parsed::Line(tag, text, step) => {
                    match tag {
                        "ok" => out.ok += 1,
                        "warn" => out.warn += 1,
                        "fail" => out.fail += 1,
                        _ => {}
                    }
                    on_line(Line { action: name, tag, text, step: step.map(|s| s.0), total: step.map(|s| s.1) });
                }
                Parsed::Result(v) => out.result = Some(v),
                Parsed::Sum(ok, warn, fail) => (out.ok, out.warn, out.fail) = (ok, warn, fail),
                Parsed::Other => {}
            }
        }
    }
    let status = child.wait().map_err(|e| e.to_string());
    done.store(true, Ordering::SeqCst);
    out.code = status?.code().unwrap_or(-1);
    Ok(out)
}

/// Désinstallation, fin de licence : les valeurs d'avant la première application (sinon celles de Windows), sans
/// fenêtre. None : rien n'était appliqué par Rago. Ne demande pas de licence (partie gratuite du moteur).
pub fn put_back(data_dir: &Path, run_dir: &Path) -> Option<bool> {
    if !applied(data_dir) {
        return None;
    }
    let action = if has_backup(data_dir) { Action::Restore } else { Action::Defaults };
    let options = saved(data_dir).map(|s| s.options).unwrap_or_default();
    Some(run(data_dir, run_dir, action, &options, None, false, &|_| {}).is_ok_and(|o| o.code == 0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with(f: impl FnOnce(&mut Options)) -> Values {
        let mut o = Options::default();
        f(&mut o);
        compute(&o.sanitized())
    }

    /// Valeurs des captures de la page de référence et du .bat : Équilibré 50 = RTO 650 ms, aucun délai = ACK à
    /// chaque paquet, minuteur 10 ms (le minimum de Windows), Nagle coupé ; priorité 70 = DSCP 46.
    #[test]
    fn sliders_match_the_bat() {
        let v = with(|o| o.responsiveness = 50);
        assert_eq!((v.initial_rto, v.min_rto, v.system_responsiveness), (650, 160, 15));
        let v = with(|o| o.delay = 0);
        assert_eq!((v.ack_frequency, v.ack_timeout, v.delayed_ack_ticks, v.no_delay), (1, 10, 0, true));
        let v = with(|o| o.delay = 100);
        assert_eq!((v.ack_frequency, v.ack_timeout, v.delayed_ack_ticks, v.no_delay), (2, 40, 2, false));
        assert_eq!(with(|o| o.priority = 70).dscp, 46);
        assert_eq!([0, 1, 20, 40, 60, 90, 100].map(dscp_of), [0, 32, 34, 40, 46, 48, 48]);
        // Réactivité 100 : 20 ms et 300 ms sur la fibre, les planchers de la ligne sinon
        let v = with(|o| o.responsiveness = 100);
        assert_eq!((v.min_rto, v.initial_rto, v.system_responsiveness), (20, 300, 10));
        let v = with(|o| (o.responsiveness, o.line) = (100, 4));
        assert_eq!((v.min_rto, v.initial_rto), (60, 1000));
        let v = with(|o| (o.responsiveness, o.stable) = (100, false));
        assert_eq!((v.min_rto, v.initial_rto, v.timestamps, v.rtt_resiliency), (120, 1000, true, true));
        // Réactivité 0 : les valeurs de Windows
        let v = with(|o| o.responsiveness = 0);
        assert_eq!((v.min_rto, v.initial_rto, v.system_responsiveness), (300, 1000, 20));
    }

    #[test]
    fn latency_turns_buffers_off_one_by_one() {
        let v = with(|o| o.latency = 100);
        assert!(!v.throttling_off && !v.rsc_off && !v.lso_off && v.interrupt_moderation == 0);
        let v = with(|o| o.latency = 50);
        assert!(v.throttling_off && v.rsc_off && v.coalescing_off && v.flow_control_off && !v.lso_off);
        assert_eq!(with(|o| o.latency = 40).interrupt_moderation, 1);
        let v = with(|o| o.latency = 0);
        assert!(v.lso_off && v.interrupt_moderation == 2);
        // valeur exacte : la modération reste allumée
        assert_eq!(with(|o| (o.latency, o.expert.interrupt_moderation) = (0, Some(true))).interrupt_moderation, 0);
    }

    #[test]
    fn tuning_follows_the_line_on_auto() {
        assert_eq!(with(|o| o.line = 4).tuning, "disabled");
        assert_eq!(with(|o| o.line = 2).tuning, "restricted");
        assert_eq!(with(|o| o.line = 5).tuning, "normal");
        assert_eq!(with(|o| (o.line, o.tuning) = (4, 1)).tuning, "normal");
        assert_eq!(with(|o| o.tuning = 6).tuning, "keep");
        assert_eq!(with(|o| o.congestion = 2).congestion, "newreno");
        assert_eq!(with(|_| {}).congestion, "keep");
    }

    #[test]
    fn expert_values_win_and_stay_in_range() {
        let v = with(|o| {
            o.expert = Expert { min_rto: Some(5), initial_rto: Some(9000), icw: Some(11), dscp: Some(99), ack_timeout: Some(3), ..Expert::default() }
        });
        assert_eq!((v.min_rto, v.initial_rto, v.icw, v.dscp, v.ack_timeout), (20, 3000, Some(10), 63, 10));
        assert_eq!(with(|_| {}).icw, None);
    }

    /// Le serveur va au moteur dans une variable d'environnement : rien d'autre qu'un nom, une IP ou nom:port.
    #[test]
    fn target_is_a_plain_address() {
        for ok in ["hypixel.net", "1.1.1.1", "play.server.fr:25565", "mc-eu.minemen.club"] {
            assert!(valid_target(ok), "{ok}");
        }
        for bad in ["", "-x", "a b", "x;calc", "$(calc)", "a\"b", "é.fr"] {
            assert!(!valid_target(bad), "{bad}");
        }
        let o = Options { target: "x'; rm".into(), latency: 400, line: 0, mtu: 9000, ..Options::default() }.sanitized();
        assert_eq!((o.target.as_str(), o.latency, o.line, o.mtu), ("1.1.1.1", 100, 1, 1500));
    }

    #[test]
    fn engine_lines_are_read() {
        assert!(matches!(parse("@@NO|OK|Network throttling off\r"), Parsed::Line("ok", t, None) if t == "Network throttling off"));
        assert!(matches!(parse("@@NO|..|MTU left as is"), Parsed::Line("info", _, None)));
        assert!(matches!(parse("@@NO|%|3|11"), Parsed::Line("progress", _, Some((3, 11)))));
        assert!(matches!(parse("@@NO|sum|12|1|0"), Parsed::Sum(12, 1, 0)));
        assert!(matches!(parse("@@NO|=|{\"kind\":\"mtu\",\"mtu\":1492}"), Parsed::Result(v) if v["mtu"] == 1492));
        assert!(matches!(parse("netsh output"), Parsed::Other));
        // un message peut contenir « | »
        assert!(matches!(parse("@@NO|!|a | b"), Parsed::Line("warn", t, None) if t == "a | b"));
    }

    /// Appliquer n'existe que dans les scripts Premium ; remettre et tester tournent sans licence.
    #[test]
    fn apply_needs_the_premium_part() {
        assert_eq!(script(Action::Apply, None).unwrap_err(), "premium_scripts_unavailable");
        let restore = script(Action::Restore, None).unwrap();
        assert!(restore.contains("function Do-Restore") && restore.contains("'restore'"));
        assert!(!restore.contains("function Do-Apply") && !restore.contains("function Take-Snapshot"));
        let key = crate::seal::version_key(crate::seal::TEST_SECRET, env!("CARGO_PKG_VERSION"));
        if let Some(b) = catalog::premium(&key) {
            let apply = script(Action::Apply, Some(&b)).unwrap();
            let (d, m) = (apply.find("function Do-Apply").unwrap(), apply.find("switch (EnvStr 'RN_ACTION'").unwrap());
            assert!(apply.find("function Log(").unwrap() < d && d < m, "fonctions définies avant le point d'entrée");
        }
    }

    /// Chaque variable lue par le moteur lui est passée.
    #[test]
    fn engine_gets_every_variable_it_reads() {
        let src = [include_str!("../netopt/common.ps1"), include_str!("../netopt/apply.ps1")].concat();
        let given: Vec<&str> = env(&Options::default(), &compute(&Options::default()), false).iter().map(|(k, _)| *k).collect();
        let mut read = 0;
        for cap in src.split("Env").skip(1) {
            let Some(rest) = cap.strip_prefix("Int '").or_else(|| cap.strip_prefix("Str '")) else { continue };
            let name = rest.split('\'').next().unwrap();
            if name == "RN_ACTION" {
                continue;
            }
            assert!(given.contains(&name), "{name} lu par le moteur mais pas passé");
            read += 1;
        }
        for cap in src.split("(On '").skip(1) {
            let name = cap.split('\'').next().unwrap();
            assert!(given.contains(&name), "{name} lu par le moteur mais pas passé");
            read += 1;
        }
        assert!(read > 30);
    }

    /// Moteur en ASCII (lu par PowerShell 5.1), et aucune commande du .bat qui ouvrirait une fenêtre ou attendrait.
    #[test]
    fn engine_text_is_safe_to_run_hidden() {
        for (name, src) in [
            ("common", include_str!("../netopt/common.ps1")),
            ("apply", include_str!("../netopt/apply.ps1")),
            ("main", include_str!("../netopt/main.ps1")),
        ] {
            assert!(src.is_ascii(), "{name}.ps1");
            for bad in ["Write-Host", "Read-Host", "pause", "shutdown", "Restart-Computer"] {
                assert!(!src.contains(bad), "{name}.ps1 contient {bad}");
            }
        }
    }
}
