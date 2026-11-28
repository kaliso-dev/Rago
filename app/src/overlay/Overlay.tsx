import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { api, type AppliedView, type LiveStats, type OverlayInfo, type OverlayLive, type OverlayMode, type SystemInfo } from "../lib/api";
import { availability, tweaks, type Lang } from "../lib/catalog";
import { translate, type Key } from "../lib/i18n";
import { tipsFor } from "../lib/tips";
import { GameTips } from "../components/GameTips";
import { SessionChecks, useSession } from "../components/SessionCard";
import { I } from "../s5/I";
import appIcon from "../assets/s5/img/rago-app-dark-64.svg";
import cap from "../assets/s5/img/rago-cap.svg";

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
  const [cleaned, setCleaned] = useState<{ text: string; bad?: boolean } | null>(null);
  // rappel des conseils au lancement du jeu (pastille élargie quelques secondes)
  const [nudge, setNudge] = useState(false);
  const session = useSession();

  const refresh = useCallback(async () => {
    const [i, a, l] = await Promise.all([api.overlayInfo(), api.applied().catch(() => []), api.licenseStatus().catch(() => null)]);
    setInfo(i);
    setNudge(i.nudge);
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
      api.onOverlayNudge(setNudge),
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
      setCleaned({ text: c.standby >= 50 * 1024 ** 2 ? t("live.cleaned", { n: (c.standby / 1024 ** 3).toFixed(1).replace(".", lang === "fr" ? "," : ".") }) : t("live.cleanedEmpty") });
    } catch {
      setCleaned({ text: t("live.cleanFailed"), bad: true });
    } finally {
      setCleaning(false);
    }
  };

  if (mode === "pill" && nudge && session) {
    const def = tipsFor(session.game);
    const label =
      def && session.tipsLeft > 0
        ? t("tips.nudge", { n: session.tipsLeft + session.checks.length, game: def.name })
        : t("tips.nudgeChecks", { n: session.checks.length });
    return (
      <div className="igpill nd igglass" aria-live="polite">
        <img src={cap} alt="" />
        <I n="bulb" />
        <span className="tx">{label}</span>
        <i className="sp" />
        <span className="ky">{t("tips.nudgeKey", { key: info?.shortcut ?? "Alt+X" })}</span>
      </div>
    );
  }
  if (mode === "pill") {
    return (
      <div className="igpill igglass" aria-live="off">
        <img src={cap} alt="" />
        <span className="m">
          <b>{info?.fpsAvailable === false ? "—" : value(live.fps)}</b>
          <small>fps</small>
        </span>
        <i className="sp" />
        <span className="m">
          <b>
            {live.ping != null && live.pingEstimate ? "≈" : ""}
            {value(live.ping)}
          </b>
          <small>ms</small>
        </span>
      </div>
    );
  }
  if (mode !== "panel") return null;

  const tiles: { key: string; label: string; v: string; unit: string; hint?: string }[] = [
    { key: "fps", label: "fps", v: info?.fpsAvailable === false ? "—" : value(live.fps), unit: "", hint: info?.fpsAvailable === false ? t("overlay.fpsOff") : undefined },
    {
      key: "ping",
      label: t("overlay.ping"),
      // serveur muet au ping (beaucoup de serveurs UDP) : mesuré au dernier routeur avant lui, d'où le ≈
      v: `${live.ping != null && live.pingEstimate ? "≈" : ""}${value(live.ping)}`,
      unit: "ms",
      hint: live.ping == null ? t("overlay.pingUdp") : live.pingEstimate ? t("overlay.pingEstimate") : undefined,
    },
    { key: "cpu", label: "cpu", v: value(stats?.cpu), unit: "%" },
    { key: "gpu", label: "gpu", v: value(stats?.gpu), unit: "%" },
    { key: "ram", label: "ram", v: value(stats?.ram), unit: "%" },
  ];

  const advice = !!session && (session.playing || !!session.game);
  const shortcut = info?.shortcut ?? "Alt+X";

  return (
    // clic hors de la barre : retour au jeu
    <div className="ovw" onMouseDown={(e) => e.target === e.currentTarget && void api.overlayClose()}>
      <motion.section
        className="igp igglass"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="igh">
          <img className="igm" src={appIcon} alt="" />
          <div className="igt">
            <span className="igo">{t("overlay.title")}</span>
            <b>{info?.game ?? t("overlay.noGame")}</b>
          </div>
          <div className="iga">
            <button
              type="button"
              className={`igi${info?.pin ? " on" : ""}`}
              title={info?.pin ? t("overlay.unpin") : t("overlay.pin")}
              aria-label={info?.pin ? t("overlay.unpin") : t("overlay.pin")}
              onClick={() => {
                const pin = !info?.pin;
                setInfo((i) => (i ? { ...i, pin } : i));
                void api.overlaySetPin(pin);
              }}
            >
              <I n={info?.pin ? "pinoff" : "pin"} />
            </button>
            <button type="button" className="igi" title={t("overlay.openApp")} aria-label={t("overlay.openApp")} onClick={() => void api.overlayOpenApp()}>
              <I n="appwin" />
            </button>
            <button type="button" className="igi" title={t("overlay.close")} aria-label={t("overlay.close")} onClick={() => void api.overlayClose()}>
              <I n="x" />
            </button>
          </div>
        </header>

        <div className="igtl">
          {tiles.map((x) => (
            <div key={x.key} className={`igtile${x.key === "fps" ? " hi" : ""}${x.v === "—" ? " na" : ""}`} title={x.hint}>
              <span className="igo">{x.label}</span>
              <b>
                {x.v}
                {x.v !== "—" && x.unit && <small>{x.unit}</small>}
              </b>
            </div>
          ))}
          <button type="button" className={`igcl${cleaning ? " busy" : ""}`} disabled={cleaning} title={t("live.cleanHint")} onClick={() => void clean()}>
            {cleaning ? <I n="loader" className="spin" /> : <I n="brush" />}
            {cleaning ? t("live.cleaning") : t("live.clean")}
          </button>
        </div>
        {cleaned && (
          <p className={`ignote${cleaned.bad ? " bad igcf" : ""}`}>
            <I n={cleaned.bad ? "alert" : "check"} />
            {cleaned.text}
          </p>
        )}
        {/* conseils de la partie à gauche (défilent à part), réglages en direct à droite */}
        <div className={`igb${advice ? "" : " one"}`}>
          {advice && (
            <div className="igcol">
              <div className="igsh">
                <span className="igo">{t("overlay.thisGame")}</span>
              </div>
              <div className="igsc">
                <SessionChecks session={session!} t={t} />
                {session!.game && <GameTips game={session!.game} t={t} lang={lang} open={session!.tipsLeft > 0} />}
              </div>
            </div>
          )}
          <div className="igcol">
            <div className="igsh">
              <span className="igo">{t("overlay.live")}</span>
              {!premium && (
                <button type="button" className="igpr" onClick={() => void api.overlayOpenApp("premium")}>
                  <I n="lock" />
                  {t("overlay.premium")}
                </button>
              )}
            </div>
            <div className="igsc">
              <div className={`igl${premium ? "" : " locked"}${advice ? "" : " cols2"}`}>
                {groups.map((g) => (
                  <div key={g.group} className="iggr">
                    <span className="igo">{t(g.group)}</span>
                    {g.items.map((tw) => {
                      const on = applied.has(tw!.id);
                      const wait = busy === tw!.id;
                      return (
                        <button
                          key={tw!.id}
                          type="button"
                          role="switch"
                          aria-checked={on}
                          disabled={!premium || !!busy}
                          className={`igr${on || wait ? " on" : ""}${busy ? " wait" : ""}`}
                          onClick={() => void toggle(tw!.id)}
                        >
                          <b>{tw!.name[lang]}</b>
                          {wait ? <I n="loader" className="ld spin" /> : <i className={`sw${on ? " on" : ""}${busy ? " dis" : ""}`} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {error && (
          <p className="ignote bad">
            <I n="alert" />
            {error}
          </p>
        )}
        <footer className="igf">
          <span>
            <Keys text={t(info?.passive ? "overlay.hintPassive" : "overlay.hint", { key: "\u0001" })} shortcut={shortcut} />
          </span>
          <i className="dt" />
          <span>{t("overlay.pingNote")}</span>
        </footer>
      </motion.section>
    </div>
  );
}

/** Raccourcis du pied de la barre en touches (<kbd>) : le raccourci de la barre et Échap. */
function Keys({ text, shortcut }: { text: string; shortcut: string }) {
  return (
    <>
      {text.split(/(\u0001|Échap|Esc)/).map((part, i) => (i % 2 ? <kbd key={i}>{part === "\u0001" ? shortcut : part}</kbd> : part))}
    </>
  );
}
