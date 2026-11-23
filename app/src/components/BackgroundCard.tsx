import { useEffect, useState } from "react";
import { api, type BackgroundPrefs, type BackgroundState } from "../lib/api";
import { useStore } from "../lib/store";
import { Sw } from "../s5/ui";

const DEFAULT_SHORTCUT = "Alt+X";
const MODIFIERS = new Set(["Control", "Shift", "Alt", "Meta", "AltGraph"]);

/** Touche tapée → raccourci lisible par le moteur (« Ctrl+Shift+R »), null tant qu'il manque la touche principale. */
export function shortcutOf(e: Pick<KeyboardEvent, "ctrlKey" | "altKey" | "shiftKey" | "metaKey" | "key" | "code">): string | null {
  if (MODIFIERS.has(e.key)) return null;
  const key = /^Key[A-Z]$/.test(e.code)
    ? e.code.slice(3)
    : /^Digit\d$/.test(e.code)
      ? e.code.slice(5)
      : /^F\d{1,2}$/.test(e.code)
        ? e.code
        : /^(Numpad\d|Space|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Insert|Home|End|PageUp|PageDown)$/.test(e.code)
          ? e.code
          : null;
  if (!key) return null;
  const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Super"].filter(Boolean);
  // une touche F peut servir seule ; une lettre seule gênerait la frappe dans le jeu
  if (!mods.length && !/^F\d{1,2}$/.test(key)) return null;
  return [...mods, key].join("+");
}

/** Paramètres : barre en jeu (raccourci, pastille) et mode arrière-plan (icône, lancement avec Windows).
 * Écran v5 (maquettes app-settings*.html) : bloc « in-game bar » en lignes .sr avec l'interrupteur .sw. */
export function BackgroundSection() {
  const { t, lang } = useStore();
  const [state, setState] = useState<BackgroundState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    void api.backgroundGet().then(setState, () => {});
  }, []);

  const save = async (patch: Partial<BackgroundPrefs>) => {
    if (!state) return;
    const prefs = { ...state.prefs, ...patch, lang };
    // le lancement avec Windows démarre caché : l'icône près de l'horloge va avec
    if (patch.autostart) prefs.tray = true;
    if (patch.tray === false) prefs.autostart = false;
    setState({ ...state, prefs });
    setSaving(true);
    setError(null);
    try {
      setState(await api.backgroundSet(prefs));
    } catch (e) {
      const msg = String(e);
      setError(msg === "shortcut" ? t("settings.bg.badShortcut") : msg.startsWith("autostart") ? t("settings.bg.autostartError") : msg);
      void api.backgroundGet().then(setState, () => {});
    } finally {
      setSaving(false);
    }
  };

  // enregistrement du raccourci : la prochaine combinaison tapée, Échap annule
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") return setRecording(false);
      const sc = shortcutOf(e);
      if (!sc) return;
      setRecording(false);
      void save({ shortcut: sc });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, state]);

  const head = (
    <div className="sh">
      <h2 className="h2 tape">{t("settings.bg.overlay")}</h2>
    </div>
  );
  if (!state) return <section>{head}</section>;
  const p = state.prefs;
  const row = (title: string, hint: string, on: boolean, set: (v: boolean) => void) => (
    <div className="sr">
      <div className="l">
        <b>{title}</b>
        <span>{hint}</span>
      </div>
      <Sw on={on} disabled={saving} onChange={set} label={title} />
    </div>
  );
  const note = (text: string, bad = false) => (
    <div className="sr nt">
      <div className="l">
        <span className={bad ? "bad" : undefined}>{text}</span>
      </div>
    </div>
  );

  return (
    <section>
      {head}
      <div className="panel sp">
        {row(t("settings.bg.overlay"), t("settings.bg.overlayHint"), p.overlay, (v) => void save({ overlay: v }))}
        {p.overlay && (
          <>
            <div className="sr">
              <div className="l">
                <b>{t("settings.bg.shortcut")}</b>
                <span>{t("settings.bg.shortcutHint")}</span>
              </div>
              <span className={`kb${recording ? " rec" : ""}`}>
                {recording ? <span>{t("settings.bg.record")}</span> : p.shortcut.split("+").map((k) => <kbd key={k}>{k === "Shift" && lang === "fr" ? "Maj" : k}</kbd>)}
              </span>
              {p.shortcut !== DEFAULT_SHORTCUT && !recording && (
                <button type="button" className="lnk dim" disabled={saving} onClick={() => void save({ shortcut: DEFAULT_SHORTCUT })}>
                  {t("settings.bg.reset")}
                </button>
              )}
              <button type="button" className="lnk" disabled={saving} onClick={() => setRecording((r) => !r)}>
                {recording ? t("signout.cancel") : t("settings.bg.change")}
              </button>
            </div>
            {state.shortcutTaken && note(t("settings.bg.taken"), true)}
            {row(t("settings.bg.pin"), t("settings.bg.pinHint"), p.pin, (v) => void save({ pin: v }))}
            {!state.fpsAvailable && note(t("settings.bg.noFps"))}
          </>
        )}
        {row(t("settings.bg.tray"), t("settings.bg.trayHint"), p.tray, (v) => void save({ tray: v }))}
        {row(t("settings.bg.autostart"), t("settings.bg.autostartHint"), p.autostart && state.autostart, (v) => void save({ autostart: v }))}
        {error && note(error, true)}
      </div>
    </section>
  );
}
