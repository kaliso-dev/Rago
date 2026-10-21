//! Recherche Rago : ce qui ne dépend pas de Windows, testé partout. Comparaison des noms (sans accents ni majuscules),
//! petite calculatrice et liste des pages des Paramètres de Windows.

/// Minuscules sans accents : « Paramètres » et « parametres » se valent.
pub fn fold(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars().flat_map(char::to_lowercase) {
        let plain = match c {
            'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' => 'a',
            'ç' => 'c',
            'è' | 'é' | 'ê' | 'ë' => 'e',
            'ì' | 'í' | 'î' | 'ï' => 'i',
            'ñ' => 'n',
            'ò' | 'ó' | 'ô' | 'õ' | 'ö' => 'o',
            'ù' | 'ú' | 'û' | 'ü' => 'u',
            'ý' | 'ÿ' => 'y',
            'œ' => {
                out.push('o');
                'e'
            }
            '’' => '\'',
            c => c,
        };
        out.push(plain);
    }
    out
}

fn words(s: &str) -> impl Iterator<Item = &str> {
    s.split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty())
}

/// Note d'un nom pour la recherche (`query` déjà passée par `fold`) ; None : il ne correspond pas. Nom exact, puis
/// début du nom, début d'un mot, initiales (« vsc » : Visual Studio Code), morceau du nom, lettres dans l'ordre.
pub fn score(name: &str, query: &str) -> Option<u32> {
    let q = query.trim();
    if q.is_empty() {
        return Some(1);
    }
    let n = fold(name);
    // plus le nom est court, mieux il correspond
    let short = 40u32.saturating_sub(n.chars().count() as u32).min(40);
    if n == q {
        return Some(1000);
    }
    if n.starts_with(q) {
        return Some(900 + short);
    }
    let tokens: Vec<&str> = q.split_whitespace().collect();
    if tokens.len() > 1 {
        // chaque mot de la recherche commence un mot du nom, ou au moins s'y trouve
        let starts = tokens.iter().all(|t| words(&n).any(|w| w.starts_with(t)));
        if starts {
            return Some(780 + short);
        }
        if tokens.iter().all(|t| n.contains(t)) {
            return Some(560 + short);
        }
        return None;
    }
    if words(&n).any(|w| w.starts_with(q)) {
        return Some(800 + short);
    }
    let initials: String = words(&n).filter_map(|w| w.chars().next()).collect();
    if q.chars().count() >= 2 && initials.starts_with(q) {
        return Some(700 + short);
    }
    if n.contains(q) {
        return Some(600 + short);
    }
    // lettres dans l'ordre, au moins trois, et pas trop éparpillées
    if q.chars().count() >= 3 {
        let mut it = n.chars().enumerate();
        let (mut first, mut last) = (None, 0usize);
        for qc in q.chars() {
            match it.by_ref().find(|(_, c)| *c == qc) {
                Some((i, _)) => {
                    first.get_or_insert(i);
                    last = i;
                }
                None => return None,
            }
        }
        let spread = last - first.unwrap_or(0) + 1;
        if spread <= q.chars().count() * 3 {
            return Some(300 + 40u32.saturating_sub(spread as u32));
        }
    }
    None
}

// ——— calculatrice ———

struct Calc<'a> {
    s: &'a [u8],
    i: usize,
}

impl Calc<'_> {
    fn skip(&mut self) {
        while self.i < self.s.len() && self.s[self.i] == b' ' {
            self.i += 1;
        }
    }

    fn peek(&mut self) -> Option<u8> {
        self.skip();
        self.s.get(self.i).copied()
    }

    fn expr(&mut self) -> Option<f64> {
        let mut v = self.term()?;
        while let Some(op @ (b'+' | b'-')) = self.peek() {
            self.i += 1;
            let r = self.term()?;
            v = if op == b'+' { v + r } else { v - r };
        }
        Some(v)
    }

    fn term(&mut self) -> Option<f64> {
        let mut v = self.power()?;
        while let Some(op @ (b'*' | b'/')) = self.peek() {
            self.i += 1;
            let r = self.power()?;
            v = if op == b'*' { v * r } else { v / r };
        }
        Some(v)
    }

    fn power(&mut self) -> Option<f64> {
        let base = self.unary()?;
        if self.peek() == Some(b'^') {
            self.i += 1;
            let e = self.power()?;
            return Some(base.powf(e));
        }
        Some(base)
    }

    fn unary(&mut self) -> Option<f64> {
        match self.peek()? {
            b'-' => {
                self.i += 1;
                Some(-self.unary()?)
            }
            b'+' => {
                self.i += 1;
                self.unary()
            }
            _ => self.primary(),
        }
    }

    fn primary(&mut self) -> Option<f64> {
        let mut v = if self.peek()? == b'(' {
            self.i += 1;
            let v = self.expr()?;
            if self.peek() != Some(b')') {
                return None;
            }
            self.i += 1;
            v
        } else {
            let start = self.i;
            while self.i < self.s.len() && (self.s[self.i].is_ascii_digit() || self.s[self.i] == b'.') {
                self.i += 1;
            }
            std::str::from_utf8(&self.s[start..self.i]).ok()?.parse::<f64>().ok()?
        };
        // 15 % : un pourcentage
        if self.peek() == Some(b'%') {
            self.i += 1;
            v /= 100.0;
        }
        Some(v)
    }
}

/// Résultat d'un calcul tapé dans la recherche (« 12*4,5 », « (3+4)^2 », « 200*15% ») ; None si ce n'en est pas un.
pub fn calc(input: &str) -> Option<f64> {
    let s = input.trim().trim_end_matches('=').trim();
    if !s.chars().any(|c| c.is_ascii_digit()) || !s.chars().any(|c| "+-*/^%x×÷()".contains(c)) {
        return None;
    }
    let mut ascii = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '0'..='9' | '.' | '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')' | ' ' => ascii.push(c),
            ',' => ascii.push('.'),
            'x' | 'X' | '×' => ascii.push('*'),
            '÷' | ':' => ascii.push('/'),
            '\u{202F}' | '\u{A0}' => {}
            _ => return None,
        }
    }
    let mut p = Calc { s: ascii.as_bytes(), i: 0 };
    let v = p.expr()?;
    (p.peek().is_none() && v.is_finite()).then_some(v)
}

/// Nombre affiché comme sur une calculatrice : sans zéros inutiles, virgule en français.
pub fn number(v: f64, fr: bool) -> String {
    let s = if v.fract() == 0.0 && v.abs() < 1e15 {
        format!("{}", v as i64)
    } else {
        let digits = (9 - v.abs().log10().floor() as i32).clamp(0, 12) as usize;
        let s = format!("{v:.digits$}");
        if s.contains('.') {
            s.trim_end_matches('0').trim_end_matches('.').to_string()
        } else {
            s
        }
    };
    if fr {
        s.replace('.', ",")
    } else {
        s
    }
}

// ——— Paramètres de Windows ———

pub struct Setting {
    pub fr: &'static str,
    pub en: &'static str,
    pub uri: &'static str,
    /// autres mots qui y mènent (français et anglais, sans accents)
    pub words: &'static str,
}

const fn s(fr: &'static str, en: &'static str, uri: &'static str, words: &'static str) -> Setting {
    Setting { fr, en, uri, words }
}

pub const SETTINGS: &[Setting] = &[
    s("Wi‑Fi", "Wi‑Fi", "ms-settings:network-wifi", "wifi reseau internet sans fil wireless"),
    s("Réseau et Internet", "Network & internet", "ms-settings:network", "ethernet connexion network"),
    s("VPN", "VPN", "ms-settings:network-vpn", "vpn"),
    s("Bluetooth et appareils", "Bluetooth & devices", "ms-settings:bluetooth", "bluetooth casque manette souris clavier devices"),
    s("Imprimantes", "Printers", "ms-settings:printers", "imprimante printer scanner"),
    s("Souris", "Mouse", "ms-settings:mousetouchpad", "souris mouse pointeur vitesse"),
    s("Pavé tactile", "Touchpad", "ms-settings:devices-touchpad", "touchpad pave tactile"),
    s("Affichage", "Display", "ms-settings:display", "ecran resolution luminosite hdr frequence hz display brightness"),
    s("Éclairage nocturne", "Night light", "ms-settings:nightlight", "lumiere bleue nuit night light"),
    s("Son", "Sound", "ms-settings:sound", "audio volume micro haut-parleur casque sound microphone"),
    s("Notifications", "Notifications", "ms-settings:notifications", "notifications ne pas deranger focus"),
    s("Alimentation et batterie", "Power & battery", "ms-settings:powersleep", "batterie veille alimentation energie power battery sleep"),
    s("Stockage", "Storage", "ms-settings:storagesense", "disque espace stockage storage nettoyage"),
    s("Presse-papiers", "Clipboard", "ms-settings:clipboard", "copier coller historique clipboard"),
    s("Multitâche", "Multitasking", "ms-settings:multitasking", "fenetres snap bureaux virtuels multitasking"),
    s("Arrière-plan", "Background", "ms-settings:personalization-background", "fond d'ecran wallpaper background image"),
    s("Couleurs", "Colors", "ms-settings:personalization-colors", "couleur accent mode sombre clair dark light colors"),
    s("Thèmes", "Themes", "ms-settings:themes", "theme"),
    s("Écran de verrouillage", "Lock screen", "ms-settings:lockscreen", "verrouillage lock screen"),
    s("Barre des tâches", "Taskbar", "ms-settings:taskbar", "taskbar barre des taches"),
    s("Polices", "Fonts", "ms-settings:fonts", "police font"),
    s("Applications installées", "Installed apps", "ms-settings:appsfeatures", "desinstaller programmes applications apps uninstall"),
    s("Applications par défaut", "Default apps", "ms-settings:defaultapps", "navigateur par defaut default browser"),
    s("Applications au démarrage", "Startup apps", "ms-settings:startupapps", "demarrage startup"),
    s("Comptes", "Accounts", "ms-settings:accounts", "compte microsoft account"),
    s("Options de connexion", "Sign-in options", "ms-settings:signinoptions", "mot de passe code pin hello password"),
    s("Date et heure", "Date & time", "ms-settings:dateandtime", "heure fuseau horaire date time zone"),
    s("Langue et région", "Language & region", "ms-settings:regionlanguage", "langue clavier region language keyboard"),
    s("Saisie", "Typing", "ms-settings:typing", "clavier correction saisie typing"),
    s("Mode Jeu", "Game Mode", "ms-settings:gaming-gamemode", "jeu gaming game mode"),
    s("Xbox Game Bar", "Xbox Game Bar", "ms-settings:gaming-gamebar", "game bar capture xbox"),
    s("Graphiques", "Graphics", "ms-settings:display-advancedgraphics", "gpu carte graphique graphics planification"),
    s("Accessibilité", "Accessibility", "ms-settings:easeofaccess", "accessibilite loupe narrateur contraste"),
    s("Confidentialité et sécurité", "Privacy & security", "ms-settings:privacy", "confidentialite permissions privacy"),
    s("Sécurité Windows", "Windows Security", "windowsdefender:", "antivirus defender securite pare-feu firewall"),
    s("Windows Update", "Windows Update", "ms-settings:windowsupdate", "mise a jour update"),
    s("Récupération", "Recovery", "ms-settings:recovery", "reinitialiser recovery reset"),
    s("Activation", "Activation", "ms-settings:activation", "licence cle activation"),
    s("Informations système", "About", "ms-settings:about", "a propos nom du pc specifications about"),
    s("Espace développeurs", "For developers", "ms-settings:developers", "developpeur developer"),
];

impl Setting {
    pub fn name(&self, fr: bool) -> &'static str {
        if fr {
            self.fr
        } else {
            self.en
        }
    }

    /// Meilleure note entre le nom dans la langue, dans l'autre langue et ses mots-clés.
    pub fn score(&self, fr: bool, query: &str) -> Option<u32> {
        let own = score(self.name(fr), query);
        let other = score(self.name(!fr), query).map(|s| s.saturating_sub(40));
        let words = score(self.words, query).map(|s| s.min(760).saturating_sub(80));
        [own, other, words].into_iter().flatten().max()
    }
}

/// Minuteur demandé dans la recherche : « minuteur 10 », « timer 5 min », « 25 min » (en secondes).
pub fn timer(query: &str) -> Option<u32> {
    let q = fold(query);
    let q = q.trim();
    let (named, rest) = match ["minuterie", "minuteur", "timer"].into_iter().find_map(|w| q.strip_prefix(w)) {
        Some(r) => (true, r.trim()),
        None => (false, q),
    };
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    let n: u32 = digits.parse().ok()?;
    let unit = rest[digits.len()..].trim();
    // « 25 » seul n'est pas un minuteur : il faut le mot ou l'unité
    if !named && unit.is_empty() {
        return None;
    }
    let secs = match unit {
        "" | "m" | "min" | "mn" | "minute" | "minutes" => n.checked_mul(60)?,
        "s" | "sec" | "seconde" | "secondes" | "second" | "seconds" => n,
        "h" | "heure" | "heures" | "hour" | "hours" => n.checked_mul(3600)?,
        _ => return None,
    };
    (secs > 0 && secs <= 24 * 3600).then_some(secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_compared_without_accents_or_case() {
        assert_eq!(fold("Paramètres Œuvre"), "parametres oeuvre");
        assert!(score("Paramètres", &fold("param")).is_some());
        assert!(score("Microsoft Edge", "edge").unwrap() > score("Microsoft Edge", "mse").unwrap_or(0));
    }

    #[test]
    fn better_matches_come_first() {
        let q = "ste";
        let steam = score("Steam", q).unwrap();
        let word = score("Paint Steady", q).unwrap();
        let inside = score("Forestel", q).unwrap();
        assert!(steam > word && word > inside);
        assert_eq!(score("Steam", "steam"), Some(1000));
        // initiales et lettres dans l'ordre
        assert!(score("Visual Studio Code", "vsc").is_some());
        assert!(score("Calculatrice", "clcl").is_some());
        assert_eq!(score("Calculatrice", "xyz"), None);
        // plusieurs mots
        assert!(score("Epic Games Launcher", "epic laun").is_some());
        assert_eq!(score("Epic Games Launcher", "epic steam"), None);
    }

    #[test]
    fn little_calculator() {
        assert_eq!(calc("12*4,5"), Some(54.0));
        assert_eq!(calc("(3+4)^2"), Some(49.0));
        assert_eq!(calc("200*15%"), Some(30.0));
        assert_eq!(calc("2+3*4"), Some(14.0));
        assert_eq!(calc("10 / 4 ="), Some(2.5));
        assert_eq!(calc("-3 + 5"), Some(2.0));
        assert_eq!(calc("8 x 7"), Some(56.0));
        assert_eq!(calc("1/0"), None);
        assert_eq!(calc("42"), None);
        assert_eq!(calc("steam"), None);
        assert_eq!(calc("3+"), None);
        assert_eq!(number(2.5, true), "2,5");
        assert_eq!(number(54.0, false), "54");
        assert_eq!(number(1.0 / 3.0, false), "0.3333333333");
        assert_eq!(number(1234.5678, true), "1234,5678");
    }

    #[test]
    fn settings_are_found_in_both_languages() {
        let best = |q: &str| SETTINGS.iter().filter_map(|s| s.score(true, &fold(q)).map(|n| (n, s.uri))).max().map(|(_, u)| u);
        assert_eq!(best("wifi"), Some("ms-settings:network-wifi"));
        assert_eq!(best("fond d'ecran"), Some("ms-settings:personalization-background"));
        assert_eq!(best("bluetooth"), Some("ms-settings:bluetooth"));
        assert_eq!(best("Display"), Some("ms-settings:display"));
        assert!(SETTINGS.iter().all(|s| s.uri.contains(':')));
    }

    #[test]
    fn timers_need_a_word_or_a_unit() {
        assert_eq!(timer("minuteur 10"), Some(600));
        assert_eq!(timer("Timer 5 min"), Some(300));
        assert_eq!(timer("25 min"), Some(1500));
        assert_eq!(timer("90 s"), Some(90));
        assert_eq!(timer("25"), None);
        assert_eq!(timer("minuteur"), None);
        assert_eq!(timer("minuteur 99 h"), None);
    }
}
