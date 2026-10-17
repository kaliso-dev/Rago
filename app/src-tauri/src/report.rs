//! Rapport pour le support (RAG-70, page « Partage et support ») : un fichier texte que le joueur joint à son ticket
//! Discord. Rien n'est envoyé par Rago Optimizer : le fichier est écrit dans `reports\` et le joueur le voit avant de le
//! partager.
//!
//! Ce qui identifie le joueur est masqué partout, journaux compris : nom du compte Windows et chemin de son profil, nom
//! du PC, adresses e-mail, clés de licence, adresses IP et MAC. L'e-mail du compte et la clé ne sont jamais lus.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::backup::AppliedView;
use crate::history::Entry;
use crate::system::SystemInfo;

/// Parties cochées sur la page (le PC, les réglages, l'historique et les journaux le sont d'office, la carte réseau non).
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Parts {
    pub pc: bool,
    pub tweaks: bool,
    pub history: bool,
    pub logs: bool,
    pub network: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub text: String,
}

/// Ce que le rapport met dans ses parties ; rassemblé par lib.rs (état de l'app), écrit ici.
pub struct Input<'a> {
    pub version: &'a str,
    pub server: &'a str,
    pub license: &'a str,
    pub sys: Option<&'a SystemInfo>,
    pub applied: &'a [AppliedView],
    pub history: &'a [Entry],
    pub logs_dir: &'a Path,
}

const HISTORY_LINES: usize = 50;
const LOG_FILES: usize = 3;
/// lignes gardées à la fin de chaque journal
const LOG_TAIL: usize = 300;

/// Date UTC lisible (AAAA-MM-JJ HH:MM) d'un horodatage en millisecondes, sans dépendance de calendrier.
pub fn utc(ms: u64) -> String {
    let secs = ms / 1000;
    let (days, rem) = (secs / 86_400, secs % 86_400);
    // algorithme « civil from days » (Howard Hinnant)
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02} {:02}:{:02}", rem / 3600, rem % 3600 / 60)
}

/// Masque ce qui identifie le joueur : noms du compte Windows (et du dossier de profil) et du PC, en mots entiers et sans
/// tenir compte de la casse, puis e-mails, clés de licence `RAGO-…`, adresses IPv4 et MAC.
pub fn mask(text: &str, users: &[String], hosts: &[String]) -> String {
    // le plus long d'abord : « PC-SOFIENE » est masqué comme nom du PC avant que « Sofiene » n'en prenne la moitié
    let mut names: Vec<(&String, &str)> = users.iter().map(|u| (u, "<user>")).chain(hosts.iter().map(|h| (h, "<pc>"))).collect();
    names.sort_by_key(|(n, _)| std::cmp::Reverse(n.len()));
    let mut out = text.to_string();
    for (name, label) in names.into_iter().filter(|(n, _)| n.chars().count() >= 2) {
        out = replace_word_ci(&out, name, label);
    }
    let out = mask_tokens(&out);
    mask_numbers(&out)
}

/// Remplace `needle` là où c'est un mot entier (ni lettre ni chiffre juste avant ou après) : « Tom » ne touche pas à
/// « Custom ».
fn replace_word_ci(text: &str, needle: &str, with: &str) -> String {
    let lower = text.to_lowercase();
    let n = needle.to_lowercase();
    // to_lowercase peut changer la longueur de certains caractères : on ne remplace que si elle est gardée
    if lower.len() != text.len() || n.is_empty() {
        return text.replace(needle, with);
    }
    let alnum_before = |at: usize| text[..at].chars().next_back().is_some_and(char::is_alphanumeric);
    let alnum_after = |at: usize| text[at..].chars().next().is_some_and(char::is_alphanumeric);
    let mut out = String::with_capacity(text.len());
    let (mut i, mut copied) = (0, 0);
    while let Some(pos) = lower[i..].find(&n) {
        let at = i + pos;
        let end = at + n.len();
        if !alnum_before(at) && !alnum_after(end) {
            out.push_str(&text[copied..at]);
            out.push_str(with);
            copied = end;
        }
        i = at + lower[at..].chars().next().map_or(1, char::len_utf8);
    }
    out.push_str(&text[copied..]);
    out
}

/// E-mails et clés de licence, mot par mot (un mot = suite sans espace ni guillemet ni chevron).
fn mask_tokens(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut word = String::new();
    let flush = |word: &mut String, out: &mut String| {
        if !word.is_empty() {
            let trimmed = word.trim_matches(|c: char| ",;:()[]{}.".contains(c));
            let masked = if is_email(trimmed) {
                Some("<email>")
            } else if trimmed.to_uppercase().starts_with("RAGO-") && trimmed.matches('-').count() >= 3 && trimmed.len() >= 20 {
                Some("<license key>")
            } else {
                None
            };
            match masked {
                Some(m) => out.push_str(&word.replacen(trimmed, m, 1)),
                None => out.push_str(word),
            }
            word.clear();
        }
    };
    for c in text.chars() {
        if c.is_whitespace() || "\"'<>".contains(c) {
            flush(&mut word, &mut out);
            out.push(c);
        } else {
            word.push(c);
        }
    }
    flush(&mut word, &mut out);
    out
}

fn is_email(w: &str) -> bool {
    let Some((local, domain)) = w.split_once('@') else { return false };
    !local.is_empty()
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && local.chars().all(|c| c.is_alphanumeric() || "._%+-".contains(c))
        && domain.chars().all(|c| c.is_alphanumeric() || ".-".contains(c))
}

/// Adresses IPv4 (a.b.c.d, chaque nombre ≤ 255) et MAC (6 paires hexadécimales séparées par « - » ou « : »).
fn mask_numbers(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < chars.len() {
        let boundary = i == 0 || !(chars[i - 1].is_ascii_alphanumeric() || chars[i - 1] == '.');
        if boundary {
            if let Some(len) = mac_at(&chars[i..]) {
                out.push_str("<mac>");
                i += len;
                continue;
            }
            if let Some(len) = ipv4_at(&chars[i..]) {
                out.push_str("<ip>");
                i += len;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn ipv4_at(s: &[char]) -> Option<usize> {
    let mut i = 0;
    for part in 0..4 {
        let start = i;
        while i < s.len() && s[i].is_ascii_digit() && i - start < 3 {
            i += 1;
        }
        if i == start || s[start..i].iter().collect::<String>().parse::<u16>().ok()? > 255 {
            return None;
        }
        if part < 3 {
            if s.get(i) != Some(&'.') {
                return None;
            }
            i += 1;
        }
    }
    // pas un numéro de version plus long (1.2.3.4.5) ni collé à une lettre
    match s.get(i) {
        Some(c) if c.is_ascii_alphanumeric() || (*c == '.' && s.get(i + 1).is_some_and(|d| d.is_ascii_digit())) => None,
        _ => Some(i),
    }
}

fn mac_at(s: &[char]) -> Option<usize> {
    let sep = *s.get(2)?;
    if sep != '-' && sep != ':' {
        return None;
    }
    for pair in 0..6 {
        let at = pair * 3;
        if !(s.get(at)?.is_ascii_hexdigit() && s.get(at + 1)?.is_ascii_hexdigit()) {
            return None;
        }
        if pair < 5 && s.get(at + 2) != Some(&sep) {
            return None;
        }
    }
    match s.get(17) {
        Some(c) if c.is_ascii_hexdigit() || *c == sep => None,
        _ => Some(17),
    }
}

fn yes(b: bool) -> &'static str {
    if b {
        "yes"
    } else {
        "no"
    }
}

/// Texte du rapport, avant masquage.
pub fn build(input: &Input, parts: Parts, now_ms: u64) -> String {
    let mut s = String::new();
    let mut line = |l: String| {
        s.push_str(&l);
        s.push('\n');
    };
    line("Rago Optimizer support report".into());
    line(format!("Created: {} UTC", utc(now_ms)));
    line(format!("App: {} ({})", input.version, input.server));
    line(format!("License: {}", input.license));
    line("Hidden in this file: your Windows user name, PC name, emails, license key, IP and MAC addresses.".into());

    if parts.pc {
        line(String::new());
        line("== PC ==".into());
        match input.sys {
            Some(sys) => {
                line(format!("Windows: {} (build {}{})", sys.os_name, sys.os_build, if sys.is_win11 { ", Windows 11" } else { "" }));
                line(format!("Processor: {} ({} cores, {} threads)", sys.cpu_name, sys.cpu_cores, sys.cpu_threads));
                let gpus: Vec<&str> = sys.gpus.iter().map(|g| g.name.as_str()).collect();
                line(format!("Graphics: {}", if gpus.is_empty() { "-".to_string() } else { gpus.join(" + ") }));
                line(format!("Memory: {} GB", sys.ram_gb));
                line(format!("Administrator: {}", yes(sys.is_admin)));
                line(format!("WMIC: {}", yes(sys.has_wmic)));
                line(format!("Optional files: {}", if sys.resources.is_empty() { "-".to_string() } else { sys.resources.join(", ") }));
                line(format!("Minecraft folder found: {}", yes(sys.minecraft_dir.is_some())));
            }
            None => line("Not read yet".into()),
        }
    }

    if parts.network {
        line(String::new());
        line("== Network adapter ==".into());
        match input.sys {
            Some(sys) => {
                line(format!("Name: {}", sys.adapter.as_deref().unwrap_or("-")));
                line(format!("Model: {}", sys.adapter_desc.as_deref().unwrap_or("-")));
                line(format!("Link speed: {}", sys.link_speed.as_deref().unwrap_or("-")));
            }
            None => line("Not read yet".into()),
        }
    }

    if parts.tweaks {
        line(String::new());
        line(format!("== Tweaks applied ({}) ==", input.applied.len()));
        let mut applied: Vec<&AppliedView> = input.applied.iter().collect();
        applied.sort_by(|a, b| b.ts.cmp(&a.ts).then(a.id.cmp(&b.id)));
        for a in applied {
            let variant = a.variant.as_deref().map(|v| format!(":{v}")).unwrap_or_default();
            let notes = [
                (!a.ok).then_some("failed"),
                (!a.backup).then_some("no backup"),
                a.drift.then_some("changed by Windows since"),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(", ");
            line(format!("{}  {}{}{}", utc(a.ts), a.id, variant, if notes.is_empty() { String::new() } else { format!("  [{notes}]") }));
        }
    }

    if parts.history {
        line(String::new());
        line(format!("== Last {HISTORY_LINES} changes ==",));
        let mut history: Vec<&Entry> = input.history.iter().collect();
        history.sort_by(|a, b| b.ts.cmp(&a.ts));
        for e in history.into_iter().take(HISTORY_LINES) {
            let variant = e.variant.as_deref().map(|v| format!(":{v}")).unwrap_or_default();
            let code = e.code.map(|c| format!(" code {c}")).unwrap_or_default();
            line(format!(
                "{}  {:<5} {:<5} {}{}  {:.1} s{}",
                utc(e.ts),
                if e.ok { "OK" } else { "ERROR" },
                if e.undo { "undo" } else { "apply" },
                e.id,
                variant,
                e.duration_ms as f64 / 1000.0,
                code
            ));
        }
    }

    if parts.logs {
        line(String::new());
        line(format!("== Last {LOG_FILES} optimization logs ==",));
        let mut logs: Vec<(std::time::SystemTime, PathBuf)> = fs::read_dir(input.logs_dir)
            .into_iter()
            .flatten()
            .filter_map(|e| {
                let e = e.ok()?;
                let path = e.path();
                (path.extension()? == "log").then_some(())?;
                Some((e.metadata().ok()?.modified().ok()?, path))
            })
            .collect();
        logs.sort_by(|a, b| b.0.cmp(&a.0));
        if logs.is_empty() {
            line("No optimization yet".into());
        }
        for (_, path) in logs.into_iter().take(LOG_FILES) {
            let body = fs::read(&path).map(|b| String::from_utf8_lossy(&b).into_owned()).unwrap_or_default();
            let lines: Vec<&str> = body.lines().collect();
            let skip = lines.len().saturating_sub(LOG_TAIL);
            line(format!("--- {} ---", path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()));
            if skip > 0 {
                line(format!("({skip} earlier lines left out)"));
            }
            for l in &lines[skip..] {
                line((*l).to_string());
            }
        }
    }
    s
}

/// Écrit le rapport masqué dans `dir` (rago-report-AAAA-MM-JJ-HHMM.txt) ; garde les 10 derniers.
pub fn write(dir: &Path, text: &str, now_ms: u64) -> Result<Report, String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let stamp = utc(now_ms).replace(' ', "-").replace(':', "");
    let name = format!("rago-report-{stamp}.txt");
    let path = dir.join(&name);
    // BOM : le Bloc-notes de Windows 10 reconnaît l'UTF-8 (accents des noms de réglages)
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice(text.replace('\n', "\r\n").as_bytes());
    fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    let mut old: Vec<PathBuf> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.file_name().is_some_and(|n| n.to_string_lossy().starts_with("rago-report-")))
        .collect();
    old.sort();
    while old.len() > 10 {
        let _ = fs::remove_file(old.remove(0));
    }
    Ok(Report { path: path.to_string_lossy().into_owned(), name, size: bytes.len() as u64, text: text.to_string() })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates_are_utc() {
        assert_eq!(utc(0), "1970-01-01 00:00");
        assert_eq!(utc(1_760_729_400_000), "2025-10-17 19:30");
        assert_eq!(utc(951_782_400_000), "2000-02-29 00:00");
    }

    #[test]
    fn masks_what_identifies_the_player() {
        let raw = "C:\\Users\\Sofiene\\AppData PC-SOFIENE mail: kaliso@rago.gg key RAGO-9EGJN-ABCDE-FGHIJ-VKXDS \
                   ip 192.168.1.24, gw 10.0.0.1 mac 0A-1B-2C-3D-4E-5F build 10.0.26100.1 v1.2.0";
        let out = mask(raw, &["sofiene".into()], &["pc-sofiene".into()]);
        assert!(out.contains("C:\\Users\\<user>\\AppData"), "{out}");
        assert!(out.contains("<pc>") && !out.to_lowercase().contains("sofiene"), "{out}");
        assert!(out.contains("<email>") && !out.contains("kaliso@"), "{out}");
        assert!(out.contains("<license key>") && !out.contains("VKXDS"), "{out}");
        assert!(out.contains("ip <ip>, gw <ip>"), "{out}");
        assert!(out.contains("mac <mac>"), "{out}");
        // un numéro de version reste lisible
        assert!(out.contains("10.0.26100.1") && out.contains("v1.2.0"), "{out}");
        // mot entier seulement
        assert_eq!(mask("Custom tom", &["Tom".into()], &[]), "Custom <user>");
    }

    #[test]
    fn report_has_the_parts_asked() {
        let dir = std::env::temp_dir().join(format!("rago-report-test-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        fs::write(dir.join("1.log"), "==== net_x\nline one\n").unwrap();
        let sys = SystemInfo { os_name: "Windows 11 Pro".into(), os_build: 26100, cpu_name: "CPU".into(), ram_gb: 16, ..Default::default() };
        let input = Input { version: "1.2.0", server: "production", license: "free", sys: Some(&sys), applied: &[], history: &[], logs_dir: &dir };
        let all = Parts { pc: true, tweaks: true, history: true, logs: true, network: false };
        let text = build(&input, all, 0);
        assert!(text.contains("== PC ==") && text.contains("build 26100") && text.contains("line one"));
        assert!(!text.contains("== Network adapter =="));
        let r = write(&dir, &text, 0).unwrap();
        assert_eq!(r.name, "rago-report-1970-01-01-0000.txt");
        assert!(fs::read(&r.path).unwrap().starts_with(&[0xEF, 0xBB, 0xBF]));
        let _ = fs::remove_dir_all(&dir);
    }
}
