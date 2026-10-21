import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AppWindow, BrushCleaning, Lock, LoaderCircle, Pin, PinOff, X } from "lucide-react";
import { api, type AppliedView, type LiveStats, type OverlayInfo, type OverlayLive, type OverlayMode, type SystemInfo } from "../lib/api";
import { availability, tweaks, type Lang } from "../lib/catalog";
import { translate, type Key } from "../lib/i18n";
import { Mark } from "../components/Logo";
import { Switch } from "../components/ui";

/** Réglages qui s'appliquent en pleine partie : sans redémarrage, sans couper la carte réseau ni relancer l'Explorateur,
 * sans point de restauration conseillé. Le mode jeu, Hitreg, OptiFine et RBW Mod restent dans l'app. */
export const LIVE_TWEAKS: { group: Key; ids: string[] }[] = [
  {
    group: "overlay.group.cpu",
    ids: ["cpu_parking", "cpu_cstates_cfg", "cpu_cstates_off", "cpu_device_idle", "cpu_pstates", "cpu_boost_epp", "cpu_throttle", "cpu_turbo", "cpu_cooling", "cpu_ac", "cpu_away"],
  },
  { group: "overlay.group.power", ids: ["pow_plan", "pow_hwp", "pow_devices"] },
  { group: "overlay.group.memory", ids: ["mem_compression", "mem_combining"] },
  { group: "overlay.group.system", ids: ["net_dca", "win_visual", "win_transparency", "win_autoplay", "nv_profile"] },
];

function readLang(): Lang {
  try {
    return JSON.parse(localStorage.getItem("rago.lang") ?? '"fr"') === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}
function readTrim(): boolean {
  try {
    return JSON.parse(localStorage.getItem("rago.cleanTrim") ?? "false") === true;
  } catch {
    return false;
  }
}

const value = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));

export function Overlay() {
  const [lang, setLang] = useState<Lang>(readLang);
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const [info, setInfo] = useState<OverlayInfo | null>(null);
  const [mode, setMode] = useState<OverlayMode>("hidden");
  const [live, setLive] = useState<OverlayLive>({ fps: null, ping: null });
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [applied, setApplied] = useState<Map<string, AppliedView>>(new Map());
  const [premium, setPremium] = useState(false);
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [i, a, l] = await Promise.all([api.overlayInfo(), api.applied().catch(() => []), api.licenseStatus().catch(() => null)]);
    setInfo(i);
    setMode((m) => (m === "hidden" ? i.mode : m));
    setApplied(new Map(a.map((x) => [x.id, x])));
    setPremium(l?.state === "active");
  }, []);

  useEffect(() => {
    void refresh();
    void api.systemInfo().then(setSys, () => {});
    const subs = [
      api.onOverlayMode((m) => {
        setMode(m);
        setCleaned(null);
        setError(null);
        if (m !== "hidden") void refresh();
      }),
      api.onDone(() => {
        setBusy(null);
        void api.applied().then((a) => setApplied(new Map(a.map((x) => [x.id, x]))), () => {});
      }),
    ];
    const onStorage = (e: StorageEvent) => e.key === "rago.lang" && setLang(readLang());
    window.addEventListener("storage", onStorage);
    return () => {
      subs.forEach((p) => void p.then((un) => un()));
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  // mesures chaque seconde, seulement quand la barre ou la pastille est à l'écran
  useEffect(() => {
    if (mode === "hidden") return;
    let live = true;
    const tick = () => {
      void api.overlayLive().then((v) => live && setLive(v), () => {});
      if (mode === "panel") void api.liveStats().then((s) => live && setStats(s), () => {});
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [mode]);

  // Échap : retour au jeu
  useEffect(() => {
    if (mode !== "panel") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && void api.overlayClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const groups = useMemo(
    () =>
      LIVE_TWEAKS.map((g) => ({
        group: g.group,
        items: g.ids.map((id) => tweaks.get(id)).filter((tw) => tw && tw.kind === "tweak" && !tw.variants?.length && availability(tw, sys).ok),
      })).filter((g) => g.items.length),
    [sys],
  );

  const toggle = async (id: string) => {
    if (!premium || busy) return;
    const a = applied.get(id);
    setBusy(id);
    setError(null);
    try {
      if (await api.isRunning()) throw "busy";
      await api.runTweaks([a ? { id, variant: a.variant, undo: true } : { id, variant: null }]);
    } catch (e) {
      setBusy(null);
      const msg = String(e);
      setError(msg === "busy" ? t("overlay.busy") : msg.startsWith("premium") ? t("err.premium_scripts_unavailable") : t("overlay.failed"));
    }
  };

  const clean = async () => {
    setCleaning(true);
    try {
      const c = await api.cleanRam(readTrim());
      setCleaned(c.standby >= 50 * 1024 ** 2 ? t("live.cleaned", { n: (c.standby / 1024 ** 3).toFixed(1).replace(".", lang === "fr" ? "," : ".") }) : t("live.cleanedEmpty"));
    } catch {
      setCleaned(t("live.cleanFailed"));
    } finally {
      setCleaning(false);
    }
  };

  if (mode === "pill") {
    return (
      <div className="ov-pill" aria-live="off">
        <Mark size={14} />
        <span className="ov-pill-v rg-metric">{info?.fpsAvailable === false ? "—" : value(live.fps)}</span>
        <span className="ov-pill-u">FPS</span>
        <span className="ov-pill-sep" />
        <span className="ov-pill-v rg-metric">{value(live.ping)}</span>
        <span className="ov-pill-u">ms</span>
      </div>
    );
  }
  if (mode !== "panel") return null;

  const tiles: { key: string; label: string; v: string; unit: string; hint?: string }[] = [
    { key: "fps", label: "FPS", v: info?.fpsAvailable === false ? "—" : value(live.fps), unit: "", hint: info?.fpsAvailable === false ? t("overlay.fpsOff") : undefined },
    { key: "ping", label: t("overlay.ping"), v: value(live.ping), unit: "ms", hint: live.ping == null ? t("overlay.pingUdp") : undefined },
    { key: "cpu", label: "CPU", v: value(stats?.cpu), unit: "%" },
    { key: "gpu", label: "GPU", v: value(stats?.gpu), unit: "%" },
    { key: "ram", label: "RAM", v: value(stats?.ram), unit: "%" },
  ];

  return (
    // clic hors de la barre : retour au jeu
    <div className="ov-stage" onMouseDown={(e) => e.target === e.currentTarget && void api.overlayClose()}>
      <motion.section className="ov-panel" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        <header className="ov-head">
          <Mark size={18} />
          <div className="ov-title">
            <span className="ov-overline">{t("overlay.title")}</span>
            <span className="ov-game">{info?.game ?? t("overlay.noGame")}</span>
          </div>
          <div className="ov-actions">
            <button
              type="button"
              className={`ov-icon${info?.pin ? " on" : ""}`}
              title={info?.pin ? t("overlay.unpin") : t("overlay.pin")}
              onClick={() => {
                const pin = !info?.pin;
                setInfo((i) => (i ? { ...i, pin } : i));
                void api.overlaySetPin(pin);
              }}
            >
              {info?.pin ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            <button type="button" className="ov-icon" title={t("overlay.openApp")} onClick={() => void api.overlayOpenApp()}>
              <AppWindow size={15} />
            </button>
            <button type="button" className="ov-icon" title={t("overlay.close")} onClick={() => void api.overlayClose()}>
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="ov-tiles">
          {tiles.map((x) => (
            <div key={x.key} className="ov-tile" title={x.hint}>
              <span className="ov-overline">{x.label}</span>
              <span className="ov-tile-v rg-metric">
                {x.v}
                {x.v !== "—" && x.unit && <small>{x.unit}</small>}
              </span>
            </div>
          ))}
          <button type="button" className="ov-clean" disabled={cleaning} title={t("live.cleanHint")} onClick={() => void clean()}>
            {cleaning ? <LoaderCircle size={15} className="spin" /> : <BrushCleaning size={15} />}
            <span>{cleaning ? t("live.cleaning") : t("live.clean")}</span>
          </button>
        </div>
        {cleaned && <p className="ov-note ov-cleaned">{cleaned}</p>}

        <div className="ov-section-head">
          <span className="ov-overline">{t("overlay.live")}</span>
          {!premium && (
            <button type="button" className="ov-premium" onClick={() => void api.overlayOpenApp("premium")}>
              <Lock size={11} />
              {t("overlay.premium")}
            </button>
          )}
        </div>
        <div className={`ov-list${premium ? "" : " locked"}`}>
          <div className="ov-cols">
            {groups.map((g) => (
              <div key={g.group} className="ov-group">
                <span className="ov-group-label">{t(g.group)}</span>
                {g.items.map((tw) => {
                  const on = applied.has(tw!.id);
                  return (
                    <div key={tw!.id} className="ov-row" onClick={() => void toggle(tw!.id)}>
                      <span className="ov-row-name">{tw!.name[lang]}</span>
                      {busy === tw!.id ? (
                        <LoaderCircle size={15} className="spin ov-row-busy" />
                      ) : (
                        <Switch checked={on} disabled={!premium || !!busy} onChange={() => void toggle(tw!.id)} label={tw!.name[lang]} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {error && <p className="ov-note ov-error">{error}</p>}
        <footer className="ov-foot">
          <span>{t(info?.passive ? "overlay.hintPassive" : "overlay.hint", { key: info?.shortcut ?? "Ctrl+Shift+R" })}</span>
          <span className="ov-foot-sep" />
          <span>{t("overlay.pingNote")}</span>
        </footer>
      </motion.section>
    </div>
  );
}
