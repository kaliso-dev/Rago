//! Réglages appliqués et sauvegarde de l'état d'avant, gardés dans %APPDATA%\gg.rago.optimizer\applied.json.
//!
//! Avant d'appliquer un réglage, le moteur lance son relevé (tools/probes.py) : il dit ce que le script va
//! modifier. Chaque élément est lu une seule fois, avant la première modification par Rago Optimizer, et gardé
//! (« état d'avant »). Décocher le réglage remet ces éléments, sauf ceux qu'un autre réglage encore appliqué
//! modifie aussi : ils sont remis quand le dernier réglage qui les touche est décoché.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};

/// Ce qu'un script va modifier, lu dans les lignes `@@RAGO` de son relevé.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "t", rename_all = "lowercase")]
pub enum Probe {
    /// valeur de registre (nom vide : valeur par défaut de la clé)
    Reg { key: String, name: String },
    /// clé créée sans valeur
    RegKey { key: String },
    /// toutes les valeurs d'une clé (`reg delete /va`)
    RegVals { key: String },
    /// clé entière supprimée
    RegTree { key: String },
    Bcd { store: String, name: String },
    Task { path: String },
    Pwr { scheme: String, sub: String, setting: String },
    PwrActive,
    Hib,
}

impl Probe {
    /// Identité, insensible à la casse comme le registre et les commandes Windows.
    pub fn id(&self) -> String {
        match self {
            Probe::Reg { key, name } => format!("reg|{}|{}", key.to_lowercase(), name.to_lowercase()),
            Probe::RegKey { key } => format!("regkey|{}", key.to_lowercase()),
            Probe::RegVals { key } => format!("regvals|{}", key.to_lowercase()),
            Probe::RegTree { key } => format!("regtree|{}", key.to_lowercase()),
            Probe::Bcd { store, name } => format!("bcd|{}|{}", store.to_lowercase(), name.to_lowercase()),
            Probe::Task { path } => format!("task|{}", path.trim_start_matches('\\').to_lowercase()),
            Probe::Pwr { scheme, sub, setting } => {
                format!("pwr|{}|{}|{}", scheme.to_lowercase(), sub.to_lowercase(), setting.to_lowercase())
            }
            Probe::PwrActive => "pwractive".into(),
            Probe::Hib => "hib".into(),
        }
    }
}

/// Racine courte (HKLM, HKCU…) et chemin sans barre finale. None si la racine est inconnue.
pub fn normalize_key(key: &str) -> Option<String> {
    let key = key.trim().trim_matches('"').trim_end_matches('\\');
    let (root, rest) = key.split_once('\\').unwrap_or((key, ""));
    let root = match root.to_uppercase().as_str() {
        "HKLM" | "HKEY_LOCAL_MACHINE" => "HKLM",
        "HKCU" | "HKEY_CURRENT_USER" => "HKCU",
        "HKU" | "HKEY_USERS" => "HKU",
        "HKCR" | "HKEY_CLASSES_ROOT" => "HKCR",
        "HKCC" | "HKEY_CURRENT_CONFIG" => "HKCC",
        _ => return None,
    };
    Some(if rest.is_empty() { root.to_string() } else { format!("{root}\\{rest}") })
}

/// Arguments entre guillemets d'une ligne `@@RAGO type "a" "b"`.
fn quoted(s: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = s;
    while let Some(a) = rest.find('"') {
        let after = &rest[a + 1..];
        let Some(b) = after.find('"') else { break };
        out.push(after[..b].to_string());
        rest = &after[b + 1..];
    }
    out
}

/// Lit la sortie d'un relevé. Les doublons sont retirés, l'ordre est gardé.
pub fn parse_markers(output: &str) -> Vec<Probe> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for line in output.lines() {
        let Some(rest) = line.trim().strip_prefix("@@RAGO ") else { continue };
        let (kind, args) = rest.split_once(' ').unwrap_or((rest, ""));
        let a = quoted(args);
        let key = |i: usize| a.get(i).and_then(|k| normalize_key(k));
        let probe = match kind {
            // une boucle qui n'a rien trouvé laisse la clé vide ou sans racine : rien à garder
            "reg" => key(0).map(|key| Probe::Reg { key, name: a.get(1).cloned().unwrap_or_default() }),
            "regkey" => key(0).map(|key| Probe::RegKey { key }),
            "regvals" => key(0).map(|key| Probe::RegVals { key }),
            "regtree" => key(0).map(|key| Probe::RegTree { key }),
            "bcd" if a.len() == 2 => Some(Probe::Bcd { store: a[0].to_lowercase(), name: a[1].to_lowercase() }),
            "task" if !a.is_empty() && !a[0].trim().is_empty() => Some(Probe::Task { path: a[0].trim().to_string() }),
            "pwr" if a.len() == 3 => Some(Probe::Pwr { scheme: a[0].clone(), sub: a[1].clone(), setting: a[2].clone() }),
            "pwractive" => Some(Probe::PwrActive),
            "hib" => Some(Probe::Hib),
            _ => None,
        };
        if let Some(p) = probe {
            if seen.insert(p.id()) {
                out.push(p);
            }
        }
    }
    out
}

/// État relevé d'un élément.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "t", rename_all = "lowercase")]
pub enum Saved {
    /// valeur de registre : type et octets bruts en hexadécimal
    Value { kind: u32, data: String },
    /// valeur absente ; `created` : première clé du chemin qui n'existait pas (supprimée si vide au retour)
    Absent {
        #[serde(default)]
        created: Option<String>,
    },
    Values { values: Vec<(String, u32, String)> },
    /// clé exportée avec `reg export`
    Tree { file: String },
    NoTree,
    Key { existed: bool },
    Bcd { value: Option<String> },
    Task { enabled: Option<bool> },
    Pwr { scheme: String, ac: Option<u32>, dc: Option<u32> },
    Active { guid: String },
    Hib { on: bool },
    /// illisible : rien à remettre
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedEntry {
    pub probe: Probe,
    pub before: Saved,
    /// valeur posée par Rago Optimizer (registre), pour voir si Windows l'a changée depuis
    #[serde(default)]
    pub after: Option<Saved>,
}

/// Scripts qui remettent les valeurs de Windows (scripts/undo.json, généré par tools/undo depuis l'audit des
/// réglages) : `full` quand il n'y a pas de sauvegarde (réglage appliqué avant 1.1.6 ou par l'ancien .bat), `rest`
/// pour ce que la sauvegarde ne relève pas (netsh, PowerShell, plans supprimés…), lancé après elle sauf si
/// `rest_avant` (le plan d'alimentation à réactiver doit d'abord être recréé).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct Undo {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub full: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rest: Option<String>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub rest_avant: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Applied {
    pub variant: Option<String>,
    pub ts: u64,
    pub ok: bool,
    /// l'état d'avant a été relevé (sinon : appliqué avant 1.1.6, retour par les valeurs de Windows)
    pub backup: bool,
    #[serde(default)]
    pub probes: Vec<String>,
    /// copie de l'annulation du réglage, gardée quand la licence était active : les scripts Premium sont chiffrés
    /// dans l'exe, et la déconnexion ou la fin de licence doit quand même pouvoir tout remettre
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub undo: Option<Undo>,
    /// le réglage n'a posé que les valeurs de Windows (RBW Mod « Désactivé » depuis RAG-69) : rien à défaire, son
    /// annulation ne lance rien. Absent des entrées d'avant, dont l'ancien « Désactivé » qui mettait des services en
    /// manuel : celles-là gardent leur retour arrière
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub windows_values: bool,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Ledger {
    #[serde(default)]
    pub tweaks: BTreeMap<String, Applied>,
    /// état d'avant de chaque élément, dans l'ordre où il a été relevé
    #[serde(default)]
    pub saved: Vec<(String, SavedEntry)>,
    #[serde(skip)]
    path: PathBuf,
    /// le fichier sur disque n'a pu être ni lu ni mis de côté : rien ne doit l'écraser (voir `load`)
    #[serde(skip)]
    unread: std::sync::atomic::AtomicBool,
    /// le fichier lu était en clair (version d'avant le chiffrement au repos) : à réécrire chiffré
    #[serde(skip)]
    legacy_plaintext: bool,
}

/// Réglage appliqué, tel que l'interface l'affiche.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedView {
    pub id: String,
    pub variant: Option<String>,
    pub ts: u64,
    pub ok: bool,
    pub backup: bool,
    /// Windows (ou une autre app) a changé une valeur posée par ce réglage depuis
    pub drift: bool,
    /// voir Applied::windows_values : l'annulation ne lance rien (pas de redémarrage à proposer)
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub windows_values: bool,
}

/// En-tête d'applied.json chiffré avec la clé de secours de l'app (voir `encode`).
const LEDGER_FALLBACK: &[u8] = b"RAGO-LEDGER-1\0";

/// Contenu chiffré d'applied.json. DPAPI (lié au compte Windows) dans le cas normal ; s'il refuse (profil Windows
/// abîmé), la clé de secours de l'app (`seal::ledger_key`) : jamais de commandes en clair sur le disque.
fn encode(json: &str, dpapi: Option<Vec<u8>>) -> Vec<u8> {
    if let Some(bytes) = dpapi {
        return bytes;
    }
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let digest = Sha256::new()
        .chain_update(t.to_le_bytes())
        .chain_update(std::process::id().to_le_bytes())
        .chain_update(json.as_bytes())
        .finalize();
    let mut nonce = [0u8; 16];
    nonce.copy_from_slice(&digest[..16]);
    let mut out = LEDGER_FALLBACK.to_vec();
    out.extend(crate::seal::seal(&crate::seal::ledger_key(), &nonce, json.as_bytes()));
    out
}

/// Texte d'applied.json, et s'il est à réécrire chiffré avec DPAPI : fichier d'une version d'avant le chiffrement
/// au repos (encore en clair), ou chiffré avec la clé de secours.
fn decode(bytes: &[u8]) -> (String, bool) {
    if let Some(rest) = bytes.strip_prefix(LEDGER_FALLBACK) {
        if let Some(text) = crate::seal::open(&crate::seal::ledger_key(), rest).and_then(|b| String::from_utf8(b).ok()) {
            return (text, true);
        }
    }
    match crate::license::vault::open(bytes) {
        Some(text) => (text, false),
        None => (String::from_utf8_lossy(bytes).into_owned(), true),
    }
}

impl Ledger {
    /// applied.json : `(registre, true)` s'il a été lu. Absent : registre vide et `false` (premier lancement depuis
    /// 1.1.6, l'appelant le remplit d'après l'historique). Présent mais illisible (coupure de courant pendant une
    /// écriture, champ qu'une version future rend obligatoire, fichier verrouillé) : avant, il était traité comme absent
    /// puis écrasé au premier enregistrement, et tous les états d'avant étaient perdus. Il est maintenant mis de côté
    /// sous `applied.json.bad-<horodatage>` (noté dans logs\repairs.log : le support peut le relire ou le remettre), et
    /// un registre neuf commence. S'il ne peut même pas être renommé, rien ne l'écrase pendant ce lancement.
    pub fn load(path: PathBuf) -> (Self, bool) {
        let read = || match fs::read(&path) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        };
        // verrou passager (antivirus, sauvegarde) : quelques essais avant de conclure qu'il ne se lit pas
        let mut got = read();
        for _ in 0..3 {
            if got.is_ok() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
            got = read();
        }
        let why = match got {
            Ok(None) => return (Ledger { path, ..Default::default() }, false),
            Ok(Some(bytes)) => {
                let (json, legacy) = decode(&bytes);
                match serde_json::from_str::<Ledger>(&json) {
                    Ok(mut l) => {
                        l.path = path;
                        l.legacy_plaintext = legacy;
                        return (l, true);
                    }
                    // fichier coupé, ou chiffré pour un autre compte Windows : mis de côté, jamais écrasé
                    Err(e) => format!("unreadable ({e})"),
                }
            }
            Err(e) => format!("couldn't be read ({e})"),
        };
        let l = Ledger { path, ..Default::default() };
        if !l.set_aside(&why) {
            l.unread.store(true, std::sync::atomic::Ordering::SeqCst);
        }
        (l, false)
    }

    /// Met applied.json de côté sous `applied.json.bad-<horodatage>`, avec une ligne dans logs\repairs.log. Faux s'il
    /// est encore là sous son nom.
    fn set_aside(&self, why: &str) -> bool {
        let ts = crate::history::now_ms();
        let name = self.path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "applied.json".into());
        let aside = self.path.with_file_name(format!("{name}.bad-{ts}"));
        let moved = fs::rename(&self.path, &aside).is_ok() || !self.path.exists();
        if let Some(logs) = self.path.parent().map(|d| d.join("logs")) {
            let _ = fs::create_dir_all(&logs);
            if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(logs.join("repairs.log")) {
                use std::io::Write;
                let _ = if moved {
                    writeln!(f, "{ts} {name} {why}: kept as {}, a new one is started", aside.display())
                } else {
                    writeln!(f, "{ts} {name} {why}, and couldn't be set aside: left untouched, changes of this launch aren't saved")
                };
            }
        }
        moved
    }

    pub fn save(&self) {
        use std::sync::atomic::Ordering;
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        // fichier d'avant illisible et encore en place (verrou) : jamais écrasé ; mis de côté dès que possible
        if self.unread.load(Ordering::SeqCst) {
            if !self.set_aside("couldn't be read at launch") {
                return;
            }
            self.unread.store(false, Ordering::SeqCst);
        }
        if let Ok(json) = serde_json::to_string(self) {
            // chiffré au repos, puis écrit à côté, sur le disque (sync_all), et remplace : une coupure de courant ne
            // laisse ni un fichier coupé ni un fichier vide sous le bon nom
            let bytes = encode(&json, crate::license::vault::seal(&json));
            let tmp = self.path.with_extension("json.tmp");
            let written = fs::File::create(&tmp).and_then(|mut f| {
                use std::io::Write;
                f.write_all(&bytes)?;
                f.sync_all()
            });
            if written.is_ok() {
                let _ = fs::rename(&tmp, &self.path);
            }
        }
    }

    /// Le fichier lu était en clair (version d'avant le chiffrement) : le réécrire chiffré au premier lancement.
    pub fn needs_migration(&self) -> bool {
        self.legacy_plaintext
    }

    pub fn has(&self, probe_id: &str) -> bool {
        self.saved.iter().any(|(id, _)| id == probe_id)
    }

    pub fn record_before(&mut self, probe: Probe, before: Saved) {
        let id = probe.id();
        if !self.has(&id) {
            self.saved.push((id, SavedEntry { probe, before, after: None }));
        }
    }

    pub fn set_after(&mut self, probe_id: &str, after: Saved) {
        if let Some((_, e)) = self.saved.iter_mut().find(|(id, _)| id == probe_id) {
            e.after = Some(after);
        }
    }

    /// Garde, pour chaque réglage appliqué, la copie de son annulation telle que cette version la lance (lookup :
    /// scripts ouverts maintenant). Une copie prise par une version d'avant (1.1.6 à 1.1.10) est remplacée dès que
    /// l'annulation de cette version est connue : sans licence (fin de Premium, déconnexion, désinstallation, Tout
    /// annuler), c'est la copie qui tourne, et seule celle de cette version a les corrections de l'écran bleu (plus de
    /// CoalescingTimerInterval à 0) et des chemins du profil. Sans lookup (scripts Premium fermés), la copie reste
    /// telle quelle. Renvoie true si quelque chose a changé.
    pub fn fill_undo(&mut self, lookup: &dyn Fn(&str, Option<&str>) -> Option<Undo>) -> bool {
        let mut changed = false;
        for (id, a) in self.tweaks.iter_mut() {
            if let Some(u) = lookup(id, a.variant.as_deref()) {
                if a.undo.as_ref() != Some(&u) {
                    a.undo = Some(u);
                    changed = true;
                }
            }
        }
        changed
    }

    pub fn set_applied(&mut self, tid: &str, variant: Option<String>, ok: bool, backup: bool, probes: Vec<String>, ts: u64) {
        let fresh = !self.tweaks.contains_key(tid);
        let entry = self.tweaks.entry(tid.to_string()).or_default();
        // un réglage appliqué avant 1.1.6 (sans sauvegarde) et réappliqué : ce qu'on relèverait maintenant est
        // déjà sa propre valeur, il garde donc le retour par les valeurs de Windows
        entry.backup = if fresh { backup } else { entry.backup && backup };
        for p in probes {
            if !entry.probes.contains(&p) {
                entry.probes.push(p);
            }
        }
        if entry.variant != variant {
            entry.undo = None;
        }
        entry.variant = variant;
        entry.ok = ok;
        entry.ts = ts;
    }

    /// Ce que `release` renverra, sans retirer le réglage : il reste dans applied.json pendant qu'on remet ses
    /// éléments, pour qu'une remise coupée (app fermée, PC éteint) reprenne au lancement suivant.
    pub fn releasable(&self, tid: &str) -> Vec<SavedEntry> {
        let Some(applied) = self.tweaks.get(tid) else { return Vec::new() };
        let still: HashSet<&String> =
            self.tweaks.iter().filter(|(id, _)| id.as_str() != tid).flat_map(|(_, a)| a.probes.iter()).collect();
        let mine: HashSet<&String> = applied.probes.iter().collect();
        let mut out: Vec<SavedEntry> =
            self.saved.iter().filter(|(id, _)| mine.contains(id) && !still.contains(id)).map(|(_, e)| e.clone()).collect();
        out.reverse();
        out
    }

    /// Retire le réglage. Renvoie, dans l'ordre inverse du relevé, les éléments à remettre : ceux qu'aucun
    /// autre réglage encore appliqué ne modifie.
    pub fn release(&mut self, tid: &str) -> Vec<SavedEntry> {
        let Some(applied) = self.tweaks.remove(tid) else { return Vec::new() };
        let still: HashSet<&String> = self.tweaks.values().flat_map(|a| a.probes.iter()).collect();
        let mine: HashSet<&String> = applied.probes.iter().collect();
        let mut out = Vec::new();
        let mut keep = Vec::new();
        for (id, e) in self.saved.drain(..) {
            if mine.contains(&id) && !still.contains(&id) {
                out.push(e);
            } else {
                keep.push((id, e));
            }
        }
        self.saved = keep;
        out.reverse();
        out
    }

    /// Premier lancement de 1.1.6 : les réglages déjà appliqués d'après l'historique, sans sauvegarde.
    pub fn import_history(&mut self, history: &[crate::history::Entry]) {
        let mut last: HashMap<&str, &crate::history::Entry> = HashMap::new();
        for e in history {
            if last.get(e.id.as_str()).map_or(true, |p| p.ts <= e.ts) {
                last.insert(&e.id, e);
            }
        }
        for (id, e) in last {
            if e.ok && !e.undo && crate::catalog::is_switch(id) && !crate::catalog::is_revert(id, e.variant.as_deref()) {
                self.tweaks.insert(
                    id.to_string(),
                    Applied { variant: e.variant.clone(), ts: e.ts, ok: true, backup: false, ..Default::default() },
                );
            }
        }
    }

    pub fn views(&self, read: &dyn Fn(&Probe) -> Saved) -> Vec<AppliedView> {
        // valeur attendue de chaque élément de registre : la dernière posée par Rago Optimizer
        let mut drifted = HashSet::new();
        for (id, e) in &self.saved {
            if let (Probe::Reg { .. }, Some(after)) = (&e.probe, &e.after) {
                if &read(&e.probe) != after {
                    drifted.insert(id.clone());
                }
            }
        }
        self.tweaks
            .iter()
            .map(|(id, a)| AppliedView {
                id: id.clone(),
                variant: a.variant.clone(),
                ts: a.ts,
                ok: a.ok,
                backup: a.backup,
                drift: a.probes.iter().any(|p| drifted.contains(p)),
                windows_values: a.windows_values,
            })
            .collect()
    }
}

// ------------------------------------------------------------------ lecture des sorties de Windows

/// `bcdedit /enum {id}` : nom de l'élément → valeur. Les noms ne sont pas traduits, les valeurs oui/non le sont.
pub fn parse_bcd(output: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    for line in output.lines() {
        let line = line.trim_end();
        if line.is_empty() || line.starts_with('-') || line.starts_with(' ') {
            continue;
        }
        if let Some((name, value)) = line.split_once(char::is_whitespace) {
            let value = value.trim();
            if !value.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == ':' || c == '_') {
                out.entry(name.to_lowercase()).or_insert_with(|| value.to_string());
            }
        }
    }
    out
}

/// Valeur relevée → argument pour `bcdedit /set` (les oui/non affichés dans la langue de Windows).
pub fn bcd_value(v: &str) -> String {
    const YES: [&str; 12] = ["yes", "oui", "ja", "sí", "si", "sim", "tak", "да", "evet", "是", "はい", "예"];
    const NO: [&str; 11] = ["no", "non", "nein", "não", "nao", "nie", "нет", "hayır", "否", "いいえ", "아니요"];
    let low = v.trim().to_lowercase();
    if YES.contains(&low.as_str()) {
        "yes".into()
    } else if NO.contains(&low.as_str()) {
        "no".into()
    } else {
        v.trim().to_string()
    }
}

/// `powercfg /q schéma sous-groupe réglage` : les deux dernières valeurs hexadécimales sont l'index
/// secteur puis batterie (les libellés sont traduits, pas les nombres).
pub fn parse_pwr(output: &str) -> (Option<u32>, Option<u32>) {
    let hex: Vec<u32> = output
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter_map(|w| w.strip_prefix("0x").and_then(|h| u32::from_str_radix(h, 16).ok()))
        .collect();
    match hex.len() {
        0 | 1 => (None, None),
        n => (Some(hex[n - 2]), Some(hex[n - 1])),
    }
}

/// Premier GUID d'une sortie (`powercfg /getactivescheme`).
pub fn parse_guid(output: &str) -> Option<String> {
    let b = output.as_bytes();
    (0..b.len().saturating_sub(35)).find_map(|i| {
        let s = output.get(i..i + 36)?;
        let ok = s.char_indices().all(|(j, c)| if [8, 13, 18, 23].contains(&j) { c == '-' } else { c.is_ascii_hexdigit() });
        ok.then(|| s.to_lowercase())
    })
}

/// Fichier XML d'une tâche planifiée : activée sauf `<Enabled>false</Enabled>` dans `<Settings>`.
pub fn task_enabled(xml: &str) -> Option<bool> {
    let settings = xml.split("<Settings>").nth(1)?.split("</Settings>").next()?;
    Some(!settings.replace(char::is_whitespace, "").contains("<Enabled>false</Enabled>"))
}

/// UTF-16 avec BOM (fichiers de tâches) ou UTF-8.
pub fn decode_text(bytes: &[u8]) -> String {
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        let u: Vec<u16> = bytes[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        String::from_utf16_lossy(&u)
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    }
}

pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn unhex(s: &str) -> Vec<u8> {
    (0..s.len() / 2).filter_map(|i| u8::from_str_radix(&s[2 * i..2 * i + 2], 16).ok()).collect()
}

pub fn file_for(dir: &Path, probe_id: &str) -> PathBuf {
    use sha2::{Digest, Sha256};
    let h = hex(&Sha256::digest(probe_id.as_bytes())[..8]);
    dir.join(format!("{h}.reg"))
}

// ------------------------------------------------------------------ Windows

/// Lecture et remise des éléments sur Windows. Ailleurs (tests, démo), rien n'est lu ni écrit.
pub struct Sys {
    pub backup_dir: PathBuf,
    bcd: std::cell::RefCell<HashMap<String, HashMap<String, String>>>,
    active: std::cell::RefCell<Option<String>>,
}

impl Sys {
    pub fn new(backup_dir: PathBuf) -> Self {
        Sys { backup_dir, bcd: Default::default(), active: Default::default() }
    }
}

#[cfg(windows)]
mod win {
    use super::*;
    use crate::shell;
    use windows_sys::Win32::Foundation::ERROR_SUCCESS;
    use windows_sys::Win32::System::Registry::*;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn root(key: &str) -> Option<(HKEY, &str)> {
        let (r, rest) = key.split_once('\\').unwrap_or((key, ""));
        let h = match r {
            "HKLM" => HKEY_LOCAL_MACHINE,
            "HKCU" => HKEY_CURRENT_USER,
            "HKU" => HKEY_USERS,
            "HKCR" => HKEY_CLASSES_ROOT,
            "HKCC" => HKEY_CURRENT_CONFIG,
            _ => return None,
        };
        Some((h, rest))
    }

    struct Key(HKEY);
    impl Drop for Key {
        fn drop(&mut self) {
            unsafe { RegCloseKey(self.0) };
        }
    }

    fn open(key: &str, access: u32) -> Option<Key> {
        let (h, sub) = root(key)?;
        let mut out: HKEY = std::ptr::null_mut();
        let r = unsafe { RegOpenKeyExW(h, wide(sub).as_ptr(), 0, access | KEY_WOW64_64KEY, &mut out) };
        (r == ERROR_SUCCESS).then_some(Key(out))
    }

    fn create(key: &str) -> Option<Key> {
        let (h, sub) = root(key)?;
        let mut out: HKEY = std::ptr::null_mut();
        let r = unsafe {
            RegCreateKeyExW(
                h,
                wide(sub).as_ptr(),
                0,
                std::ptr::null(),
                REG_OPTION_NON_VOLATILE,
                KEY_ALL_ACCESS | KEY_WOW64_64KEY,
                std::ptr::null(),
                &mut out,
                std::ptr::null_mut(),
            )
        };
        (r == ERROR_SUCCESS).then_some(Key(out))
    }

    fn query(k: &Key, name: &str) -> Option<(u32, Vec<u8>)> {
        let n = wide(name);
        let (mut kind, mut len) = (0u32, 0u32);
        let r = unsafe { RegQueryValueExW(k.0, n.as_ptr(), std::ptr::null(), &mut kind, std::ptr::null_mut(), &mut len) };
        if r != ERROR_SUCCESS {
            return None;
        }
        let mut buf = vec![0u8; len as usize];
        let r = unsafe { RegQueryValueExW(k.0, n.as_ptr(), std::ptr::null(), &mut kind, buf.as_mut_ptr(), &mut len) };
        if r != ERROR_SUCCESS {
            return None;
        }
        buf.truncate(len as usize);
        Some((kind, buf))
    }

    fn enum_values(k: &Key) -> Vec<(String, u32, Vec<u8>)> {
        let mut out = Vec::new();
        for i in 0.. {
            let mut name = vec![0u16; 16384];
            let mut nlen = name.len() as u32;
            let (mut kind, mut dlen) = (0u32, 0u32);
            let r = unsafe {
                RegEnumValueW(k.0, i, name.as_mut_ptr(), &mut nlen, std::ptr::null(), &mut kind, std::ptr::null_mut(), &mut dlen)
            };
            if r != ERROR_SUCCESS {
                break;
            }
            let name = String::from_utf16_lossy(&name[..nlen as usize]);
            if let Some((kind, data)) = query(k, &name) {
                out.push((name, kind, data));
            }
        }
        out
    }

    /// Clé vide (ni valeur ni sous-clé) ?
    fn is_empty(key: &str) -> bool {
        let Some(k) = open(key, KEY_READ) else { return false };
        let (mut subkeys, mut values) = (0u32, 0u32);
        let r = unsafe {
            RegQueryInfoKeyW(
                k.0,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null(),
                &mut subkeys,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut values,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            )
        };
        r == ERROR_SUCCESS && subkeys == 0 && values == 0
    }

    fn delete_key(key: &str) -> bool {
        let Some((h, sub)) = root(key) else { return false };
        unsafe { RegDeleteKeyExW(h, wide(sub).as_ptr(), KEY_WOW64_64KEY, 0) == ERROR_SUCCESS }
    }

    /// Supprime `key` puis ses parents tant qu'ils sont vides, sans remonter au-dessus de `created`.
    fn prune(key: &str, created: &str) {
        let mut cur = key.to_string();
        loop {
            if !is_empty(&cur) || !delete_key(&cur) || cur.eq_ignore_ascii_case(created) {
                break;
            }
            match cur.rsplit_once('\\') {
                Some((parent, _)) if parent.len() >= created.len() => cur = parent.to_string(),
                _ => break,
            }
        }
    }

    /// Première clé du chemin qui n'existe pas.
    fn first_missing(key: &str) -> Option<String> {
        let mut cur = String::new();
        for part in key.split('\\') {
            cur = if cur.is_empty() { part.to_string() } else { format!("{cur}\\{part}") };
            if !cur.contains('\\') {
                continue;
            }
            if open(&cur, KEY_READ).is_none() {
                return Some(cur);
            }
        }
        None
    }

    fn run(exe: &str, args: &[&str]) -> Result<String, String> {
        let o = shell::hidden(exe).args(args).output().map_err(|e| e.to_string())?;
        let text = format!("{}{}", super::decode_text(&o.stdout), super::decode_text(&o.stderr));
        if o.status.success() {
            Ok(text)
        } else {
            Err(text.trim().lines().last().unwrap_or("failed").to_string())
        }
    }

    impl Sys {
        pub fn read(&self, probe: &Probe) -> Saved {
            match probe {
                Probe::Reg { key, name } => match open(key, KEY_READ) {
                    None => Saved::Absent { created: first_missing(key) },
                    Some(k) => match query(&k, name) {
                        Some((kind, data)) => Saved::Value { kind, data: hex(&data) },
                        None => Saved::Absent { created: None },
                    },
                },
                Probe::RegKey { key } => Saved::Key { existed: open(key, KEY_READ).is_some() },
                Probe::RegVals { key } => match open(key, KEY_READ) {
                    None => Saved::Values { values: Vec::new() },
                    Some(k) => Saved::Values { values: enum_values(&k).into_iter().map(|(n, t, d)| (n, t, hex(&d))).collect() },
                },
                Probe::RegTree { key } => {
                    if open(key, KEY_READ).is_none() {
                        return Saved::NoTree;
                    }
                    let _ = fs::create_dir_all(&self.backup_dir);
                    let file = file_for(&self.backup_dir, &probe.id());
                    match run("reg.exe", &["export", key, &file.to_string_lossy(), "/y"]) {
                        Ok(_) => Saved::Tree { file: file.to_string_lossy().into_owned() },
                        Err(_) => Saved::Unknown,
                    }
                }
                Probe::Bcd { store, name } => {
                    let mut cache = self.bcd.borrow_mut();
                    let map = cache
                        .entry(store.clone())
                        .or_insert_with(|| run("bcdedit.exe", &["/enum", store]).map(|o| parse_bcd(&o)).unwrap_or_default());
                    if map.is_empty() {
                        return Saved::Unknown;
                    }
                    Saved::Bcd { value: map.get(name).cloned() }
                }
                Probe::Task { path } => {
                    let windir = std::env::var("WINDIR").unwrap_or_else(|_| r"C:\Windows".into());
                    let file = Path::new(&windir).join("System32").join("Tasks").join(path.trim_start_matches('\\'));
                    match fs::read(&file) {
                        Ok(bytes) => Saved::Task { enabled: task_enabled(&decode_text(&bytes)) },
                        Err(_) => Saved::Task { enabled: None },
                    }
                }
                Probe::Pwr { scheme, sub, setting } => {
                    let Some(scheme) = self.scheme(scheme) else { return Saved::Unknown };
                    match run("powercfg.exe", &["/q", &scheme, sub, setting]) {
                        Ok(o) => {
                            let (ac, dc) = parse_pwr(&o);
                            if ac.is_none() {
                                return Saved::Unknown;
                            }
                            Saved::Pwr { scheme, ac, dc }
                        }
                        Err(_) => Saved::Unknown,
                    }
                }
                Probe::PwrActive => self.scheme("scheme_current").map(|guid| Saved::Active { guid }).unwrap_or(Saved::Unknown),
                Probe::Hib => {
                    let on = open(r"HKLM\SYSTEM\CurrentControlSet\Control\Power", KEY_READ)
                        .and_then(|k| query(&k, "HibernateEnabled"))
                        .map(|(_, d)| d.first().copied().unwrap_or(0) != 0);
                    on.map(|on| Saved::Hib { on }).unwrap_or(Saved::Unknown)
                }
            }
        }

        /// GUID du schéma visé : le schéma actif au moment du relevé pour `scheme_current`.
        fn scheme(&self, s: &str) -> Option<String> {
            if !s.eq_ignore_ascii_case("scheme_current") {
                return Some(s.to_string());
            }
            if let Some(g) = self.active.borrow().clone() {
                return Some(g);
            }
            let g = run("powercfg.exe", &["/getactivescheme"]).ok().and_then(|o| parse_guid(&o))?;
            *self.active.borrow_mut() = Some(g.clone());
            Some(g)
        }

        /// Le plan actif a pu changer pendant le script.
        pub fn forget_active(&self) {
            *self.active.borrow_mut() = None;
            self.bcd.borrow_mut().clear();
        }

        pub fn restore(&self, probe: &Probe, saved: &Saved) -> Result<(), String> {
            match (probe, saved) {
                (_, Saved::Unknown) => Ok(()),
                (Probe::Reg { key, name }, Saved::Value { kind, data }) => {
                    let k = create(key).ok_or("couldn't open the registry key")?;
                    let bytes = unhex(data);
                    let r = unsafe { RegSetValueExW(k.0, wide(name).as_ptr(), 0, *kind, bytes.as_ptr(), bytes.len() as u32) };
                    (r == ERROR_SUCCESS).then_some(()).ok_or_else(|| format!("couldn't write {name} (error {r})"))
                }
                (Probe::Reg { key, name }, Saved::Absent { created }) => {
                    if let Some(k) = open(key, KEY_ALL_ACCESS) {
                        unsafe { RegDeleteValueW(k.0, wide(name).as_ptr()) };
                    }
                    if let Some(c) = created {
                        prune(key, c);
                    }
                    Ok(())
                }
                (Probe::RegKey { key }, Saved::Key { existed: false }) => {
                    if is_empty(key) {
                        delete_key(key);
                    }
                    Ok(())
                }
                (Probe::RegVals { key }, Saved::Values { values }) => {
                    if values.is_empty() {
                        return Ok(());
                    }
                    let k = create(key).ok_or("couldn't open the registry key")?;
                    for (name, kind, data) in values {
                        let bytes = unhex(data);
                        unsafe { RegSetValueExW(k.0, wide(name).as_ptr(), 0, *kind, bytes.as_ptr(), bytes.len() as u32) };
                    }
                    Ok(())
                }
                (Probe::RegTree { .. }, Saved::Tree { file }) => run("reg.exe", &["import", file]).map(|_| ()),
                (Probe::Bcd { store, name }, Saved::Bcd { value }) => {
                    let r = match (name.as_str(), value) {
                        ("timeout", Some(v)) => run("bcdedit.exe", &["/timeout", v.trim()]),
                        ("timeout", None) => Ok(String::new()),
                        (_, Some(v)) => run("bcdedit.exe", &["/set", store, name, &bcd_value(v)]),
                        (_, None) => run("bcdedit.exe", &["/deletevalue", store, name]),
                    };
                    // déjà absent : bcdedit répond une erreur, rien à faire
                    r.map(|_| ()).or_else(|e| if value.is_none() { Ok(()) } else { Err(e) })
                }
                (Probe::Task { path }, Saved::Task { enabled: Some(on) }) => {
                    run("schtasks.exe", &["/change", "/tn", path, if *on { "/enable" } else { "/disable" }]).map(|_| ())
                }
                (Probe::Pwr { sub, setting, .. }, Saved::Pwr { scheme, ac, dc }) => {
                    if let Some(v) = ac {
                        run("powercfg.exe", &["/setacvalueindex", scheme, sub, setting, &v.to_string()])?;
                    }
                    if let Some(v) = dc {
                        run("powercfg.exe", &["/setdcvalueindex", scheme, sub, setting, &v.to_string()])?;
                    }
                    run("powercfg.exe", &["/setactive", "scheme_current"]).map(|_| ())
                }
                (Probe::PwrActive, Saved::Active { guid }) => run("powercfg.exe", &["/setactive", guid]).map(|_| ()),
                (Probe::Hib, Saved::Hib { on }) => run("powercfg.exe", &["/hibernate", if *on { "on" } else { "off" }]).map(|_| ()),
                _ => Ok(()),
            }
        }
    }
}

#[cfg(not(windows))]
impl Sys {
    pub fn read(&self, _probe: &Probe) -> Saved {
        Saved::Unknown
    }
    pub fn forget_active(&self) {
        let _ = (&self.bcd, &self.active);
    }
    pub fn restore(&self, _probe: &Probe, _saved: &Saved) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn markers_are_parsed_and_deduplicated() {
        let out = "\
noise\r\n\
@@RAGO reg \"HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\" \"TcpAckFrequency\"\r\n\
@@RAGO reg \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\\" \"tcpackfrequency\"\r\n\
@@RAGO reg \"PNPDeviceID\\Device Parameters\" \"MSISupported\"\r\n\
@@RAGO reg \"\" \"x\"\r\n\
@@RAGO reg \"HKCU\\Control Panel\\Mouse\" \"\"\r\n\
@@RAGO bcd \"{current}\" \"disabledynamictick\"\r\n\
@@RAGO task \"\\Microsoft\\Windows\\Application Experience\\ProgramDataUpdater\"\r\n\
@@RAGO pwr \"scheme_current\" \"sub_processor\" \"CPMINCORES\"\r\n\
@@RAGO pwractive\r\n\
@@RAGO regtree \"HKLM\\SOFTWARE\\Foo\"\r\n";
        let p = parse_markers(out);
        assert_eq!(p.len(), 7, "{p:?}");
        assert_eq!(p[0], Probe::Reg { key: r"HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters".into(), name: "TcpAckFrequency".into() });
        assert_eq!(p[1], Probe::Reg { key: r"HKCU\Control Panel\Mouse".into(), name: "".into() });
        assert_eq!(p[2], Probe::Bcd { store: "{current}".into(), name: "disabledynamictick".into() });
        assert!(matches!(&p[3], Probe::Task { path } if path.ends_with("ProgramDataUpdater")));
        assert_eq!(p[5], Probe::PwrActive);
        assert_eq!(p[6], Probe::RegTree { key: r"HKLM\SOFTWARE\Foo".into() });
    }

    #[test]
    fn windows_outputs_are_read_in_any_language() {
        let bcd = "Chargeur de démarrage Windows\r\n-------------------------------\r\nidentificateur          {current}\r\n\
device                  partition=C:\r\ndisabledynamictick      Oui\r\ntscsyncpolicy           Enhanced\r\n";
        let m = parse_bcd(bcd);
        assert_eq!(m.get("disabledynamictick").map(|v| bcd_value(v)), Some("yes".into()));
        assert_eq!(m.get("tscsyncpolicy").map(String::as_str), Some("Enhanced"));
        assert!(!m.contains_key("useplatformclock"));
        assert_eq!(bcd_value("Nein"), "no");

        let pwr = "GUID du mode de gestion de l'alimentation : 381b4222-f694-41f0-9685-ff5bb260df2e  (Utilisation normale)\r\n\
  GUID du sous-groupe : 54533251-82be-4824-96c1-47b60b740d00  (Gestion de l'alimentation du processeur)\r\n\
    GUID du paramètre d'alimentation : 0cc5b647-c1df-4637-891a-dec35c318583  (Nombre minimal de cœurs)\r\n\
      Paramètre minimal possible : 0x00000000\r\n      Paramètre maximal possible : 0x00000064\r\n\
      Incrément des paramètres possibles : 0x00000001\r\n      Unités des paramètres possibles : %\r\n\
    Index de paramètre d'alimentation secteur actuel : 0x00000005\r\n\
    Index de paramètre d'alimentation sur batterie actuel : 0x0000000a\r\n";
        assert_eq!(parse_pwr(pwr), (Some(5), Some(10)));
        assert_eq!(parse_pwr("Paramètre non valide"), (None, None));
        assert_eq!(parse_guid(pwr).as_deref(), Some("381b4222-f694-41f0-9685-ff5bb260df2e"));

        let task = "<Task><Triggers><TimeTrigger><Enabled>false</Enabled></TimeTrigger></Triggers><Settings>\n<Enabled>false</Enabled>\n</Settings></Task>";
        assert_eq!(task_enabled(task), Some(false));
        assert_eq!(task_enabled("<Task><Triggers><Enabled>false</Enabled></Triggers><Settings><Hidden>true</Hidden></Settings></Task>"), Some(true));
        let utf16: Vec<u8> = [0xFF, 0xFE].into_iter().chain("<Settings>".encode_utf16().flat_map(|u| u.to_le_bytes())).collect();
        assert_eq!(decode_text(&utf16), "<Settings>");
        assert_eq!(unhex(&hex(&[0, 1, 0xab, 0xff])), vec![0, 1, 0xab, 0xff]);
    }

    fn reg(name: &str) -> Probe {
        Probe::Reg { key: r"HKLM\SOFTWARE\Test".into(), name: name.into() }
    }

    #[test]
    fn shared_values_come_back_with_the_last_tweak() {
        let mut l = Ledger::default();
        let (a, b, c) = (reg("A"), reg("Shared"), reg("C"));
        // réglage 1 touche A et Shared ; réglage 2 touche Shared et C
        l.record_before(a.clone(), Saved::Value { kind: 4, data: "01000000".into() });
        l.record_before(b.clone(), Saved::Value { kind: 4, data: "14000000".into() });
        l.set_applied("one", None, true, true, vec![a.id(), b.id()], 1);
        // Shared est déjà relevé : sa valeur d'avant reste celle d'avant le réglage 1
        l.record_before(b.clone(), Saved::Value { kind: 4, data: "00000000".into() });
        l.record_before(c.clone(), Saved::Absent { created: None });
        l.set_applied("two", None, true, true, vec![b.id(), c.id()], 2);
        assert_eq!(l.saved.len(), 3);

        let peek: Vec<Probe> = l.releasable("one").into_iter().map(|e| e.probe).collect();
        let back = l.release("one");
        assert_eq!(back.len(), 1, "Shared reste posé tant que le réglage 2 est appliqué");
        assert_eq!(back[0].probe, a);
        assert_eq!(peek, vec![a], "releasable annonce ce que release rend");
        assert_eq!(l.releasable("two").len(), 2);
        assert!(l.tweaks.contains_key("two"), "releasable ne retire rien");
        let back = l.release("two");
        assert_eq!(back.iter().map(|e| e.probe.clone()).collect::<Vec<_>>(), vec![c, b.clone()], "ordre inverse du relevé");
        assert_eq!(back[1].before, Saved::Value { kind: 4, data: "14000000".into() });
        assert!(l.saved.is_empty() && l.tweaks.is_empty());
        assert!(l.release("two").is_empty());
    }

    #[test]
    fn drift_is_seen_on_registry_values() {
        let mut l = Ledger::default();
        l.record_before(reg("A"), Saved::Absent { created: None });
        l.set_after(&reg("A").id(), Saved::Value { kind: 4, data: "01000000".into() });
        l.set_applied("one", None, true, true, vec![reg("A").id()], 1);
        let same = l.views(&|_| Saved::Value { kind: 4, data: "01000000".into() });
        assert!(!same[0].drift);
        let changed = l.views(&|_| Saved::Absent { created: None });
        assert!(changed[0].drift);
    }

    #[test]
    fn ledger_survives_a_restart() {
        let path = std::env::temp_dir().join(format!("rago-ledger-{}.json", std::process::id()));
        let (mut l, existed) = Ledger::load(path.clone());
        assert!(!existed);
        l.record_before(reg("A"), Saved::Value { kind: 1, data: "6100".into() });
        l.set_applied("one", Some("v".into()), true, true, vec![reg("A").id()], 5);
        l.save();
        let (l2, existed) = Ledger::load(path.clone());
        assert!(existed);
        assert_eq!(l2.tweaks["one"].variant.as_deref(), Some("v"));
        assert_eq!(l2.saved[0].1.before, Saved::Value { kind: 1, data: "6100".into() });
        let _ = fs::remove_file(path);
    }

    /// applied.json illisible (coupé par une coupure de courant, vide, ou qui ne se lit pas) : mis de côté avec ses
    /// états d'avant, jamais écrasé par le registre neuf (déjà présent en 1.1.9 : tout était perdu).
    #[test]
    fn unreadable_ledger_is_set_aside_not_overwritten() {
        let dir = std::env::temp_dir().join(format!("rago-bad-ledger-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("applied.json");
        let aside = || -> Vec<PathBuf> {
            fs::read_dir(&dir).unwrap().flatten().map(|e| e.path()).filter(|p| p.to_string_lossy().contains("applied.json.bad-")).collect()
        };
        for (case, content) in [("coupé", &br#"{"tweaks":{"net_a":{"variant":null,"ts":1,"ok":true,"backup":true,"probes":["reg:"#[..]), ("vide", &b""[..])] {
            fs::write(&path, content).unwrap();
            let (mut l, existed) = Ledger::load(path.clone());
            assert!(!existed, "{case}");
            let kept = aside();
            assert_eq!(kept.len(), 1, "{case} : mis de côté");
            assert_eq!(fs::read(&kept[0]).unwrap(), content, "{case} : tel quel");
            l.set_applied("net_b", None, true, true, vec![], 2);
            l.save();
            assert!(Ledger::load(path.clone()).1, "{case} : registre neuf lisible");
            assert_eq!(fs::read(&kept[0]).unwrap(), content, "{case} : jamais écrasé");
            assert!(!dir.join("applied.json.tmp").exists());
            fs::remove_file(&kept[0]).unwrap();
        }
        // ne se lit pas du tout (ici un dossier à sa place) : mis de côté lui aussi, avec ce qu'il contient
        fs::remove_file(&path).unwrap();
        fs::create_dir_all(path.join("x")).unwrap();
        let (l, existed) = Ledger::load(path.clone());
        assert!(!existed);
        assert!(aside().iter().any(|p| p.join("x").exists()));
        l.save();
        assert!(Ledger::load(path.clone()).1);
        let log = fs::read_to_string(dir.join("logs").join("repairs.log")).unwrap();
        assert_eq!(log.lines().filter(|l| l.contains("applied.json") && l.contains("kept as")).count(), 3, "{log}");
        let _ = fs::remove_dir_all(&dir);
    }

    /// Fichier d'avant qui n'a pu être ni lu ni renommé au lancement (verrou) : l'enregistrement le met d'abord de côté,
    /// et ne l'écrase jamais (s'il ne peut toujours pas être renommé, rien n'est écrit ; non simulable ici).
    #[test]
    fn unread_ledger_is_set_aside_before_any_save() {
        use std::sync::atomic::Ordering;
        let dir = std::env::temp_dir().join(format!("rago-unread-ledger-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("applied.json");
        fs::write(&path, "ancien").unwrap();
        let l = Ledger { path: path.clone(), ..Default::default() };
        l.unread.store(true, Ordering::SeqCst);
        l.save();
        let aside: Vec<_> = fs::read_dir(&dir).unwrap().flatten().map(|e| e.path()).filter(|p| p.to_string_lossy().contains(".bad-")).collect();
        assert_eq!(aside.len(), 1);
        assert_eq!(fs::read_to_string(&aside[0]).unwrap(), "ancien");
        assert!(Ledger::load(path).1, "registre neuf écrit après");
        assert!(!l.unread.load(Ordering::SeqCst));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn undo_copy_is_kept_and_follows_the_variant() {
        let dir = std::env::temp_dir().join(format!("rago-undo-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let (mut l, _) = Ledger::load(dir.join("applied.json"));
        l.set_applied("net_x", Some("a".into()), true, true, vec![], 1);
        let lookup = |id: &str, v: Option<&str>| Some(Undo { full: Some(format!("{id}:{}", v.unwrap_or("_"))), ..Default::default() });
        assert!(l.fill_undo(&lookup));
        assert!(!l.fill_undo(&lookup), "déjà gardée");
        // scripts fermés (plus de licence) : la copie reste
        assert!(!l.fill_undo(&|_, _| None));
        assert_eq!(l.tweaks["net_x"].undo.as_ref().unwrap().full.as_deref(), Some("net_x:a"));
        l.save();
        let (back, _) = Ledger::load(dir.join("applied.json"));
        assert_eq!(back.tweaks["net_x"].undo, l.tweaks["net_x"].undo);
        // autre variante : l'annulation de l'ancienne ne vaut plus
        l.set_applied("net_x", Some("b".into()), true, true, vec![], 2);
        assert!(l.tweaks["net_x"].undo.is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    /// Copie gardée par une version d'avant (1.1.9, 1.1.10) : remplacée par l'annulation de cette version dès qu'elle
    /// est connue, gardée telle quelle sinon (scripts Premium fermés).
    #[test]
    fn old_undo_copy_is_refreshed() {
        let mut l = Ledger::default();
        l.set_applied("in_x", None, true, true, vec![], 1);
        let old = Undo { rest: Some("reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\" /v CoalescingTimerInterval /d 0".into()), ..Default::default() };
        l.tweaks.get_mut("in_x").unwrap().undo = Some(old.clone());
        // scripts fermés : rien à mettre à la place
        assert!(!l.fill_undo(&|_, _| None));
        assert_eq!(l.tweaks["in_x"].undo, Some(old));
        let new = Undo { rest: Some("echo ok".into()), ..Default::default() };
        assert!(l.fill_undo(&|_, _| Some(new.clone())));
        assert_eq!(l.tweaks["in_x"].undo, Some(new.clone()));
        assert!(!l.fill_undo(&|_, _| Some(new.clone())), "déjà à jour : rien ne change, rien à enregistrer");
    }

    #[test]
    fn ledger_never_written_in_clear_when_dpapi_fails() {
        let json = r#"{"tweaks":{"net_x":{"undo":{"full":"netsh int tcp reset"}}}}"#;
        let bytes = encode(json, None);
        assert!(!bytes.windows(5).any(|w| w == b"netsh"), "pas de commande en clair sur le disque");
        assert_eq!(decode(&bytes), (json.to_string(), true));
        let mut bad = bytes.clone();
        let n = bad.len() - 1;
        bad[n] ^= 1;
        assert_ne!(decode(&bad).0, json, "un fichier modifié n'est pas relu comme valide");
    }

    // Le chiffrement au repos est DPAPI, propre à Windows (ailleurs le coffre laisse passer en clair).
    #[cfg(windows)]
    #[test]
    fn reads_legacy_plaintext_ledger_then_reseals() {
        let dir = std::env::temp_dir().join(format!("rago-legacy-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("applied.json");
        // simule un fichier d'une version d'avant le chiffrement : du JSON en clair sur le disque
        let mut old = Ledger::default();
        old.set_applied("net_x", Some("a".into()), true, true, vec![], 1);
        old.tweaks.get_mut("net_x").unwrap().undo = Some(Undo { full: Some("netsh int tcp reset".into()), ..Default::default() });
        fs::write(&path, serde_json::to_string(&old).unwrap()).unwrap();

        let (loaded, existed) = Ledger::load(path.clone());
        assert!(existed);
        assert!(loaded.needs_migration(), "un fichier en clair doit être repéré");
        assert_eq!(loaded.tweaks["net_x"].undo.as_ref().unwrap().full.as_deref(), Some("netsh int tcp reset"));

        // la migration réécrit chiffré
        loaded.save();
        let raw = fs::read(&path).unwrap();
        assert!(!raw.windows(5).any(|w| w == b"netsh"), "le fichier chiffré ne doit pas contenir la commande en clair");

        let (back, _) = Ledger::load(path.clone());
        assert!(!back.needs_migration(), "déjà chiffré");
        assert_eq!(back.tweaks["net_x"].undo, loaded.tweaks["net_x"].undo);
        let _ = fs::remove_dir_all(&dir);
    }
}
