import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, ArrowRight, BatteryMedium, Check, ChevronDown, Cog, Crosshair, Download, ExternalLink, Folder, Gamepad2, Gauge, Globe, ImageIcon,
  Laptop, Lock, Megaphone, MessageCircle, Minus, Music2, Package, Palette, Play, Plus, Power, Radio, RefreshCw, RotateCcw, Scale, Search, Shield,
  ShieldCheck, SlidersHorizontal, Sparkles, Square, Timer, Trash2, Undo2, Volume2, Wifi, X, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MarkIcon, Pulse } from "../components/Logo";
import { Modal } from "../components/Modal";
import { Badge, Button, Switch } from "../components/ui";
import { api, OS_WALLS, type OsCheck, type OsDone, type OsOverview, type OsProgress, type OsRequest, type OsUsage } from "../lib/api";
import { formatDate, formatNumber, type Key } from "../lib/i18n";
import { featureDefaults, matchingProfile, osCatalog, osTweaks, profileSelection, runsOn } from "../lib/os";
import { useStore } from "../lib/store";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  megaphone: Megaphone,
  sparkles: Sparkles,
  package: Package,
  cog: Cog,
  gauge: Gauge,
  folder: Folder,
  palette: Palette,
  crosshair: Crosshair,
  scale: Scale,
  radio: Radio,
  laptop: Laptop,
};

/** Version de Windows lisible pour une build minimale du catalogue. */
const VERSIONS: [number, string][] = [
  [26100, "11 24H2"],
  [22631, "11 23H2"],
  [22621, "11 22H2"],
  [22000, "11"],
  [19041, "10 2004"],
];
const versionOf = (build: number) => VERSIONS.find(([b]) => build >= b)?.[1] ?? String(build);

/** « 21 octobre » : la date abrégée (« 21 oct. ») finirait la phrase par deux points. */
const longDate = (lang: string, ts: number) => new Date(ts).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long" });

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

interface Row {
  id: string;
  undo: boolean;
  status: "pending" | "running" | "ok" | "skipped" | "failed";
}
interface RunState {
  kind: "apply" | "restore";
  rows: Row[];
  phase: string;
  current: string | null;
  done: OsDone | null;
  request: OsRequest | null;
}

export function RagoOs() {
  const { t, lang, premium, setUpsell, goTo } = useStore();
  const [ov, setOv] = useState<OsOverview | null>(null);
  const [checks, setChecks] = useState<OsCheck[] | null>(null);
  const [profile, setProfile] = useState<string | null>("balanced");
  const [selection, setSelection] = useState<string[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>(featureDefaults);
  const [run, setRun] = useState<RunState | null>(null);
  const [usage, setUsage] = useState<OsUsage | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [wall, setWall] = useState("graphite");
  const [wallError, setWallError] = useState<string | null>(null);
  const live = useRef(true);
  const build = ov?.build ?? 0;

  const refresh = async () => {
    const o = await api.osOverview();
    if (!live.current) return o;
    setOv(o);
    return o;
  };
  const check = (sel: string[]) =>
    void api
      .osPreflight(sel)
      .then((c) => live.current && setChecks(c))
      .catch(() => {});

  useEffect(() => {
    live.current = true;
    void refresh().then((o) => {
      // brouillon : la sélection en place, sinon le profil Équilibré
      if (o.active || o.selection.length) {
        setProfile(o.profile);
        setSelection(o.selection.filter((id) => osTweaks.has(id)));
      } else {
        setSelection(profileSelection("balanced", o.build));
      }
      setFeatures({ ...featureDefaults(), ...o.features });
      setWall(o.wallpaper);
      check(o.selection.length ? o.selection : profileSelection("balanced", o.build));
      if (o.running) setRun({ kind: "apply", rows: [], phase: "tweak", current: null, done: null, request: null });
    });
    const subs = [
      api.onOsProgress((p: OsProgress) => {
        if (!live.current) return;
        setRun((r) => {
          const base: RunState = r ?? { kind: p.kind, rows: [], phase: p.phase, current: null, done: null, request: null };
          let rows = base.rows;
          if (p.id) {
            const status = p.status === "failed" ? "failed" : p.status;
            rows = rows.some((x) => x.id === p.id)
              ? rows.map((x) => (x.id === p.id ? { ...x, status } : x))
              : [...rows, { id: p.id, undo: p.kind === "restore", status }];
          }
          return { ...base, kind: p.kind, phase: p.phase, current: p.id ?? null, rows };
        });
      }),
      api.onOsDone((d: OsDone) => {
        if (!live.current) return;
        setRun((r) => (r ? { ...r, done: d, current: null } : { kind: d.kind, rows: [], phase: "", current: null, done: d, request: null }));
        void refresh();
        void api.osPreflight([]).then((c) => live.current && setChecks(c));
      }),
    ];
    return () => {
      live.current = false;
      for (const s of subs) void s.then((un) => un());
    };
  }, []);

  // consommation de Rago Shell, mesurée toutes les 2 s tant que la page est ouverte
  useEffect(() => {
    if (!ov?.active) {
      setUsage(null);
      return;
    }
    let stop = false;
    const tick = () =>
      void api
        .osUsage()
        .then((u) => !stop && setUsage(u))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [ov?.active]);

  // le plan d'alimentation change la vérification de la batterie
  const hasPowerplan = selection.includes("perf.powerplan");
  useEffect(() => {
    if (ov) check(selection);
  }, [hasPowerplan]);

  const active = !!ov?.active;
  const running = !!run && !run.done;
  const applied = useMemo(() => new Map(ov?.tweaks.map((x) => [x.id, x]) ?? []), [ov]);
  const available = useMemo(() => osCatalog.tweaks.filter((tw) => runsOn(tw, build) || applied.get(tw.id)?.applied), [build, applied]);
  const dirty = active && !!ov && !sameSet(selection, ov.selection.filter((id) => osTweaks.has(id)));
  const blocked = checks?.filter((c) => c.level === "block") ?? [];
  const warns = checks?.filter((c) => c.level === "warn") ?? [];

  const pick = (p: string) => {
    setProfile(p);
    setSelection(profileSelection(p, build));
  };
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...selection, id] : selection.filter((x) => x !== id);
    setSelection(next);
    setProfile(matchingProfile(next, build));
  };

  const explain = (e: unknown) => {
    const code = String(e);
    if (code === "premium_required") return setUpsell("plan");
    if (code.startsWith("preflight_blocked")) return setError(t("os.error.preflight"));
    if (code === "os_running") return setError(t("os.error.running"));
    if (code === "reset_running") return setError(t("os.error.reset"));
    setError(t("os.error.generic", { error: code }));
  };

  const start = async (request: OsRequest) => {
    if (!premium) return setUpsell("plan");
    setError(null);
    const wanted = request.selection;
    const revert = (ov?.tweaks ?? []).filter((x) => x.applied && !wanted.includes(x.id)).map((x) => x.id);
    const rows: Row[] = [...revert.map((id) => ({ id, undo: true, status: "pending" as const })), ...wanted.map((id) => ({ id, undo: false, status: "pending" as const }))];
    setRun({ kind: "apply", rows, phase: "tweak", current: null, done: null, request });
    try {
      await api.osApply(request);
    } catch (e) {
      setRun(null);
      explain(e);
    }
  };
  const activate = (extra?: Partial<OsRequest>) => void start({ profile, selection, features, ...extra });
  const restoreAll = async () => {
    setConfirmRestore(false);
    setError(null);
    const rows: Row[] = (ov?.tweaks ?? []).filter((x) => x.applied).map((x) => ({ id: x.id, undo: true, status: "pending" as const }));
    setRun({ kind: "restore", rows, phase: "features", current: null, done: null, request: null });
    try {
      await api.osRestore();
    } catch (e) {
      setRun(null);
      explain(e);
    }
  };

  const setFeature = async (id: string, on: boolean) => {
    setNotice(null);
    if (!active) return setFeatures((f) => ({ ...f, [id]: on }));
    if (on && !premium) return setUpsell("plan");
    setFeatures((f) => ({ ...f, [id]: on }));
    try {
      await api.osSetFeature(id, on);
    } catch (e) {
      setFeatures((f) => ({ ...f, [id]: !on }));
      if (String(e) === "translucenttb_missing") setNotice(t("os.ttbMissing"));
      else explain(e);
    }
    void refresh();
  };
  const wallFailed = (e: unknown) => {
    const code = String(e);
    if (code === "os_running") return setWallError(t("os.error.running"));
    if (code === "wallpaper_type") return setWallError(t("os.error.wallpaperType"));
    if (code === "wallpaper_size") return setWallError(t("os.error.wallpaperSize"));
    setWallError(t("os.error.wallpaper", { error: code }));
  };
  // Rago OS actif : le bureau change tout de suite ; sinon le choix est gardé pour l'activation
  const chooseWall = async (id: string) => {
    const before = wall;
    setWallError(null);
    setWall(id);
    try {
      await api.osSetWallpaper(id);
    } catch (e) {
      setWall(before);
      wallFailed(e);
    }
    void refresh();
  };
  const pickWall = async () => {
    setWallError(null);
    try {
      if (await api.osPickWallpaper(t("os.wall.pickTitle"))) setWall("custom");
    } catch (e) {
      wallFailed(e);
    }
    void refresh();
  };
  const startTimer = (min: number) => {
    void api.osTimer(min * 60);
    setTimer(min);
  };

  const checkText = (c: OsCheck) => {
    const d = c.detail ?? "";
    return t(`os.check.${c.id}.${c.level}` as Key, { detail: c.id === "disk" ? formatNumber(lang, Number(d)) : d });
  };

  if (!ov) {
    return <div className="page os-page" />;
  }

  const ttb = ov.translucenttb;
  const rebootFor = (id: string) => osTweaks.get(id)?.reboot ?? "none";

  return (
    <motion.div className="page os-page" variants={stagger} initial="initial" animate="animate">
      <motion.section variants={rise} className={`os-hero${active ? " on" : ""}`}>
        <div className="os-hero-text">
          <div className="os-hero-over">
            <span className="rg-overline">{t("os.overline")}</span>
            <span className={`os-state${active ? " on" : ""}`}>
              <span className="os-state-dot" />
              {active ? t("os.status.active") : t("os.status.off")}
            </span>
            {!premium && (
              <Badge tone="red">
                <Lock size={10} /> {t("os.premium")}
              </Badge>
            )}
          </div>
          <h1 className="display">{active ? t("os.titleActive") : t("os.title")}</h1>
          <p className="lead">{active && ov.activatedAt ? t("os.leadActive", { date: longDate(lang, ov.activatedAt) }) : t("os.lead")}</p>
          <ul className="os-promises">
            <li>
              <Undo2 size={13} />
              {t("os.promise.revert")}
            </li>
            <li>
              <RotateCcw size={13} />
              {t("os.promise.restore")}
            </li>
            <li>
              <ShieldCheck size={13} />
              {t("os.promise.safe")}
            </li>
          </ul>
          <div className="os-hero-actions">
            {!active ? (
              <Button variant="primary" size="lg" disabled={running || (premium && blocked.length > 0)} icon={premium ? <Power size={16} /> : <Lock size={15} />} onClick={() => activate()}>
                {t("os.activate")}
              </Button>
            ) : (
              dirty && (
                <Button variant="primary" size="lg" disabled={running || (premium && blocked.length > 0)} icon={<Check size={16} />} onClick={() => activate()}>
                  {t("os.applyChanges")}
                </Button>
              )
            )}
            <Button size="lg" icon={<Play size={14} />} disabled={!ov.shellInstalled} onClick={() => void api.osPreview()}>
              {t("os.preview")}
            </Button>
            {active && (
              <Button variant="ghost" size="lg" icon={<Undo2 size={15} />} disabled={running} onClick={() => setConfirmRestore(true)}>
                {t("os.restoreAll")}
              </Button>
            )}
          </div>
          {!premium && <p className="os-free muted small">{t("os.free")}</p>}
          {error && <p className="error-text os-error">{error}</p>}
        </div>
        <OsPreview active={active} features={features} wall={wall} />
      </motion.section>

      {/* ce qui demande l'attention du joueur, du plus urgent au moins urgent */}
      <AnimatePresence initial={false}>
        {ov.interrupted && !running && (
          <motion.div key="job" className="os-banner warn" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertTriangle size={16} />
            <span className="os-banner-text">{t(ov.interrupted.kind === "apply" ? "os.interrupted" : "os.interruptedRestore", { done: ov.interrupted.done, total: ov.interrupted.total })}</span>
            {ov.interrupted.kind === "apply" && (
              <Button size="sm" variant="primary" onClick={() => activate({ selection: ov.selection.length ? ov.selection : selection, profile: ov.profile })}>
                {t("os.resume")}
              </Button>
            )}
            <Button size="sm" onClick={() => void restoreAll()}>
              {t("os.restoreShort")}
            </Button>
          </motion.div>
        )}
        {ov.restartPending && !running && (
          <motion.div key="restart" className="os-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Power size={16} />
            <span className="os-banner-text">{t("os.restartPending")}</span>
            <Button size="sm" variant="primary" onClick={() => void api.restartPc()}>
              {t("os.restartNow")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void api.osClearRestart().then(refresh)}>
              {t("os.later")}
            </Button>
          </motion.div>
        )}
        {active && ov.drift.length > 0 && !running && (
          <motion.div key="drift" className="os-banner warn" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <RefreshCw size={16} />
            <span className="os-banner-text">
              {t("os.drift", { n: ov.drift.length })} {ov.windowsUpdated && t("os.driftUpdate")}
              <span className="os-banner-list muted small">{ov.drift.map((id) => osTweaks.get(id)?.name[lang] ?? id).join(" · ")}</span>
            </span>
            <Button size="sm" variant="primary" onClick={() => activate({ selection: ov.selection, profile: ov.profile, force: true })}>
              {t("os.reapply")}
            </Button>
          </motion.div>
        )}
        {ov.failed.length > 0 && !running && (
          <motion.div key="failed" className="os-banner bad" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <X size={16} />
            <span className="os-banner-text">
              {t("os.failed", { n: ov.failed.length })} {t("os.failedHint")}
              <span className="os-banner-list small">
                {ov.failed.map((f) => (
                  <span key={f.id} className="os-fail">
                    <b>{osTweaks.get(f.id)?.name[lang] ?? (f.id === "features" ? t("os.features") : f.id)}</b> <span className="muted">{f.error}</span>
                  </span>
                ))}
              </span>
            </span>
            {active && (
              <Button size="sm" onClick={() => activate({ selection: ov.selection, profile: ov.profile, force: true })}>
                {t("os.reapply")}
              </Button>
            )}
          </motion.div>
        )}
        {ov.appsToReinstall.length > 0 && (
          <motion.div key="apps" className="os-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Package size={16} />
            <span className="os-banner-text">
              {t("os.reinstall", { n: ov.appsToReinstall.length })}
              <span className="os-store-list">
                {ov.appsToReinstall.map((a) => (
                  <button key={a.family} type="button" className="os-chip" onClick={() => void api.osOpenStore(a.family)}>
                    {a.name.replace(/^Microsoft\./, "")} <ExternalLink size={11} />
                  </button>
                ))}
              </span>
            </span>
          </motion.div>
        )}
        {!ov.shellInstalled && (
          <motion.div key="shell" className="os-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertTriangle size={16} />
            <span className="os-banner-text">{t("os.noShell")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {(!active || dirty) && checks && (
        <motion.section variants={rise} className="os-checks">
          <div className="rg-overline os-section-label">{t("os.checks")}</div>
          <div className="os-check-row">
            {checks.map((c) => (
              <span key={c.id} className={`os-check ${c.level}`} title={checkText(c)}>
                {c.level === "ok" ? <Check size={12} /> : c.level === "warn" ? <AlertTriangle size={12} /> : <X size={12} />}
                {t(`os.checkName.${c.id}` as Key)}
              </span>
            ))}
          </div>
          {[...blocked, ...warns].map((c) => (
            <p key={c.id} className={`os-check-note ${c.level}`}>
              {checkText(c)}
            </p>
          ))}
        </motion.section>
      )}

      <motion.section variants={rise} className="os-block">
        <div className="os-block-head">
          <h2 className="section-title">{t("os.profile")}</h2>
          {profile === null && <Badge>{t("os.profileCustom")}</Badge>}
        </div>
        <div className="os-profiles" role="radiogroup">
          {osCatalog.profiles.map((p) => {
            const Icon = ICONS[p.icon] ?? Sparkles;
            const on = profile === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className={`os-profile${on ? " on" : ""}`} disabled={running} onClick={() => pick(p.id)}>
                {on && <motion.span layoutId="os-profile" className="os-profile-ring" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="os-profile-icon">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="os-profile-name">{p.name[lang]}</span>
                <span className="os-profile-lead">{p.lead[lang]}</span>
                <span className="os-profile-count rg-metric">{t("os.profileCount", { n: profileSelection(p.id, build).length })}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      <motion.section variants={rise} className="os-block">
        <div className="os-block-head">
          <h2 className="section-title">{t("os.wall")}</h2>
        </div>
        <p className="muted small os-wall-lead">{selection.includes("brand.wallpaper") ? t("os.wallLead") : t("os.wallOff")}</p>
        <div className="os-walls" role="radiogroup" aria-label={t("os.wall")}>
          {OS_WALLS.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={wall === w.id}
              className={`os-swatch${wall === w.id ? " on" : ""}`}
              disabled={running}
              onClick={() => void chooseWall(w.id)}
            >
              <span className={`os-swatch-tone${w.id === "brume" ? " light" : ""}`} style={{ background: `linear-gradient(180deg, ${w.top}, ${w.bottom})` }}>
                {wall === w.id && <Check size={14} />}
              </span>
              <span className="os-swatch-name">{t(`os.wall.${w.id}` as Key)}</span>
            </button>
          ))}
          {ov.wallpaperCustom && (
            <button
              type="button"
              role="radio"
              aria-checked={wall === "custom"}
              className={`os-swatch${wall === "custom" ? " on" : ""}`}
              disabled={running}
              title={ov.wallpaperCustom}
              onClick={() => void chooseWall("custom")}
            >
              <span className="os-swatch-tone custom">{wall === "custom" ? <Check size={14} /> : <ImageIcon size={15} />}</span>
              <span className="os-swatch-name">{t("os.wall.custom")}</span>
            </button>
          )}
          <button type="button" className="os-swatch add" disabled={running} onClick={() => void pickWall()}>
            <span className="os-swatch-tone add">
              <Plus size={16} />
            </span>
            <span className="os-swatch-name">{t("os.wall.pick")}</span>
          </button>
        </div>
        {wallError && <p className="error-text small os-wall-error">{wallError}</p>}
      </motion.section>

      <div className="os-grid">
        <motion.section variants={rise} className="card os-features">
          <header className="card-head">
            <h3 className="rg-overline">{t("os.features")}</h3>
          </header>
          <p className="muted small os-card-lead">{t("os.featuresLead")}</p>
          {osCatalog.features.map((f) => {
            const on = !!features[f.id];
            return (
              <div key={f.id} className="os-feature">
                <div className="os-feature-main">
                  <div className="os-feature-name">{f.name[lang]}</div>
                  <div className="os-feature-desc muted small">{f.desc[lang]}</div>
                  {f.id === "boot" && (
                    <button type="button" className="link os-feature-link" disabled={!ov.shellInstalled} onClick={() => void api.osPreview()}>
                      <Play size={11} /> {t("os.preview")}
                    </button>
                  )}
                  {f.id === "island" && active && on && (
                    <div className="os-timers">
                      <Timer size={13} />
                      <span className="small muted">{t("os.timer")}</span>
                      {[5, 15, 25].map((m) => (
                        <button key={m} type="button" className={`os-chip${timer === m ? " on" : ""}`} onClick={() => startTimer(m)}>
                          {m} min
                        </button>
                      ))}
                      {timer !== null && (
                        <button
                          type="button"
                          className="os-chip"
                          onClick={() => {
                            void api.osTimer(0);
                            setTimer(null);
                          }}
                        >
                          <Square size={9} /> {t("os.timerStop")}
                        </button>
                      )}
                    </div>
                  )}
                  {f.id === "translucenttb" && !ttb.installed && (
                    <button type="button" className="link os-feature-link" onClick={() => void api.osOpenStore()}>
                      <ExternalLink size={11} /> {t("os.ttbStore")}
                    </button>
                  )}
                  {f.id === "translucenttb" && ttb.stoppedAt && !on && <div className="os-feature-note small">{t("os.ttbStopped", { date: formatDate(lang, ttb.stoppedAt) })}</div>}
                  {f.id === "translucenttb" && notice && <div className="os-feature-note small">{notice}</div>}
                </div>
                <Switch checked={on} disabled={running || (f.id === "translucenttb" && !ttb.installed && !on)} label={f.name[lang]} onChange={(v) => void setFeature(f.id, v)} />
              </div>
            );
          })}
        </motion.section>

        <motion.section variants={rise} className="card os-usage">
          <header className="card-head">
            <h3 className="rg-overline">{t("os.usage")}</h3>
            {usage?.running && <span className="os-live">{t("os.live")}</span>}
          </header>
          <div className="os-meters">
            <div className="os-meter">
              <div className="os-meter-value rg-metric">
                {usage?.running && usage.cpu != null ? formatNumber(lang, usage.cpu, 2) : "0"}
                <span>%</span>
              </div>
              <div className="os-meter-label">{t("os.usage.cpu")}</div>
              <div className="os-meter-bar">
                <i style={{ width: `${Math.min(100, ((usage?.cpu ?? 0) / 1) * 100)}%` }} />
              </div>
            </div>
            <div className="os-meter">
              <div className="os-meter-value rg-metric">
                {usage?.running && usage.ramMb != null ? formatNumber(lang, usage.ramMb, 1) : "0"}
                <span>{t("os.usage.mb")}</span>
              </div>
              <div className="os-meter-label">{t("os.usage.ram")}</div>
              <div className="os-meter-bar">
                <i style={{ width: `${Math.min(100, ((usage?.ramMb ?? 0) / 60) * 100)}%` }} />
              </div>
            </div>
          </div>
          <p className="muted small">{usage?.running ? t("os.usageLead") : t("os.usage.off")}</p>
          <p className="muted small">{t("os.usage.goal")}</p>
          <p className="muted small">{t("os.usage.paused")}</p>
        </motion.section>
      </div>

      <motion.section variants={rise} className="os-block">
        <button type="button" className="section-title section-fold os-fold" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>
          <ChevronDown size={15} className={advanced ? undefined : "folded"} />
          {t("os.advanced")}
          <span className="rg-metric muted">{t("os.advancedCount", { n: selection.length, total: available.length })}</span>
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div key="adv" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
              {osCatalog.categories.map((c) => {
                const list = available.filter((tw) => tw.category === c.id);
                if (!list.length) return null;
                const Icon = ICONS[c.icon] ?? Sparkles;
                return (
                  <div key={c.id} className="os-cat">
                    <div className="os-cat-head">
                      <Icon size={15} strokeWidth={1.75} />
                      <span className="os-cat-name">{c.name[lang]}</span>
                      <span className="rg-metric muted small">
                        {list.filter((tw) => selection.includes(tw.id)).length}/{list.length}
                      </span>
                    </div>
                    <p className="muted small os-cat-lead">{c.lead[lang]}</p>
                    <div className="tweak-list">
                      {list.map((tw) => {
                        const on = selection.includes(tw.id);
                        const st = applied.get(tw.id);
                        const drift = !!st?.applied && !st.inPlace;
                        return (
                          <div key={tw.id} className={`tweak${on ? " on" : ""}`} onClick={() => !running && toggle(tw.id, !on)}>
                            <div className="tweak-main">
                              <div className="tweak-title">
                                <span className="tweak-name">{tw.name[lang]}</span>
                                {tw.reboot === "restart" && <Badge>{t("os.tweak.restart")}</Badge>}
                                {tw.reboot === "explorer" && <Badge>{t("os.tweak.explorer")}</Badge>}
                                {tw.minBuild && tw.minBuild >= 22000 && <Badge tone="info">{t("os.tweak.minBuild", { v: versionOf(tw.minBuild) })}</Badge>}
                                {st?.applied && !drift && <Badge tone="ok">{t("os.tweak.applied")}</Badge>}
                                {drift && <Badge tone="warn">{t("os.tweak.drift")}</Badge>}
                              </div>
                              <div className="tweak-desc">{tw.desc[lang]}</div>
                              {tw.warn && (
                                <div className="os-tweak-warn small">
                                  <AlertTriangle size={12} /> {tw.warn[lang]}
                                </div>
                              )}
                            </div>
                            <div className="tweak-side">
                              <Switch checked={on} disabled={running} label={tw.name[lang]} onChange={(v) => toggle(tw.id, v)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.section variants={rise} className="card os-tips">
        <header className="card-head">
          <h3 className="rg-overline">{t("os.tips")}</h3>
        </header>
        <ul>
          {(["search", "menu", "status", "dock", "island", "game"] as const).map((k) => (
            <li key={k}>
              <b>{t(`os.tip.${k}.key`)}</b>
              {t(`os.tip.${k}`)}
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={rise} className="card os-never">
        <header className="card-head">
          <h3 className="rg-overline">{t("os.never")}</h3>
        </header>
        <ul>
          {(["os.never1", "os.never2", "os.never3", "os.never4"] as const).map((k) => (
            <li key={k}>
              <ShieldCheck size={14} />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="link small" onClick={() => goTo("restore")}>
          {t("os.otherTweaks")} <ArrowRight size={12} />
        </button>
      </motion.section>

      <Modal open={confirmRestore} onClose={() => setConfirmRestore(false)} className="os-confirm">
        <h2 className="modal-title">{t("os.confirm.title")}</h2>
        <p className="modal-lead">{t("os.confirm.lead")}</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setConfirmRestore(false)}>
            {t("os.confirm.cancel")}
          </Button>
          <Button variant="primary" icon={<Undo2 size={14} />} onClick={() => void restoreAll()}>
            {t("os.confirm.go")}
          </Button>
        </div>
      </Modal>

      <OsRun
        run={run}
        rebootFor={rebootFor}
        onClose={() => setRun(null)}
        onSkipRestorePoint={() => run?.request && void start({ ...run.request, skipRestorePoint: true })}
        welcome={!!features.boot && ov.shellInstalled}
      />
    </motion.div>
  );
}

/** Icônes du Dock de l'aperçu : Rago Optimizer, puis des applis courantes ; un point sous celles qui sont ouvertes. */
const DOCK: { icon: LucideIcon; tone: string; open?: boolean }[] = [
  { icon: Folder, tone: "linear-gradient(180deg, #6aa8ff, #2f6fe0)", open: true },
  { icon: Globe, tone: "linear-gradient(180deg, #52d3c5, #13908a)", open: true },
  { icon: Gamepad2, tone: "linear-gradient(180deg, #3b4c6b, #1b2538)" },
  { icon: MessageCircle, tone: "linear-gradient(180deg, #7f89ff, #4c55d8)", open: true },
  { icon: Music2, tone: "linear-gradient(180deg, #ff7a9a, #e0365d)" },
  { icon: Cog, tone: "linear-gradient(180deg, #8f939b, #5a5e66)" },
];

/** Aperçu du bureau Rago OS, dessiné en CSS (rien n'est chargé) : le fond choisi, la barre en haut avec l'île, une
 * fenêtre et le Dock, ou la barre des tâches de Windows quand le Dock est coupé. */
function OsPreview({ active, features, wall }: { active: boolean; features: Record<string, boolean>; wall: string }) {
  const { t, lang } = useStore();
  const tone = OS_WALLS.find((w) => w.id === wall);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = clock.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const bar = !!features.bar;
  return (
    <div className={`os-preview${active ? " on" : ""}`} aria-hidden>
      <div className="os-screen">
        <div className={`os-wall${tone ? "" : " custom"}`} style={tone ? { background: `linear-gradient(180deg, ${tone.top}, ${tone.bottom})` } : undefined}>
          <span className="os-wall-glow" />
          {!tone && (
            <span className="os-wall-label">
              <ImageIcon /> {t("os.wall.custom")}
            </span>
          )}
        </div>
        {bar && (
          <div className="os-bar">
            <span className="os-bar-side">
              <MarkIcon size="1em" />
              <b>Rago Optimizer</b>
            </span>
            <span className="os-bar-side">
              <Wifi />
              <Volume2 />
              <BatteryMedium />
              <Search />
              <SlidersHorizontal />
              <span className="os-bar-clock">{time}</span>
            </span>
          </div>
        )}
        {features.island && (
          <div className={`os-island${bar ? " notch" : ""}`}>
            <span className="os-island-art" />
            <span className="os-island-text">
              <b>{t("os.preview.song")}</b>
              <i>{t("os.preview.artist")}</i>
            </span>
            <span className="os-island-bars">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div className="os-window">
          <div className="os-window-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="os-window-body">
            <i />
            <i />
            <i />
          </div>
        </div>
        {features.dock ? (
          <div className="os-dock">
            <span className="os-dock-icon rago on">
              <MarkIcon size="1em" />
            </span>
            {DOCK.map(({ icon: Icon, tone: bg, open }, i) => (
              <span key={i} className={`os-dock-icon${open ? " on" : ""}`} style={{ background: bg }}>
                <Icon />
              </span>
            ))}
            <i className="os-dock-sep" />
            <span className="os-dock-icon glass">
              <Download />
            </span>
            <span className="os-dock-icon glass">
              <Trash2 />
            </span>
          </div>
        ) : (
          <div className="os-taskbar">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`os-app${i === 1 ? " on" : ""}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OsRun({
  run,
  rebootFor,
  onClose,
  onSkipRestorePoint,
  welcome,
}: {
  run: RunState | null;
  rebootFor: (id: string) => string;
  onClose: () => void;
  onSkipRestorePoint: () => void;
  welcome: boolean;
}) {
  const { t, lang } = useStore();
  const listRef = useRef<HTMLOListElement>(null);
  const runningIndex = run?.rows.findIndex((r) => r.status === "running") ?? -1;
  useEffect(() => {
    if (runningIndex >= 0) listRef.current?.children[runningIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [runningIndex]);
  const host = typeof document !== "undefined" ? document.querySelector(".body") : null;
  if (!host) return null;

  const done = run?.done ?? null;
  const rows = run?.rows ?? [];
  const finished = rows.filter((r) => r.status === "ok" || r.status === "skipped" || r.status === "failed").length;
  const total = rows.length;
  const failed = done?.failed ?? rows.filter((r) => r.status === "failed").length;
  const pct = done && !done.cancelled && !done.restoreFailed ? 100 : total ? (finished / total) * 100 : 0;
  const name = (id: string) => osTweaks.get(id)?.name[lang] ?? id;
  const title = !done
    ? t(run?.kind === "restore" ? "os.run.restore" : "os.run.apply")
    : done.cancelled
      ? t("os.run.cancelled")
      : done.restoreFailed
        ? t("os.run.apply")
        : t(done.kind === "restore" ? "os.run.doneRestore" : "os.run.doneApply");
  const phase = run?.phase;
  const current = !done
    ? phase === "restore_point"
      ? t("os.run.restorePoint")
      : phase === "features"
        ? t("os.run.features")
        : phase === "explorer"
          ? t("os.run.explorer")
          : run?.current
            ? run.kind === "restore" || rows.find((r) => r.id === run.current)?.undo
              ? t("os.run.undo", { name: name(run.current) })
              : name(run.current)
            : ""
    : null;
  // un réglage qui demande un redémarrage est allé au bout
  const restart = !!done?.restart || (!!done?.cancelled && rows.some((r) => r.status === "ok" && rebootFor(r.id) === "restart"));

  return createPortal(
    <AnimatePresence>
      {run && (
        <motion.div className="run os-run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
          <div className="run-hero">
            <Pulse size={132} active={!done} />
            <div className="rg-overline run-state">{title}</div>
            {/* les réglages de Rago OS vont vite : le compteur change sans animation, pour rester lisible */}
            <div className="run-counter rg-metric">
              <span>{String(finished).padStart(2, "0")}</span>
              <span className="run-counter-total">/{String(total).padStart(2, "0")}</span>
            </div>
            <div className="run-progress">
              <motion.div className="run-progress-fill" animate={{ width: `${pct}%` }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.42 }} />
            </div>
            <div className="run-current">
              {!done ? (
                current
              ) : done.restoreFailed ? (
                <span className="error-text">{t("os.run.restoreFailed")}</span>
              ) : done.error ? (
                <span className="error-text">{done.error}</span>
              ) : (
                <>
                  {done.cancelled ? t("os.run.cancelledText") : t(done.kind === "restore" ? "os.run.summaryRestore" : "os.run.summaryApply", { n: done.ok })}
                  {failed > 0 && <div className="error-text">{t("os.run.failed", { n: failed })}</div>}
                  {done.kind === "apply" && !done.cancelled && welcome && <div className="muted">{t("os.run.welcome")}</div>}
                  {restart && <div className="muted">{t("os.run.restart")}</div>}
                </>
              )}
            </div>
            <div className="run-actions">
              {!done ? (
                <Button icon={<Square size={12} />} onClick={() => void api.osCancel()}>
                  {t("os.run.stop")}
                </Button>
              ) : done.restoreFailed ? (
                <>
                  <Button variant="primary" onClick={onSkipRestorePoint}>
                    {t("os.run.continueWithout")}
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    {t("os.run.cancel")}
                  </Button>
                </>
              ) : (
                <>
                  {restart && (
                    <Button variant="primary" icon={<Power size={14} />} onClick={() => void api.restartPc()}>
                      {t("os.restartNow")}
                    </Button>
                  )}
                  <Button variant={restart ? "ghost" : "secondary"} onClick={onClose}>
                    {restart ? t("os.later") : t("os.run.close")}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="run-side">
            <ol className="run-list" ref={listRef}>
              {rows.map((r) => (
                <li key={r.id} className={`run-row ${r.status === "failed" ? "error" : r.status}`}>
                  <span className="run-icon">
                    {r.status === "running" && <RefreshCw size={13} className="spin" />}
                    {r.status === "ok" && <Check size={14} />}
                    {r.status === "failed" && <X size={14} />}
                    {r.status === "pending" && <span className="run-dot" />}
                    {r.status === "skipped" && <Minus size={14} />}
                  </span>
                  <span className="run-name">{r.undo ? t("os.run.undo", { name: name(r.id) }) : name(r.id)}</span>
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
}
