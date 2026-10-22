import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, ArrowRight, Cable, Check, ChevronDown, CircleX, Info, LoaderCircle, Lock, Power, RotateCcw, ScrollText, SlidersHorizontal,
  TriangleAlert, Wifi,
} from "lucide-react";
import { api } from "../lib/api";
import type { Key } from "../lib/i18n";
import {
  applyPreset, computeNet, engineText, NET_DEFAULTS, PRESETS, type NetAction, type NetExpert, type NetLine, type NetOptions, type NetOutcome,
  type NetState, type PresetId,
} from "../lib/netopt";
import { useStore } from "../lib/store";
import { Button, Switch } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

/** Réglages en cours de modification, gardés entre deux visites tant qu'ils ne sont pas appliqués. */
const DRAFT = "rago.netoptDraft";
function loadDraft(): NetOptions | null {
  try {
    const raw = localStorage.getItem(DRAFT);
    return raw ? { ...NET_DEFAULTS, ...(JSON.parse(raw) as Partial<NetOptions>) } : null;
  } catch {
    return null;
  }
}
function saveDraft(o: NetOptions | null) {
  try {
    if (o) localStorage.setItem(DRAFT, JSON.stringify(o));
    else localStorage.removeItem(DRAFT);
  } catch {
    /* stockage indisponible : les réglages reviennent au dernier appliqué */
  }
}
const same = (a: NetOptions, b: NetOptions) => JSON.stringify({ ...a, preset: "" }) === JSON.stringify({ ...b, preset: "" });
const validTarget = (t: string) => /^[A-Za-z0-9][A-Za-z0-9.:-]{0,252}$/.test(t);

type Detect = { connected: boolean; wifi: boolean; alias: string | null; desc: string | null; speed: string | null };
type ToolId = "quality" | "loaded" | "mtu" | "status";
const TOOLS: ToolId[] = ["quality", "loaded", "mtu", "status"];

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
  const [results, setResults] = useState<Partial<Record<ToolId, Record<string, unknown>>>>({});
  const [showLog, setShowLog] = useState(false);
  const [restoreMenu, setRestoreMenu] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
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
    const sub = api.onNetOptLine((l) => {
      if (!live.current) return;
      if (l.tag === "progress") setProgress({ step: l.step ?? 0, total: l.total ?? 0 });
      else setLines((ls) => [...ls, l]);
    });
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
      void sub.then((un) => un());
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
      } else if (outcome.result) {
        setResults((r) => ({ ...r, [action]: outcome.result! }));
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

  return (
    <motion.div className="page netopt" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("no.overline")}</div>
        <h1>{t("no.title")}</h1>
        <p className="lead">{t("no.lead")}</p>
      </motion.header>

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
                  <span className="no-detected-text" title={[detect.alias, detect.desc, detect.speed].filter(Boolean).join(" · ")}>
                    {t("no.detected", { name: [detect.alias, detect.desc, detect.speed].filter(Boolean).join(" · ") })}
                  </span>
                </span>
              )}
              {applied && dirty && !changing && <span className="no-dirty">{t("no.status.changed")}</span>}
            </div>
          </div>
          <div className="no-hero-actions">
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
              disabled={!!busy}
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

      <motion.section variants={rise} className="no-presets" role="radiogroup" aria-label={t("no.presets")}>
        {PRESETS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={opts.preset === p} className={`no-preset${opts.preset === p ? " on" : ""}`} onClick={() => pickPreset(p)}>
            <span className="no-preset-name">{t(`no.preset.${p}` as Key)}</span>
            <span className="no-preset-desc">{t(`no.preset.${p}.desc` as Key)}</span>
            {opts.preset === p && <Check size={13} className="no-preset-check" />}
          </button>
        ))}
      </motion.section>

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
          <Toggle title={t("no.stable")} desc={t("no.stable.desc")} checked={opts.stable} onChange={(stable) => change({ stable })} />
          <Toggle title={t("no.competitive")} desc={t("no.competitive.desc")} checked={opts.competitive} onChange={(competitive) => change({ competitive })} />
        </div>
      </motion.section>

      <motion.section variants={rise} className="card no-section">
        <header className="card-head">
          <h3 className="rg-overline">{t("no.advanced")}</h3>
        </header>
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
      </motion.section>

      <motion.section variants={rise} className="card no-section no-expert">
        <button type="button" className="card-head no-expert-head" aria-expanded={expertOpen} onClick={() => setExpertOpen((o) => !o)}>
          <h3 className="rg-overline">
            <SlidersHorizontal size={12} />
            {t("no.expert")}
          </h3>
          <ChevronDown size={15} className={expertOpen ? "flip" : undefined} />
        </button>
        <AnimatePresence initial={false}>
          {expertOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="no-expert-body">
              <p className="muted small">{t("no.x.note")}</p>
              <div className="no-expert-grid">
                <NumField label={t("no.x.minRto")} value={opts.expert.minRto} auto={`${v.minRto} ms`} min={20} max={300} onChange={(minRto) => setExpert({ minRto })} t={t} />
                <NumField label={t("no.x.initialRto")} value={opts.expert.initialRto} auto={`${v.initialRto} ms`} min={300} max={3000} onChange={(initialRto) => setExpert({ initialRto })} t={t} />
                <NumField label={t("no.x.icw")} value={opts.expert.icw} auto="Windows · 10" min={2} max={64} onChange={(icw) => setExpert({ icw })} t={t} />
                <NumField label={t("no.x.ackFrequency")} value={opts.expert.ackFrequency} auto={String(v.ackFrequency)} min={1} max={255} onChange={(ackFrequency) => setExpert({ ackFrequency })} t={t} />
                <NumField label={t("no.x.ackTimeout")} value={opts.expert.ackTimeout} auto={`${v.ackTimeout} ms`} min={10} max={600} onChange={(ackTimeout) => setExpert({ ackTimeout })} t={t} />
                <NumField label={t("no.x.dscp")} value={opts.expert.dscp} auto={String(v.dscp)} min={0} max={63} onChange={(dscp) => setExpert({ dscp })} t={t} />
                <TriField label={t("no.x.timestamps")} value={opts.expert.timestamps} auto={v.timestamps} onChange={(timestamps) => setExpert({ timestamps })} t={t} />
                <TriField label={t("no.x.ecn")} value={opts.expert.ecn} auto={v.ecn} onChange={(ecn) => setExpert({ ecn })} t={t} />
                <TriField
                  label={t("no.x.interruptModeration")}
                  value={opts.expert.interruptModeration}
                  auto={v.interruptModeration !== 2}
                  onChange={(interruptModeration) => setExpert({ interruptModeration })}
                  t={t}
                />
              </div>
              <Button size="sm" variant="ghost" disabled={Object.values(opts.expert).every((x) => x == null)} onClick={() => change({ expert: {} })}>
                {t("no.x.clear")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <div className="no-bottom">
        <motion.section variants={rise} className="card no-section no-tools">
          <header className="card-head">
            <h3 className="rg-overline">{t("no.tools")}</h3>
          </header>
          <label className="no-target">
            <span className="no-toggle-title">{t("no.target")}</span>
            <span className="no-toggle-desc">{t("no.target.desc")}</span>
            <input
              className={`input${validTarget(opts.target) ? "" : " bad"}`}
              value={opts.target}
              spellCheck={false}
              maxLength={253}
              onChange={(e) => change({ target: e.target.value.trim(), preset: opts.preset })}
            />
            {!validTarget(opts.target) && <span className="no-bad small">{t("no.target.bad")}</span>}
          </label>
          {TOOLS.map((id) => (
            <Tool
              key={id}
              id={id}
              busy={busy}
              disabled={!!busy || (id !== "status" && !validTarget(opts.target))}
              result={results[id]}
              progress={busy === id ? progress : null}
              onRun={() => void run(id)}
              onStable={(stable) => change({ stable })}
              stable={opts.stable}
              t={t}
            />
          ))}
        </motion.section>
        <motion.section variants={rise} className="card no-section no-honest">
          <header className="card-head">
            <h3 className="rg-overline">{t("no.honest.title")}</h3>
          </header>
          <p className="small">{t("no.honest.text")}</p>
        </motion.section>
      </div>
    </motion.div>
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

function NumField({
  label,
  value,
  auto,
  min,
  max,
  onChange,
  t,
}: {
  label: string;
  value: number | null | undefined;
  auto: string;
  min: number;
  max: number;
  onChange: (v: number | null) => void;
  t: T;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => setText(value == null ? "" : String(value)), [value]);
  const commit = () => {
    const n = parseInt(text, 10);
    onChange(Number.isNaN(n) ? null : Math.min(max, Math.max(min, n)));
  };
  return (
    <label className="no-field">
      <span className="no-field-label">{label}</span>
      <input
        className="input"
        inputMode="numeric"
        placeholder={`${t("no.x.auto")} · ${auto}`}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
    </label>
  );
}

function TriField({ label, value, auto, onChange, t }: { label: string; value: boolean | null | undefined; auto: boolean; onChange: (v: boolean | null) => void; t: T }) {
  const cur = value == null ? "auto" : value ? "on" : "off";
  return (
    <div className="no-field">
      <span className="no-field-label">{label}</span>
      <div className="no-chips">
        {(["auto", "on", "off"] as const).map((k) => (
          <button key={k} type="button" className={`no-chip${cur === k ? " on" : ""}`} onClick={() => onChange(k === "auto" ? null : k === "on")}>
            {k === "auto" ? `${t("no.x.auto")} · ${auto ? t("no.x.on") : t("no.x.off")}` : t(`no.x.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tool({
  id,
  busy,
  disabled,
  result,
  progress,
  onRun,
  onStable,
  stable,
  t,
}: {
  id: ToolId;
  busy: NetAction | null;
  disabled: boolean;
  result: Record<string, unknown> | undefined;
  progress: { step: number; total: number } | null;
  onRun: () => void;
  onStable: (v: boolean) => void;
  stable: boolean;
  t: T;
}) {
  const { lang } = useStore();
  const [confirm, setConfirm] = useState(false);
  const running = busy === id;
  const r = result;
  const num = (x: unknown) => String(x ?? "—");
  return (
    <div className={`no-tool${running ? " running" : ""}`}>
      <div className="no-tool-row">
        <div className="no-toggle-text">
          <div className="no-toggle-title">{t(`no.tool.${id}` as Key)}</div>
          <div className="no-toggle-desc">{t(`no.tool.${id}.desc` as Key)}</div>
        </div>
        <Button
          size="sm"
          disabled={disabled}
          icon={running ? <LoaderCircle size={12} className="spin" /> : undefined}
          onClick={() => (id === "loaded" && !confirm ? setConfirm(true) : (setConfirm(false), onRun()))}
        >
          {running && progress?.total ? `${Math.round((progress.step / progress.total) * 100)} %` : t("no.tool.run")}
        </Button>
      </div>
      {confirm && !running && (
        <div className="no-tool-confirm small">
          <TriangleAlert size={13} />
          <span>{t("no.tool.loaded.confirm")}</span>
          <Button size="sm" variant="primary" onClick={() => (setConfirm(false), onRun())}>
            {t("no.tool.run")}
          </Button>
        </div>
      )}
      {r && !running && (
        <div className="no-tool-result small">
          {id === "quality" &&
            (r.noAnswer ? (
              <span className="muted">{t("no.q.noAnswer")}</span>
            ) : (
              <>
                <div className={`no-verdict ${r.stable ? "ok" : "warn"}`}>{r.stable ? t("no.q.stable") : t("no.q.unstable")}</div>
                <div className="muted rg-metric">{t("no.q.line", { min: num(r.min), max: num(r.max), avg: num(r.avg), p95: num(r.p95) })}</div>
                <div className="muted rg-metric">{t("no.q.line2", { jitter: num(r.jitter), loss: num(r.loss), spikes: num(r.spikes) })}</div>
                {!!r.stable !== stable && (
                  <button type="button" className="link no-suggest" onClick={() => onStable(!!r.stable)}>
                    {r.stable ? t("no.q.setYes") : t("no.q.setNo")}
                    <ArrowRight size={12} />
                  </button>
                )}
              </>
            ))}
          {id === "loaded" &&
            (r.noAnswer ? (
              <span className="muted">{t("no.q.noAnswer")}</span>
            ) : (
              <>
                <div className={`no-verdict ${r.grade === "A+" || r.grade === "A" ? "ok" : "warn"}`}>{t("no.l.grade", { grade: num(r.grade) })}</div>
                <div className="muted rg-metric">{t("no.l.line", { idle: num(r.idleMed), busy: num(r.busyMed), delta: num(r.delta) })}</div>
                <div className="muted">{r.grade === "A+" || r.grade === "A" ? t("no.l.good") : t("no.l.bad")}</div>
              </>
            ))}
          {id === "mtu" &&
            (r.mtu ? (
              <>
                <div className="no-verdict ok rg-metric">{t("no.m.result", { mtu: num(r.mtu), alias: num(r.alias), cur: num(r.current) })}</div>
                <div className="muted">{t("no.m.note")}</div>
              </>
            ) : (
              <span className="muted">{t("no.m.fail")}</span>
            ))}
          {id === "status" && (
            <table className="no-status rg-metric">
              <tbody>
                {(r.rows as { s: string; k: string; v: string }[]).map((row, i) => (
                  <tr key={i} className={row.v === "" ? "head" : undefined}>
                    <td>{engineText(row.k, lang)}</td>
                    <td>{engineText(row.v, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
