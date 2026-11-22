//! « Analyze my PC » (1.3.0) : ce que Windows dit du PC, lu sans rien changer. L'interface y ajoute le test réseau
//! (nettest.rs), la charge du processeur (stats.rs), l'âge du pilote graphique (tools.rs) et la dernière partie
//! (fps.rs), puis compare chaque valeur à sa norme et dit ce qui la règle : le plan gratuit, Premium, ou le joueur.

use serde::{Deserialize, Serialize};

use crate::session::Check;

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Facts {
    /// fréquence de l'écran principal, et la plus haute qu'il accepte à cette définition (Hz)
    pub refresh: Option<u32>,
    pub refresh_max: Option<u32>,
    /// processus en cours
    pub processes: Option<u32>,
    /// vitesse de la mémoire : celle réglée, et celle prévue par les barrettes (MT/s)
    pub mem_speed: Option<u32>,
    pub mem_rated: Option<u32>,
    /// connexion par câble (false : Wi-Fi ; None : inconnu)
    pub wired: Option<bool>,
    /// Game DVR (enregistrement en arrière-plan de la Xbox Game Bar) actif
    pub game_dvr: Option<bool>,
    /// notifications de Windows actives
    pub notifications: Option<bool>,
    /// mode d'alimentation actif (GUID)
    pub power_scheme: Option<String>,
    /// téléchargements, synchronisation ou enregistrement qui tournent (mêmes listes que la session de jeu)
    pub background: Vec<Check>,
}

/// Sortie du script PowerShell : tout ce qui manque reste None.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct Raw {
    mem_speed: Option<u32>,
    mem_configured: Option<u32>,
    media: Option<String>,
    dvr: Option<u32>,
    capture: Option<u32>,
    toast: Option<u32>,
    scheme: Option<String>,
}

#[cfg_attr(not(windows), allow(dead_code))]
const SCRIPT: &str = r#"$m = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue);
$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1;
$a = if ($r) { Get-NetAdapter -InterfaceIndex $r.ifIndex -ErrorAction SilentlyContinue };
$g = Get-ItemProperty 'HKCU:\System\GameConfigStore' -ErrorAction SilentlyContinue;
$c = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -ErrorAction SilentlyContinue;
$t = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications' -ErrorAction SilentlyContinue;
[pscustomobject]@{
  memSpeed = ($m | Measure-Object -Property Speed -Maximum).Maximum;
  memConfigured = ($m | Where-Object { $_.ConfiguredClockSpeed -gt 0 } | Measure-Object -Property ConfiguredClockSpeed -Minimum).Minimum;
  media = $a.PhysicalMediaType;
  dvr = $g.GameDVR_Enabled; capture = $c.AppCaptureEnabled; toast = $t.ToastEnabled;
  scheme = (powercfg /getactivescheme) -join ' '
} | ConvertTo-Json -Compress"#;

/// Lit la sortie du script (testé hors Windows).
fn from_raw(raw: Raw) -> Facts {
    let media = raw.media.unwrap_or_default().to_lowercase();
    Facts {
        mem_speed: raw.mem_configured.filter(|v| *v > 0),
        mem_rated: raw.mem_speed.filter(|v| *v > 0),
        wired: if media.contains("802.3") {
            Some(true)
        } else if media.contains("802.11") || media.contains("wireless") {
            Some(false)
        } else {
            None
        },
        // Game DVR : absent vaut actif (réglage par défaut de Windows) ; l'un des deux à 0 le coupe
        game_dvr: Some(raw.dvr != Some(0) && raw.capture != Some(0)),
        notifications: Some(raw.toast != Some(0)),
        power_scheme: raw.scheme.as_deref().and_then(crate::session::parse_scheme),
        ..Facts::default()
    }
}

pub fn facts() -> Facts {
    let procs = crate::games::process_paths();
    let mut f = read();
    f.processes = (!procs.is_empty()).then_some(procs.len() as u32);
    f.background = crate::session::checks(&procs, false);
    let (cur, max) = refresh();
    f.refresh = cur;
    f.refresh_max = max;
    f
}

/// Fréquence actuelle de l'écran principal et la plus haute qu'il accepte à cette définition (aussi lue pendant une
/// partie, tips.rs).
pub fn refresh() -> (Option<u32>, Option<u32>) {
    win::refresh()
}

#[cfg(windows)]
fn read() -> Facts {
    let raw = crate::shell::powershell(SCRIPT).and_then(|out| serde_json::from_str::<Raw>(&out).ok()).unwrap_or_default();
    from_raw(raw)
}

#[cfg(not(windows))]
fn read() -> Facts {
    Facts::default()
}

#[cfg(windows)]
mod win {
    use windows_sys::Win32::Graphics::Gdi::{EnumDisplaySettingsW, DEVMODEW, ENUM_CURRENT_SETTINGS};

    fn mode(i: u32) -> Option<DEVMODEW> {
        let mut dm: DEVMODEW = unsafe { std::mem::zeroed() };
        dm.dmSize = std::mem::size_of::<DEVMODEW>() as u16;
        (unsafe { EnumDisplaySettingsW(std::ptr::null(), i, &mut dm) } != 0).then_some(dm)
    }

    /// Fréquence actuelle de l'écran principal, et la plus haute qu'il propose à la même définition.
    pub fn refresh() -> (Option<u32>, Option<u32>) {
        let Some(cur) = mode(ENUM_CURRENT_SETTINGS) else { return (None, None) };
        let mut max = cur.dmDisplayFrequency;
        let mut i = 0;
        while let Some(m) = mode(i) {
            if m.dmPelsWidth == cur.dmPelsWidth && m.dmPelsHeight == cur.dmPelsHeight {
                max = max.max(m.dmDisplayFrequency);
            }
            i += 1;
            if i > 2000 {
                break;
            }
        }
        // 0 et 1 : « fréquence par défaut du matériel », inconnue
        let ok = |v: u32| (v > 1).then_some(v);
        (ok(cur.dmDisplayFrequency), ok(max))
    }
}

#[cfg(not(windows))]
mod win {
    pub fn refresh() -> (Option<u32>, Option<u32>) {
        (None, None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_script() {
        let raw: Raw = serde_json::from_str(
            r#"{"memSpeed":6000,"memConfigured":4800,"media":"802.3","dvr":1,"capture":null,"toast":0,"scheme":"GUID du mode de gestion de l'alimentation : 381b4222-f694-41f0-9685-ff5bb260df2e  (Utilisation normale)"}"#,
        )
        .unwrap();
        let f = from_raw(raw);
        assert_eq!((f.mem_speed, f.mem_rated), (Some(4800), Some(6000)));
        assert_eq!(f.wired, Some(true));
        assert_eq!(f.game_dvr, Some(true));
        assert_eq!(f.notifications, Some(false));
        assert_eq!(f.power_scheme.as_deref(), Some(crate::session::BALANCED));

        let f = from_raw(serde_json::from_str(r#"{"media":"Native 802.11","dvr":0}"#).unwrap());
        assert_eq!(f.wired, Some(false));
        assert_eq!(f.game_dvr, Some(false));
        assert_eq!(f.notifications, Some(true));
        assert_eq!(f.mem_speed, None);
    }
}
