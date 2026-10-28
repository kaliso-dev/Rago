import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, ArrowRight, AudioWaveform, Cable, Check, ChevronDown, CircleX, Cpu, Crosshair, Info, LoaderCircle, Lock, Minus, Plus, Power,
  RotateCcw, Scale, ScanSearch, ScrollText, SlidersHorizontal, Swords, TriangleAlert, Trophy, Wifi, X, type LucideIcon,
} from "lucide-react";
import { api, type NetMeasure } from "../lib/api";
import type { Key } from "../lib/i18n";
import {
  applyPreset, computeNet, DSCP_NAMES, engineText, loadDraft, NET_DEFAULTS, PRESETS, recommend, saveDraft, WINDOWS_VALUES, type NetAction, type NetExpert,
  type NetLine, type NetOptions, type NetOutcome, type NetState, type NetValues, type PresetId, type Why,
} from "../lib/netopt";
import { useStore } from "../lib/store";
import { Button, Segmented, Switch } from "../components/ui";
import { Tool, validTarget } from "../components/NetTools";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const same = (a: NetOptions, b: NetOptions) => JSON.stringify({ ...a, preset: "" }) === JSON.stringify({ ...b, preset: "" });

type Detect = { connected: boolean; wifi: boolean; alias: string | null; desc: string | null; speed: string | null };

const PRESET_ICONS: Record<PresetId, LucideIcon> = { hitreg: Crosshair, knockback: Swords, balanced: Scale, wifi: Wifi, unstable: AudioWaveform, classic: Trophy };

/** Blocs repliés (Avancé, Réglages experts), gardés d'une visite à l'autre. */
const FOLDS = "rago.netoptFolds";
type FoldId = "advanced" | "expert";
function loadFolds(): Record<FoldId, boolean> {
  try {
    return { advanced: false, expert: false, ...(JSON.parse(localStorage.getItem(FOLDS) ?? "{}") as Partial<Record<FoldId, boolean>>) };
  } catch {
    return { advanced: false, expert: false };
  }
}

/** « Analyser mon PC » : carte réseau, processeur et Windows, puis 40 pings vers Internet. */
interface Scan {
  step: "card" | "pc" | "line" | "done";
  before: NetOptions;
  card?: Detect | null;
  pc?: { cpu: string; threads: number; win: string };
  samples: number;
  measure?: NetMeasure | null;
  advice?: { preset: PresetId; options: NetOptions; why: Why[] };
}
const LINE_SAMPLES = 40;

export function NetOpt() {
  const { t, lang, premium, setUpsell, sys } = useStore();
  const [state, setState] = useState<NetState | null>(null);
  const [opts, setOpts] = useState<NetOptions>(() => loadDraft() ?? NET_DEFAULTS);
  const [detect, setDetect] = useState<Detect | null>(null);
  const [busy, setBusy] = useState<NetAction | null>(null);
  const [lines, setLines] = useState<NetLine[]>([]);
  const [progress, setProgress] = useState<{ step: number; total: number } | null>(null);
  const [done, setDone] = useState<{ action: NetAction; outcome: NetOutcome } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | undefined>(undefined);
  const [showLog, setShowLog] = useState(false);
  const [restoreMenu, setRestoreMenu] = useState(false);
  const [folds, setFolds] = useState(loadFolds);
  const [scan, setScan] = useState<Scan | null>(null);
  const live = useRef(true);
  const touched = useRef(loadDraft() !== null);

  const refresh = useCallback(async () => {
    const s = await api.netOptState();
    if (!live.current) return s;
    setState(s);
    return s;
  }, []);

  useEffect(() => {
    live.current = true;
    const subs = [
      api.onNetOptLine((l) => {
        if (!live.current) return;
        if (l.tag === "progress") setProgress({ step: l.step ?? 0, total: l.total ?? 0 });
        else setLines((ls) => [...ls, l]);
      }),
      api.onNetSample((s) => {
        if (live.current && s.id === "internet") setScan((sc) => (sc?.step === "line" ? { ...sc, samples: Math.max(sc.samples, s.i + 1) } : sc));
      }),
    ];
    void (async () => {
      const s = await refresh();
      // pas de brouillon : les réglages de la dernière application
      if (!touched.current && s.applied) setOpts({ ...NET_DEFAULTS, ...s.applied.options });
      const d = await api.netOptRun("detect").catch(() => null);
      const r = d?.result as (Detect & { kind: string }) | undefined;
      if (!live.current || !r) return;
      setDetect(r);
      // première visite : le type de connexion d'après la carte utilisée
      if (!touched.current && !s.applied && r.wifi) setOpts((o) => ({ ...o, line: 5, wifi: true }));
    })();
    return () => {
      live.current = false;
      for (const sub of subs) void sub.then((un) => un());
    };
  }, [refresh]);

  const v = useMemo(() => computeNet(opts), [opts]);
  const applied = state?.applied ?? null;
  const dirty = applied ? !same(opts, { ...NET_DEFAULTS, ...applied.options }) : true;

  const change = (patch: Partial<NetOptions>) => {
    touched.current = true;
    setOpts((o) => {
      const next = { ...o, ...patch, preset: "preset" in patch ? patch.preset! : "custom" };
      saveDraft(next);
      return next;
    });
  };
  const setExpert = (patch: Partial<NetExpert>) => change({ expert: { ...opts.expert, ...patch } });
  const pickPreset = (id: PresetId) => change(applyPreset(opts, id));
  const fold = (id: FoldId) =>
    setFolds((f) => {
      const next = { ...f, [id]: !f[id] };
      try {
        localStorage.setItem(FOLDS, JSON.stringify(next));
      } catch {
        /* stockage indisponible : les blocs se replient à la prochaine visite */
      }
      return next;
    });

  const errorText = (e: unknown) => {
    const m = String(e);
    if (m.startsWith("busy")) return t("no.busy");
    if (m.startsWith("premium_scripts_unavailable")) return t("err.premium_scripts_unavailable");
    return m;
  };

  const run = async (action: NetAction) => {
    if (busy) return;
    if (action === "apply" && !premium) return setUpsell("tweak");
    setBusy(action);
    setError(null);
    setDone(null);
    setRestoreMenu(false);
    if (action === "apply" || action === "restore" || action === "defaults") {
      setLines([]);
      setProgress(null);
    }
    try {
      const outcome = await api.netOptRun(action, opts);
      if (!live.current) return;
      if (action === "apply" || action === "restore" || action === "defaults") {
        setDone({ action, outcome });
        if (outcome.code === 0) saveDraft(null);
        await refresh();
      } else if (action === "status" && outcome.result) {
        setStatus(outcome.result);
      }
    } catch (e) {
      if (!live.current) return;
      if (String(e).startsWith("premium_required")) setUpsell("tweak");
      else setError(errorText(e));
    } finally {
      if (live.current) {
        setBusy(null);
        setProgress(null);
      }
    }
  };

  const scanning = !!scan && scan.step !== "done";
  const analyse = async () => {
    if (busy || scanning) return;
    const before = opts;
    setScan({ step: "card", before, samples: 0 });
    const d = await api.netOptRun("detect").catch(() => null);
    if (!live.current) return;
    const card = (d?.result as Detect | undefined) ?? null;
    if (card) setDetect(card);
    const pc = { cpu: sys?.cpuName ?? "", threads: sys?.cpuThreads ?? 0, win: sys?.osName ?? "" };
    setScan((s) => s && { ...s, step: "line", card, pc });
    const out = await api.netTest(["internet"]).catch(() => [] as NetMeasure[]);
    if (!live.current) return;
    const m = out.find((x) => x.id === "internet") ?? null;
    // carte introuvable : le type de connexion choisi dans la page fait foi
    const advice = recommend(before, { wifi: card?.connected ? card.wifi : before.line === 5, threads: pc.threads }, m?.ping != null ? m : null);
    touched.current = true;
    setOpts(advice.options);
    saveDraft(advice.options);
    setScan((s) => s && { ...s, step: "done", measure: m, advice });
  };
  const keepMine = () => {
    if (!scan) return;
    setOpts(scan.before);
    saveDraft(applied && same(scan.before, { ...NET_DEFAULTS, ...applied.options }) ? null : scan.before);
    setScan(null);
  };

  const presetName = (p: string) => (PRESETS.includes(p as PresetId) ? t(`no.preset.${p}` as Key) : t("no.preset.custom"));
  const when = (ts: number) => {
    const d = new Date(ts);
    const loc = lang === "fr" ? "fr-FR" : "en-US";
    return `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })} ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}`;
  };
  const changing = busy === "apply" || busy === "restore" || busy === "defaults";
  const pct = progress && progress.total ? Math.min(100, (progress.step / progress.total) * 100) : changing ? 4 : 0;
  const buffersOff = [v.throttlingOff, v.rscOff, v.coalescingOff, v.flowControlOff, v.lsoOff, v.interruptModeration === 2].filter(Boolean).length;
  const respName = opts.responsiveness < 34 ? t("no.resp.delayed") : opts.responsiveness < 67 ? t("no.resp.balanced") : t("no.resp.responsive");
  const win11 = !!sys?.isWin11;
  const cardName = (d: Detect | null | undefined) => [d?.alias, d?.desc, d?.speed].filter(Boolean).join(" · ");
  const advancedSummary = [
    opts.mtuMode === 1 ? t("no.sum.mtuAuto") : opts.mtuMode === 2 ? `MTU ${opts.mtu}` : t("no.sum.mtuKeep"),
    opts.delay === 0 ? t("no.delay.none") : t("no.sum.delay", { n: opts.delay }),
    !opts.smart || v.dscp === 0 ? t("no.prio.none") : `DSCP ${v.dscp}${v.dscpName ? ` ${v.dscpName}` : ""}`,
    t("no.sum.options", { n: [opts.priorityMode, opts.powerSaving, opts.wifi, opts.bgGuard].filter(Boolean).length }),
  ].join(" · ");
  const expertCount = Object.values(opts.expert).filter((x) => x != null).length;

  return (
    <motion.div className="netopt" variants={stagger} initial="initial" animate="animate">
      <motion.section variants={rise} className="card no-hero">
        <div className="no-hero-main">
          <div className={`no-hero-orb${applied ? " on" : ""}${changing ? " busy" : ""}`}>
            {changing ? <LoaderCircle size={22} className="spin" /> : <Activity size={22} />}
          </div>
          <div className="no-hero-text">
            <div className="no-hero-title">
              {changing
                ? t(busy === "apply" ? "no.applying" : "no.restoring")
                : applied
                  ? t("no.status.applied", { when: when(applied.at), preset: presetName(applied.options.preset) })
                  : t("no.status.never")}
            </div>
            <div className="no-hero-sub muted small">
              {detect?.connected && (
                <span className="no-detected">
                  {detect.wifi ? <Wifi size={12} /> : <Cable size={12} />}
                  <span className="no-detected-text" title={cardName(detect)}>
                    {t("no.detected", { name: cardName(detect) })}
                  </span>
                </span>
              )}
              {applied && dirty && !changing && <span className="no-dirty">{t("no.status.changed")}</span>}
            </div>
          </div>
          <div className="no-hero-actions">
            <Button variant="secondary" size="lg" icon={scanning ? <LoaderCircle size={14} className="spin" /> : <ScanSearch size={15} />} disabled={!!busy || scanning} onClick={() => void analyse()}>
              {t("an.run")}
            </Button>
            <div className="no-restore">
              <Button
                variant="secondary"
                size="lg"
                icon={<RotateCcw size={14} />}
                disabled={!!busy || (!applied && !state?.backup)}
                onClick={() => setRestoreMenu((m) => !m)}
              >
                {t("no.restore")}
              </Button>
              <AnimatePresence>
                {restoreMenu && (
                  <motion.div
                    className="no-menu"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                  >
                    <button type="button" disabled={!state?.backup} onClick={() => void run("restore")}>
                      <span>{t("no.restore.backup")}</span>
                      <span className="muted small">{t("no.restore.backup.desc")}</span>
                    </button>
                    <button type="button" onClick={() => void run("defaults")}>
                      <span>{t("no.restore.defaults")}</span>
                      <span className="muted small">{t("no.restore.defaults.desc")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={!!busy || scanning}
              icon={busy === "apply" ? <LoaderCircle size={15} className="spin" /> : !premium ? <Lock size={14} /> : undefined}
              onClick={() => void run("apply")}
            >
              {t("no.apply")}
              {!busy && premium && <ArrowRight size={15} />}
            </Button>
          </div>
        </div>
        <div className="no-hero-foot muted small">
          <Info size={12} />
          <span>{t("no.drop")}</span>
          {!premium && <span className="no-free">{t("no.free")}</span>}
        </div>

        <AnimatePresence initial={false}>
          {(changing || done || error) && (
            <motion.div className="no-run" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {changing && (
                <div className="no-progress">
                  <motion.div className="no-progress-fill" animate={{ width: `${pct}%` }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.42 }} />
                </div>
              )}
              {changing && <div className="no-current muted small">{engineText([...lines].reverse().find((l) => l.tag === "title")?.text ?? "…", lang)}</div>}
              {done && <Summary done={done} t={t} />}
              {error && (
                <div className="no-error">
                  <CircleX size={14} />
                  {error}
                </div>
              )}
              {lines.length > 0 && (
                <button type="button" className="link no-log-toggle" onClick={() => setShowLog((s) => !s)}>
                  <ScrollText size={13} />
                  {t("no.log")}
                  <ChevronDown size={13} className={showLog ? "flip" : undefined} />
                </button>
              )}
              {showLog && <Log lines={lines} />}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <AnimatePresence initial={false}>
        {scan && (
          <motion.section
            key="scan"
            className="card no-scan"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <ScanPanel
              scan={scan}
              cardName={cardName}
              presetName={presetName}
              premium={premium}
              onApply={() => {
                setScan(null);
                void run("apply");
              }}
              onKeep={keepMine}
              onClose={() => setScan(null)}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <motion.section variants={rise} className="no-presets" role="radiogroup" aria-label={t("no.presets")}>
        {PRESETS.map((p) => {
          const Icon = PRESET_ICONS[p];
          const on = opts.preset === p;
          return (
            <button key={p} type="button" role="radio" aria-checked={on} className={`no-preset${on ? " on" : ""}`} onClick={() => pickPreset(p)}>
              <span className="no-preset-icon">
                <Icon size={17} strokeWidth={1.75} />
              </span>
              <span className="no-preset-text">
                <span className="no-preset-name">
                  {t(`no.preset.${p}` as Key)}
                  {scan?.advice?.preset === p && <span className="no-preset-tag">{t("an.tag")}</span>}
                </span>
                <span className="no-preset-desc">{t(`no.preset.${p}.desc` as Key)}</span>
              </span>
              {on && <Check size={14} className="no-preset-check" />}
            </button>
          );
        })}
      </motion.section>

      <div className="no-layout">
        <div className="no-main">
          <motion.section variants={rise} className="card no-section">
            <header className="card-head">
              <h3 className="rg-overline">{t("no.settings")}</h3>
              {opts.preset === "custom" && <span className="no-custom rg-metric">{t("no.preset.custom")}</span>}
            </header>
            <Slider
              label={t("no.latency")}
              value={opts.latency}
              display={String(opts.latency)}
              onChange={(latency) => change({ latency })}
              min={t("no.latency.min")}
              max={t("no.latency.max")}
              mid={t("no.latency.mid", { n: buffersOff })}
            />
            <Slider
              label={t("no.resp")}
              value={opts.responsiveness}
              display={`${respName} · ${opts.responsiveness}`}
              onChange={(responsiveness) => change({ responsiveness })}
              min={t("no.resp.min")}
              max={t("no.resp.max")}
            >
              <div className="no-slider-extra">
                <div className="no-chips">
                  {([
                    [0, "no.resp.delayed"],
                    [50, "no.resp.balanced"],
                    [100, "no.resp.responsive"],
                  ] as const).map(([n, k]) => (
                    <button key={n} type="button" className={`no-chip${opts.responsiveness === n ? " on" : ""}`} onClick={() => change({ responsiveness: n })}>
                      {t(k)}
                    </button>
                  ))}
                </div>
                <span className="muted small no-resp-mid">{t("no.resp.mid", { irto: v.initialRto, sr: v.systemResponsiveness })}</span>
              </div>
            </Slider>
            <div className="no-selects">
              <Select
                label={t("no.tuning")}
                value={opts.tuning}
                onChange={(tuning) => change({ tuning })}
                options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 0 ? `${t("no.tuning.0")} · ${v.autoTuning}` : t(`no.tuning.${n}` as Key) }))}
              />
              <Select
                label={t("no.line")}
                value={opts.line}
                onChange={(line) => change({ line, wifi: line === 5 ? true : opts.line === 5 ? false : opts.wifi })}
                options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: t(`no.line.${n}` as Key) }))}
              />
            </div>
            <div className="no-toggles">
              <Toggle title={t("no.smart")} desc={t("no.smart.desc")} checked={opts.smart} onChange={(smart) => change({ smart })} />
              <Toggle title={t("no.stable")} desc={t("no.stable.desc")} checked={!opts.stable} onChange={(on) => change({ stable: !on })} />
              <Toggle title={t("no.competitive")} desc={t("no.competitive.desc")} checked={opts.competitive} onChange={(competitive) => change({ competitive })} />
            </div>
          </motion.section>

          <motion.div variants={rise}>
            <Fold title={t("no.advanced")} summary={advancedSummary} open={folds.advanced} onToggle={() => fold("advanced")}>
              <div className="no-toggles">
                <div className="no-toggle no-mtu">
                  <div className="no-toggle-text">
                    <div className="no-toggle-title">{t("no.mtu")}</div>
                    <div className="no-toggle-desc">{t("no.mtu.desc")}</div>
                  </div>
                  {opts.mtuMode !== 1 && (
                    <input
                      className="input no-mtu-input"
                      inputMode="numeric"
                      placeholder={t("no.mtu.keep")}
                      aria-label={t("no.mtu.manual")}
                      value={opts.mtuMode === 2 ? String(opts.mtu) : ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                        change(Number.isNaN(n) ? { mtuMode: 0 } : { mtuMode: 2, mtu: Math.min(n, 1500) });
                      }}
                      onBlur={() => opts.mtuMode === 2 && opts.mtu < 576 && change({ mtu: 576 })}
                    />
                  )}
                  <span className="no-mtu-auto muted small">{t("no.mtu.auto")}</span>
                  <Switch checked={opts.mtuMode === 1} onChange={(on) => change({ mtuMode: on ? 1 : 0 })} label={t("no.mtu.auto")} />
                </div>
                {opts.mtuMode === 1 && (
                  <label className="no-toggle no-target-row">
                    <div className="no-toggle-text">
                      <div className="no-toggle-title">{t("no.target")}</div>
                      <div className="no-toggle-desc">{t("no.target.desc")}</div>
                      {!validTarget(opts.target) && <div className="no-bad small">{t("no.target.bad")}</div>}
                    </div>
                    <input
                      className={`input no-target-input${validTarget(opts.target) ? "" : " bad"}`}
                      value={opts.target}
                      spellCheck={false}
                      maxLength={253}
                      onChange={(e) => change({ target: e.target.value.trim(), preset: opts.preset })}
                    />
                  </label>
                )}
              </div>
              <Slider
                label={t("no.delay")}
                value={opts.delay}
                display={opts.delay === 0 ? t("no.delay.none") : String(opts.delay)}
                onChange={(delay) => change({ delay })}
                min={t("no.delay.min")}
                max={t("no.delay.max")}
                mid={t("no.delay.mid", { f: v.ackFrequency, t: v.ackTimeout, nagle: v.noDelay ? t("no.delay.nagleOff") : t("no.delay.nagleOn") })}
              />
              <Slider
                label={t("no.prio")}
                value={opts.priority}
                display={v.dscp === 0 ? t("no.prio.none") : `DSCP ${v.dscp}${v.dscpName ? ` ${v.dscpName}` : ""}`}
                onChange={(priority) => change({ priority })}
                min={t("no.prio.min")}
                max={t("no.prio.max")}
                mid={opts.smart ? t("no.prio.mid") : t("no.prio.off")}
                warn={!opts.smart}
              />
              <div className="no-selects">
                <Select
                  label={t("no.ccp")}
                  value={opts.congestion}
                  onChange={(congestion) => change({ congestion })}
                  options={[0, 1, 2, 3, 4, 5].filter((n) => n !== 5 || win11 || opts.congestion === 5).map((n) => ({ value: n, label: t(`no.ccp.${n}` as Key) }))}
                />
              </div>
              <div className="no-toggles">
                <Toggle title={t("no.pmode")} desc={t("no.pmode.desc")} checked={opts.priorityMode} onChange={(priorityMode) => change({ priorityMode })} />
                <Toggle title={t("no.nps")} desc={t("no.nps.desc")} checked={opts.powerSaving} onChange={(powerSaving) => change({ powerSaving })} />
                <Toggle title={t("no.wifi")} desc={t("no.wifi.desc")} checked={opts.wifi} onChange={(wifi) => change({ wifi })} />
                <Toggle title={t("no.bguard")} desc={t("no.bguard.desc")} checked={opts.bgGuard} onChange={(bgGuard) => change({ bgGuard })} />
              </div>
            </Fold>
          </motion.div>

          <motion.div variants={rise}>
            <Fold
              title={t("no.expert")}
              icon={<SlidersHorizontal size={12} />}
              summary={expertCount ? t("no.x.count", { n: expertCount }) : t("no.x.none")}
              open={folds.expert}
              onToggle={() => fold("expert")}
            >
              <Expert o={opts} v={v} count={expertCount} set={setExpert} clear={() => change({ expert: {} })} t={t} />
            </Fold>
          </motion.div>
        </div>

        <aside className="no-aside">
          <motion.section variants={rise} className="card no-changes">
            <header className="card-head">
              <h3 className="rg-overline">{t("no.changes")}</h3>
              <span className="muted small">{t("no.changes.head")}</span>
            </header>
            <Changes o={opts} v={v} buffersOff={buffersOff} t={t} />
          </motion.section>
          <motion.section variants={rise} className="card no-section no-state">
            <Tool id="status" running={busy === "status"} disabled={!!busy} result={status} progress={busy === "status" ? progress : null} onRun={() => void run("status")} />
          </motion.section>
          <motion.section variants={rise} className="card no-section no-honest">
            <header className="card-head">
              <h3 className="rg-overline">{t("no.honest.title")}</h3>
            </header>
            <p className="small">{t("no.honest.text")}</p>
          </motion.section>
        </aside>
      </div>
    </motion.div>
  );
}

function Fold({ title, icon, summary, open, onToggle, children }: { title: string; icon?: ReactNode; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className={`card no-section no-fold${open ? " open" : ""}`}>
      <button type="button" className="no-fold-head" aria-expanded={open} onClick={onToggle}>
        <h3 className="rg-overline">
          {icon}
          {title}
        </h3>
        {!open && <span className="no-fold-sum muted small">{summary}</span>}
        <ChevronDown size={15} className={open ? "flip" : undefined} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="no-fold-body">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Ce que ces réglages changent dans Windows : sa valeur à gauche, la nouvelle à droite (netopt.rs, `compute`). */
function Changes({ o, v, buffersOff, t }: { o: NetOptions; v: NetValues; buffersOff: number; t: T }) {
  const w = WINDOWS_VALUES;
  const im = (n: number) => t(`no.v.im.${n}` as Key);
  const dscp = (x: NetValues, on: boolean) => (!on || x.dscp === 0 ? t("no.v.none") : `${x.dscp}${x.dscpName ? ` ${x.dscpName}` : ""}`);
  const yes = (b: boolean) => (b ? t("no.x.on") : t("no.x.off"));
  const tuning = (s: string) => (s === "keep" ? t("no.v.keep") : s);
  const rows: [Key, string, string][] = [
    ["no.v.buffers", "0/6", `${buffersOff}/6`],
    ["no.v.im", im(0), im(v.interruptModeration)],
    ["no.v.minRto", `${w.minRto} ms`, `${v.minRto} ms`],
    ["no.v.initialRto", `${w.initialRto} ms`, `${v.initialRto} ms`],
    ["no.v.ack", t("no.v.ackValue", { f: w.ackFrequency, t: w.ackTimeout }), t("no.v.ackValue", { f: v.ackFrequency, t: v.ackTimeout })],
    ["no.v.nagle", t("no.delay.nagleOn"), v.noDelay ? t("no.delay.nagleOff") : t("no.delay.nagleOn")],
    ["no.v.dscp", t("no.v.none"), dscp(v, o.smart)],
    ["no.v.tuning", w.tuning, tuning(v.tuning)],
    ["no.v.sysResp", String(w.systemResponsiveness), String(v.systemResponsiveness)],
    ["no.v.timestamps", yes(w.timestamps), yes(v.timestamps)],
    ["no.v.mtu", t("no.v.keep"), o.mtuMode === 1 ? t("no.v.auto") : o.mtuMode === 2 ? String(o.mtu) : t("no.v.keep")],
  ];
  return (
    <dl className="no-values">
      {rows.map(([k, from, to]) => (
        <div key={k} className={`no-value${from !== to ? " changed" : ""}`}>
          <dt>{t(k)}</dt>
          <dd className="rg-metric">
            {from !== to && <span className="no-value-from">{from}</span>}
            <span className="no-value-to">{to}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ScanPanel({
  scan,
  cardName,
  presetName,
  premium,
  onApply,
  onKeep,
  onClose,
}: {
  scan: Scan;
  cardName: (d: Detect | null | undefined) => string;
  presetName: (p: string) => string;
  premium: boolean;
  onApply: () => void;
  onKeep: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useStore();
  const order = ["card", "pc", "line", "done"] as const;
  const at = order.indexOf(scan.step);
  const state = (s: (typeof order)[number]) => (order.indexOf(s) < at ? "done" : order.indexOf(s) === at ? "now" : "next");
  const dec = (x: number | null | undefined) => (x == null ? "—" : (Math.round(x * 10) / 10).toLocaleString(lang === "fr" ? "fr-FR" : "en-US"));
  const m = scan.measure;
  const lost = m ? (m.lost ?? Math.round(m.loss * m.samples)) : 0;
  const advice = scan.advice;
  const Icon = advice ? PRESET_ICONS[advice.preset] : ScanSearch;
  const steps: { id: "card" | "pc" | "line"; icon: LucideIcon; title: Key; text: string | null }[] = [
    {
      id: "card",
      icon: scan.card?.wifi ? Wifi : Cable,
      title: "an.step.card",
      text: scan.card === undefined ? null : scan.card?.connected ? `${scan.card.wifi ? "Wi-Fi" : t("an.wired")} · ${cardName(scan.card)}` : t("an.card.none"),
    },
    {
      id: "pc",
      icon: Cpu,
      title: "an.step.pc",
      text: scan.pc ? [scan.pc.cpu, scan.pc.threads ? t("an.threads", { n: scan.pc.threads }) : "", scan.pc.win].filter(Boolean).join(" · ") || "—" : null,
    },
    {
      id: "line",
      icon: Activity,
      title: "an.step.line",
      text:
        m === undefined
          ? scan.step === "line"
            ? t("an.line.running", { i: scan.samples, n: LINE_SAMPLES })
            : null
          : m?.ping != null
            ? t("an.line.result", { avg: dec(m.ping), jitter: dec(m.jitter), lost, n: m.samples })
            : t("an.line.none"),
    },
  ];
  return (
    <>
      <header className="card-head">
        <h3 className="rg-overline">
          <ScanSearch size={12} />
          {t("an.title")}
        </h3>
        <button type="button" className="icon-btn" aria-label={t("an.close")} onClick={scan.step === "done" ? onKeep : onClose} disabled={scan.step !== "done"}>
          <X size={14} />
        </button>
      </header>
      <div className="no-scan-body">
        <ol className="no-scan-steps">
          {steps.map(({ id, icon: StepIcon, title, text }) => {
            const s = state(id);
            return (
              <li key={id} className={`no-scan-step ${s}`}>
                <span className="no-scan-mark">{s === "done" ? <Check size={13} /> : s === "now" ? <LoaderCircle size={13} className="spin" /> : <StepIcon size={13} />}</span>
                <div className="no-scan-text">
                  <div className="no-scan-title">{t(title)}</div>
                  {text && <div className="no-scan-desc muted small">{text}</div>}
                  {id === "line" && s === "now" && (
                    <div className="no-progress no-scan-progress">
                      <motion.div className="no-progress-fill" animate={{ width: `${Math.max(4, (scan.samples / LINE_SAMPLES) * 100)}%` }} transition={{ duration: 0.25 }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className={`no-scan-result${advice ? " ready" : ""}`}>
          <div className="no-scan-pick">
            <span className="no-scan-icon">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <div>
              <div className="rg-overline">{t("an.pick")}</div>
              <div className="no-scan-name">{advice ? presetName(advice.preset) : t("an.wait")}</div>
            </div>
          </div>
          {advice && (
            <>
              <ul className="no-scan-why">
                {advice.why.map((w, i) => (
                  <li key={i}>{t(w.key, w.vars && Object.fromEntries(Object.entries(w.vars).map(([k, x]) => [k, typeof x === "number" ? dec(x) : x])))}</li>
                ))}
              </ul>
              <p className="muted small">{t("an.note")}</p>
              <div className="no-scan-actions">
                <Button variant="primary" icon={!premium ? <Lock size={13} /> : undefined} onClick={onApply}>
                  {t("an.apply")}
                  {premium && <ArrowRight size={14} />}
                </Button>
                <Button variant="ghost" onClick={onKeep}>
                  {t("an.keep")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

type T = (key: Key, vars?: Record<string, string | number>) => string;

function Summary({ done, t }: { done: { action: NetAction; outcome: NetOutcome }; t: T }) {
  const { action, outcome } = done;
  const ok = outcome.code === 0;
  const head = action === "apply" ? t("no.done.apply", { ok: outcome.ok }) : action === "restore" ? t("no.done.restore") : t("no.done.defaults");
  return (
    <div className={`no-summary${ok ? "" : " bad"}`}>
      <div className="no-summary-head">
        {ok ? <Check size={15} /> : <CircleX size={15} />}
        <span>{head}</span>
        {outcome.warn > 0 && <span className="no-tag warn">{t("no.done.warn", { n: outcome.warn })}</span>}
        {outcome.fail > 0 && <span className="no-tag fail">{t("no.done.fail", { n: outcome.fail })}</span>}
      </div>
      {ok && (
        <div className="no-reboot">
          <span className="muted small">{t("no.reboot")}</span>
          <Button size="sm" icon={<Power size={13} />} onClick={() => void api.restartPc()}>
            {t("no.rebootNow")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Log({ lines }: { lines: NetLine[] }) {
  const { lang } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <div className="no-log rg-metric" ref={ref}>
      {lines.map((l, i) =>
        l.tag === "title" ? (
          <div key={i} className="no-log-title">
            {engineText(l.text, lang)}
          </div>
        ) : (
          <div key={i} className={`no-log-line ${l.tag}`}>
            <span className="no-log-mark">{l.tag === "ok" ? "✓" : l.tag === "warn" ? "!" : l.tag === "fail" ? "✕" : "·"}</span>
            {l.text}
          </div>
        ),
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  onChange,
  min,
  max,
  mid,
  warn,
  children,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
  min: string;
  max: string;
  mid?: string;
  warn?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="no-slider">
      <div className="no-slider-head">
        <span className="no-slider-label">{label}</span>
        <span className="no-slider-value">{display}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        style={{ "--pct": `${value}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="no-slider-ends muted">
        <span>{min}</span>
        {mid && <span className={`no-slider-mid${warn ? " warn" : ""}`}>{mid}</span>}
        <span>{max}</span>
      </div>
      {children}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <label className="no-select">
      <span className="no-select-label">{label}</span>
      <span className="no-select-box">
        <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </span>
    </label>
  );
}

function Toggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="no-toggle" onClick={() => onChange(!checked)}>
      <div className="no-toggle-text">
        <div className="no-toggle-title">{title}</div>
        <div className="no-toggle-desc">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Réglages experts : chaque valeur calculée par les curseurs, laissée en Auto ou remplacée à la main (NetExpert, null = Auto). */
type NumId = "minRto" | "initialRto" | "icw" | "ackFrequency" | "ackTimeout" | "dscp";
type BoolId = "timestamps" | "ecn" | "interruptModeration";
const NUM_ROWS: Record<NumId, { min: number; max: number; step: number; unit: "ms" | "packets" | "" }> = {
  minRto: { min: 20, max: 300, step: 10, unit: "ms" },
  initialRto: { min: 300, max: 3000, step: 100, unit: "ms" },
  icw: { min: 2, max: 64, step: 1, unit: "packets" },
  ackFrequency: { min: 1, max: 255, step: 1, unit: "packets" },
  ackTimeout: { min: 10, max: 600, step: 10, unit: "ms" },
  dscp: { min: 0, max: 63, step: 1, unit: "" },
};
const GROUPS: { id: Key; rows: (NumId | BoolId)[] }[] = [
  { id: "no.x.group.resend", rows: ["minRto", "initialRto"] },
  { id: "no.x.group.ack", rows: ["ackFrequency", "ackTimeout"] },
  { id: "no.x.group.send", rows: ["icw", "dscp"] },
  { id: "no.x.group.card", rows: ["timestamps", "ecn", "interruptModeration"] },
];

function Expert({ o, v, count, set, clear, t }: { o: NetOptions; v: NetValues; count: number; set: (p: Partial<NetExpert>) => void; clear: () => void; t: T }) {
  const w = WINDOWS_VALUES;
  const x = o.expert;
  const unit = (id: NumId, n: number) => (id === "dscp" ? (DSCP_NAMES[n] ?? "") : NUM_ROWS[id].unit === "packets" ? t("no.x.packets", { n }) : NUM_ROWS[id].unit);
  const show = (id: NumId, n: number) => `${n} ${unit(id, n)}`.trim();
  const onOff = (b: boolean) => (b ? t("no.x.on") : t("no.x.off"));
  const im = (n: number) => (n === 1 ? t("no.v.im.1").replace(/^./, (c) => c.toUpperCase()) : onOff(n !== 2));
  const autoNum: Record<NumId, string> = {
    minRto: show("minRto", v.minRto),
    initialRto: show("initialRto", v.initialRto),
    icw: show("icw", 10),
    ackFrequency: show("ackFrequency", v.ackFrequency),
    ackTimeout: show("ackTimeout", v.ackTimeout),
    dscp: !o.smart || v.dscp === 0 ? t("no.v.none") : show("dscp", v.dscp),
  };
  const winNum: Record<NumId, string> = {
    minRto: show("minRto", w.minRto),
    initialRto: show("initialRto", w.initialRto),
    icw: show("icw", 10),
    ackFrequency: show("ackFrequency", w.ackFrequency),
    ackTimeout: show("ackTimeout", w.ackTimeout),
    dscp: t("no.v.none"),
  };
  const autoNumValue: Record<NumId, number> = { minRto: v.minRto, initialRto: v.initialRto, icw: 10, ackFrequency: v.ackFrequency, ackTimeout: v.ackTimeout, dscp: v.dscp };
  const autoBool: Record<BoolId, string> = { timestamps: onOff(v.timestamps), ecn: onOff(v.ecn), interruptModeration: im(v.interruptModeration) };
  const winBool: Record<BoolId, string> = { timestamps: onOff(w.timestamps), ecn: onOff(false), interruptModeration: onOff(true) };
  const warn = (id: NumId | BoolId): Key | null => {
    const n = x[id];
    if (n == null) return null;
    if (id === "minRto") return (n as number) < 60 ? "no.x.warn.minRto" : null;
    if (id === "icw") return (n as number) > 32 ? "no.x.warn.icw" : null;
    if (id === "ackFrequency") return (n as number) > 2 ? "no.x.warn.ackFrequency" : null;
    if (id === "ackTimeout") return (n as number) > 200 ? "no.x.warn.ackTimeout" : null;
    if (id === "dscp") return o.smart ? null : "no.x.warn.dscp";
    if (id === "ecn") return n === true ? "no.x.warn.ecn" : null;
    return null;
  };
  return (
    <div className="no-x">
      <div className="no-x-intro">
        <Info size={15} />
        <div>
          <div className="no-x-intro-title">{t("no.x.introTitle")}</div>
          <p className="small">{t("no.x.intro")}</p>
          <p className="muted small">{t("no.x.note")}</p>
        </div>
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className="no-x-group">
          <h4 className="rg-overline">{t(g.id)}</h4>
          <div className="no-x-list">
          {g.rows.map((id) => {
            const manual = x[id] != null;
            const tip = warn(id);
            const isNum = id in NUM_ROWS;
            const r = isNum ? NUM_ROWS[id as NumId] : null;
            return (
              <div key={id} className={`no-x-row${manual ? " manual" : ""}`}>
                <div className="no-x-text">
                  <div className="no-x-title">
                    {t(`no.x.${id}` as Key)}
                    {manual && <span className="no-x-badge">{t("no.x.manual")}</span>}
                  </div>
                  <div className="no-x-desc">{t(`no.x.${id}.desc` as Key)}</div>
                  <div className="no-x-meta rg-metric">
                    {r && `${t("no.x.range", { min: r.min, max: r.max, unit: id === "dscp" ? "" : unit(id as NumId, r.max) }).trim()} · `}
                    {t("no.x.windows", { v: isNum ? winNum[id as NumId] : winBool[id as BoolId] })}
                  </div>
                </div>
                <div className="no-x-ctl">
                  {isNum ? (
                    <>
                      <Segmented
                        value={manual ? "manual" : "auto"}
                        options={[
                          { id: "auto", label: t("no.x.auto") },
                          { id: "manual", label: t("no.x.manual") },
                        ]}
                        onChange={(m) => set({ [id]: m === "auto" ? null : autoNumValue[id as NumId] })}
                        layoutId={`no-x-${id}`}
                      />
                      {manual ? (
                        <Stepper
                          value={x[id] as number}
                          {...r!}
                          unit={(n) => unit(id as NumId, n)}
                          onChange={(n) => set({ [id]: n })}
                          t={t}
                        />
                      ) : (
                        <span className="no-x-auto rg-metric">{t("no.x.autoValue", { v: autoNum[id as NumId] })}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Segmented
                        value={x[id] == null ? "auto" : x[id] ? "on" : "off"}
                        options={[
                          { id: "auto", label: t("no.x.auto") },
                          { id: "on", label: t("no.x.on") },
                          { id: "off", label: t("no.x.off") },
                        ]}
                        onChange={(m) => set({ [id]: m === "auto" ? null : m === "on" })}
                        layoutId={`no-x-${id}`}
                      />
                      {!manual && <span className="no-x-auto rg-metric">{t("no.x.autoValue", { v: autoBool[id as BoolId] })}</span>}
                    </>
                  )}
                </div>
                {tip && (
                  <div className="no-x-warn small">
                    <TriangleAlert size={13} />
                    <span>{t(tip)}</span>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      ))}
      <div className="no-x-foot">
        <span className={count ? "no-x-count" : "muted small"}>{count ? t("no.x.count", { n: count }) : t("no.x.none")}</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} disabled={!count} onClick={clear}>
          {t("no.x.clear")}
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  unit,
  onChange,
  t,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: (n: number) => string;
  onChange: (n: number) => void;
  t: T;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = () => {
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) setText(String(value));
    else onChange(clamp(n));
  };
  return (
    <div className="no-x-stepper">
      <button type="button" aria-label={t("no.x.less")} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        <Minus size={13} />
      </button>
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
      {unit(value) && <span className="no-x-unit">{unit(value)}</span>}
      <button type="button" aria-label={t("no.x.more")} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        <Plus size={13} />
      </button>
    </div>
  );
}
