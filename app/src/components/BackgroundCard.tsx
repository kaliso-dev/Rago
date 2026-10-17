import { useEffect, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { api, type BackgroundPrefs, type BackgroundState } from "../lib/api";
import { useStore } from "../lib/store";
import { Button, Card, Switch } from "./ui";

const DEFAULT_SHORTCUT = "Ctrl+Shift+R";
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

/** Paramètres : barre en jeu (raccourci, pastille) et mode arrière-plan (icône, lancement avec Windows). */
export function BackgroundCard() {
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

  if (!state) return null;
  const p = state.prefs;
  const keys = (recording ? t("settings.bg.record") : p.shortcut).split("+");

  return (
    <Card title={t("settings.bg")} className="bg-card">
      <div className="setting">
        <div>
          <div>{t("settings.bg.overlay")}</div>
          <div className="muted small">{t("settings.bg.overlayHint")}</div>
        </div>
        <Switch checked={p.overlay} disabled={saving} onChange={(v) => void save({ overlay: v })} label={t("settings.bg.overlay")} />
      </div>
      {p.overlay && (
        <>
          <div className="setting">
            <div>
              <div>{t("settings.bg.shortcut")}</div>
              <div className="muted small">{t("settings.bg.shortcutHint")}</div>
            </div>
            <div className="bg-shortcut">
              <span className={`bg-keys${recording ? " recording" : ""}`}>
                {recording ? <span className="muted small">{keys[0]}</span> : keys.map((k) => <kbd key={k}>{k === "Shift" && lang === "fr" ? "Maj" : k}</kbd>)}
              </span>
              <Button size="sm" icon={<Keyboard size={13} />} disabled={saving} onClick={() => setRecording((r) => !r)}>
                {t("settings.bg.change")}
              </Button>
              {p.shortcut !== DEFAULT_SHORTCUT && (
                <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} disabled={saving} onClick={() => void save({ shortcut: DEFAULT_SHORTCUT })}>
                  {t("settings.bg.reset")}
                </Button>
              )}
            </div>
          </div>
          {state.shortcutTaken && <p className="bg-warn small">{t("settings.bg.taken")}</p>}
          <div className="setting">
            <div>
              <div>{t("settings.bg.pin")}</div>
              <div className="muted small">{t("settings.bg.pinHint")}</div>
            </div>
            <Switch checked={p.pin} disabled={saving} onChange={(v) => void save({ pin: v })} label={t("settings.bg.pin")} />
          </div>
          {!state.fpsAvailable && <p className="muted small bg-note">{t("settings.bg.noFps")}</p>}
        </>
      )}
      <div className="setting">
        <div>
          <div>{t("settings.bg.tray")}</div>
          <div className="muted small">{t("settings.bg.trayHint")}</div>
        </div>
        <Switch checked={p.tray} disabled={saving} onChange={(v) => void save({ tray: v })} label={t("settings.bg.tray")} />
      </div>
      <div className="setting">
        <div>
          <div>{t("settings.bg.autostart")}</div>
          <div className="muted small">{t("settings.bg.autostartHint")}</div>
        </div>
        <Switch checked={p.autostart && state.autostart} disabled={saving} onChange={(v) => void save({ autostart: v })} label={t("settings.bg.autostart")} />
      </div>
      {error && <p className="bg-warn small">{error}</p>}
    </Card>
  );
}
