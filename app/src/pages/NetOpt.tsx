// Onglet « packet optimizer » de Réseau, à l'identique de la maquette v5 app-network-packet-pi.html : presets en cartes,
// console « tune » (trois curseurs à segments et le tableau Windows → Rago), options en carreaux (connexion, avancé,
// expert), outils, et sa barre d'application en bas de la fenêtre. Les choix vont au moteur (netopt.rs) ; les valeurs
// affichées viennent des mêmes formules (lib/netopt.ts).
// 1.3.0 (Sofiene, 10/11) : appliquer est Premium. En gratuit, la page se montre telle quelle mais verrouillée (un clic
// ouvre l'offre), les outils et « restore » restent libres.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { api, type NetMeasure } from "../lib/api";
import type { Key } from "../lib/i18n";
import {
  applyPreset, computeNet, DSCP_NAMES, engineText, loadDraft, NET_DEFAULTS, PRESETS, recommend, saveDraft, WINDOWS_VALUES, type NetAction, type NetExpert,
  type NetLine, type NetOptions, type NetOutcome, type NetState, type NetValues, type PresetId, type Why,
} from "../lib/netopt";
import { useStore } from "../lib/store";
import { I, Seg } from "../s5/I";
import { TOOLS, ToolResult, toolName, validTarget, type ToolId } from "../components/NetTools";

const same = (a: NetOptions, b: NetOptions) => JSON.stringify({ ...a, preset: "" }) === JSON.stringify({ ...b, preset: "" });

type Detect = { connected: boolean; wifi: boolean; alias: string | null; desc: string | null; speed: string | null };
type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Icônes des presets, celles de la maquette. */
const PRESET_ICONS: Record<PresetId, string> = { hitreg: "crosshair", knockback: "download", balanced: "sliders", wifi: "wifi", unstable: "alert", classic: "drive" };

/** Blocs dépliés (avancé, expert), gardés d'une visite à l'autre. */
const FOLDS = "rago.netoptFolds";
type FoldId = "advanced" | "expert";
function loadFolds(): Record<FoldId, boolean> {
  try {
    return { advanced: false, expert: false, ...(JSON.parse(localStorage.getItem(FOLDS) ?? "{}") as Partial<Record<FoldId, boolean>>) };
  } catch {
    return { advanced: false, expert: false };
  }
}

/** « find my preset » : carte réseau, processeur et Windows, puis 40 pings vers Internet. */
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

/** Marques de priorité proposées (curseur de priorité du .bat : ces valeurs donnent chaque classe DSCP). */
const PRIOS: { priority: number; dscp: number }[] = [
  { priority: 0, dscp: 0 },
  { priority: 10, dscp: 32 },
  { priority: 30, dscp: 34 },
  { priority: 50, dscp: 40 },
  { priority: 75, dscp: 46 },
  { priority: 95, dscp: 48 },
];

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
  const [tool, setTool] = useState<{ id: ToolId; result?: Record<string, unknown>; confirm?: boolean; error?: string } | null>(null);
  const [toolStep, setToolStep] = useState<string | null>(null);
  const [folds, setFolds] = useState(loadFolds);
  const [scan, setScan] = useState<Scan | null>(null);
  const live = useRef(true);
  const touched = useRef(loadDraft() !== null);
  const locked = !premium;

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
        // le journal ne garde que les applications et les remises ; d'un outil, seule l'étape en cours s'affiche
        else if (l.action === "apply" || l.action === "restore" || l.action === "defaults") setLines((ls) => [...ls, l]);
        else if (l.tag === "title") setToolStep(l.text);
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
    if (locked) return setUpsell("plan");
    touched.current = true;
    setDone(null);
    setError(null);
    setOpts((o) => {
      const next = { ...o, ...patch, preset: "preset" in patch ? patch.preset! : "custom" };
      saveDraft(next);
      return next;
    });
  };
  const setExpert = (patch: Partial<NetExpert>) => change({ expert: { ...opts.expert, ...patch } });
  const pickPreset = (id: PresetId) => change(applyPreset(opts, id));
  const fold = (id: FoldId) => {
    if (locked) return setUpsell("plan");
    setFolds((f) => {
      const next = { ...f, [id]: !f[id] };
      try {
        localStorage.setItem(FOLDS, JSON.stringify(next));
      } catch {
        /* stockage indisponible : les blocs se replient à la prochaine visite */
      }
      return next;
    });
  };

  const errorText = (e: unknown) => {
    const m = String(e);
    if (m.startsWith("busy")) return t("no.busy");
    if (m.startsWith("premium_scripts_unavailable")) return t("err.premium_scripts_unavailable");
    return m;
  };

  /** Appliquer, restaurer (sauvegarde ou valeurs de Windows). */
  const run = async (action: "apply" | "restore" | "defaults") => {
    if (busy) return;
    if (action === "apply" && locked) return setUpsell("plan");
    setBusy(action);
    setError(null);
    setDone(null);
    setLines([]);
    setProgress(null);
    try {
      const outcome = await api.netOptRun(action, opts);
      if (!live.current) return;
      setDone({ action, outcome });
      if (outcome.code === 0) saveDraft(null);
      await refresh();
    } catch (e) {
      if (!live.current) return;
      if (String(e).startsWith("premium_required")) setUpsell("plan");
      else setError(errorText(e));
    } finally {
      if (live.current) {
        setBusy(null);
        setProgress(null);
      }
    }
  };

  /** Un outil : son résultat s'affiche sous la rangée « tools ». Le bufferbloat télécharge : il demande d'abord. */
  const runTool = async (id: ToolId, confirmed = false) => {
    if (busy) return;
    if (id === "loaded" && !confirmed) return setTool({ id, confirm: true });
    setTool({ id });
    setBusy(id);
    setProgress(null);
    setToolStep(null);
    try {
      const outcome = await api.netOptRun(id, opts);
      if (live.current) setTool({ id, result: outcome.result ?? undefined });
    } catch (e) {
      if (live.current) setTool({ id, error: errorText(e) });
    } finally {
      if (live.current) {
        setBusy(null);
        setProgress(null);
      }
    }
  };

  const scanning = !!scan && scan.step !== "done";
  const analyse = async () => {
    if (locked) return setUpsell("plan");
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

  const presetName = (p: string) => (PRESETS.includes(p as PresetId) ? t(`s5.no.p.${p}` as Key) : t("s5.no.p.custom"));
  const cardName = (d: Detect | null | undefined) => [d?.alias, d?.desc, d?.speed].filter(Boolean).join(" · ");
  const buffersOff = [v.throttlingOff, v.rscOff, v.coalescingOff, v.flowControlOff, v.lsoOff, v.interruptModeration === 2].filter(Boolean).length;
  const expertCount = Object.values(opts.expert).filter((x) => x != null).length;

  const resendName = opts.responsiveness === 0 ? t("s5.no.f.windows") : opts.responsiveness < 34 ? t("s5.no.f.cautious") : opts.responsiveness < 67 ? t("s5.no.f.balanced") : t("s5.no.f.fast");
  const batchName = opts.delay === 0 ? t("s5.no.f.none") : opts.delay >= 100 ? t("s5.no.f.windows") : opts.delay < 50 ? t("s5.no.f.light") : t("s5.no.f.heavy");

  return (
    <>
      {scan && (
        <ScanPanel
          scan={scan}
          cardName={cardName}
          presetName={presetName}
          onApply={() => {
            setScan(null);
            void run("apply");
          }}
          onKeep={keepMine}
        />
      )}

      <section className={`pre${locked ? " lkd" : ""}`}>
        <div className="sh">
          <h2 className="h2 tape">{t("s5.no.presets")}</h2>
          {detect?.connected && (
            <span className="chip ghost" title={cardName(detect)}>
              <I n={detect.wifi ? "wifi" : "net"} />
              {t("s5.no.detected", { name: detect.wifi ? t("s5.no.wifi") : t("s5.no.ethernet") })}
            </span>
          )}
          <button type="button" className="btn sm" disabled={!!busy || scanning} onClick={() => void analyse()}>
            <I n={locked ? "lock" : scanning ? "loader" : "analysis"} className={scanning ? "spin" : undefined} />
            {t("s5.no.analyse")}
          </button>
        </div>
        <div className="pcards" role="radiogroup" aria-label={t("s5.no.presets")}>
          {PRESETS.map((p) => {
            const on = opts.preset === p;
            return (
              <button key={p} type="button" role="radio" aria-checked={on} className={`pset${on ? " on" : ""}`} title={t(`no.preset.${p}.desc` as Key)} onClick={() => pickPreset(p)}>
                <I n={PRESET_ICONS[p]} />
                {on && (
                  <em className="ck">
                    <I n="check" />
                  </em>
                )}
                <b>{t(`s5.no.p.${p}` as Key)}</b>
                <span>{t(`s5.no.pd.${p}` as Key)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`tune${locked ? " lkd" : ""}`}>
        <div className="sh">
          <h2 className="h2 tape">{t("s5.no.tune")}</h2>
          {opts.preset === "custom" && <span className="chip ghost">{t("s5.no.custom")}</span>}
        </div>
        <div className="cons panel">
          <div className="faders">
            <Fader
              name={t("s5.no.f.buffering")}
              value={opts.latency}
              label={buffersOff === 0 ? t("s5.no.f.windows") : t("s5.no.f.offOf", { n: buffersOff })}
              lo={t("s5.no.f.none")}
              hi={t("s5.no.f.windows")}
              hint={t("no.latency")}
              locked={locked ? () => setUpsell("plan") : undefined}
              onChange={(latency) => change({ latency })}
            />
            <Fader
              name={t("s5.no.f.resend")}
              value={opts.responsiveness}
              label={resendName}
              lo={t("s5.no.f.cautious")}
              hi={t("s5.no.f.fast")}
              hint={t("no.resp")}
              locked={locked ? () => setUpsell("plan") : undefined}
              onChange={(responsiveness) => change({ responsiveness })}
            />
            <Fader
              name={t("s5.no.f.batching")}
              value={opts.delay}
              label={batchName}
              lo={t("s5.no.f.sendNow")}
              hi={t("s5.no.f.windows")}
              hint={t("no.delay")}
              locked={locked ? () => setUpsell("plan") : undefined}
              onChange={(delay) => change({ delay })}
            />
          </div>
          <Diff o={opts} v={v} buffersOff={buffersOff} t={t} />
        </div>

        <div className="tgrid opts2">
          <Toggle name={t("s5.no.o.smart")} desc={t("no.smart.desc")} on={opts.smart} onChange={(smart) => change({ smart })} />
          <Toggle name={t("s5.no.o.loss")} desc={t("no.stable.desc")} on={!opts.stable} onChange={(on) => change({ stable: !on })} />
          <Toggle name={t("s5.no.o.boost")} desc={t("no.competitive.desc")} on={opts.competitive} onChange={(competitive) => change({ competitive })} />
          <LineTile
            value={opts.line}
            locked={locked}
            onLocked={() => setUpsell("plan")}
            onChange={(line) => change({ line, wifi: line === 5 ? true : opts.line === 5 ? false : opts.wifi })}
          />
          <button type="button" className="tw adv" aria-expanded={folds.advanced} onClick={() => fold("advanced")}>
            <span className="nm">{t("s5.no.o.advanced")}</span>
            <em>9</em>
            <I n="chev" className="chev" />
          </button>
          <button type="button" className="tw adv" aria-expanded={folds.expert} onClick={() => fold("expert")}>
            <span className="nm">{t("s5.no.o.expert")}</span>
            <em>9</em>
            {expertCount > 0 && <small className="mn">{t("s5.no.o.manual", { n: expertCount })}</small>}
            <I n="chev" className="chev" />
          </button>
        </div>

        {folds.advanced && !locked && <Advanced o={opts} v={v} change={change} win11={!!sys?.isWin11} onHide={() => fold("advanced")} />}
        {folds.expert && !locked && <Expert o={opts} v={v} count={expertCount} set={setExpert} clear={() => change({ expert: {} })} onHide={() => fold("expert")} />}

        <div className="tools">
          <span className="lbl">{t("s5.no.t.tools")}</span>
          {TOOLS.map(({ id, icon }) => (
            <button key={id} type="button" className={`btn sm${tool?.id === id ? " on" : ""}`} disabled={!!busy && busy !== id} onClick={() => busy !== id && void runTool(id)}>
              <I n={busy === id ? "loader" : icon} className={busy === id ? "spin" : undefined} />
              {t(toolName(id))}
              {busy === id && progress?.total ? <small>{Math.round((progress.step / progress.total) * 100)} %</small> : null}
            </button>
          ))}
        </div>
        {tool && (
          <div className={`tres panel${busy === tool.id ? " busy" : ""}`}>
            <div className="th">
              <h3>{t(toolName(tool.id))}</h3>
              <span className="sub">{t(`no.tool.${tool.id}.desc` as Key)}</span>
              <button type="button" className="ic" aria-label={t("an.close")} disabled={busy === tool.id} onClick={() => setTool(null)}>
                <I n="x" />
              </button>
            </div>
            {tool.confirm ? (
              <div className="cf">
                <p className="tx">{t("no.tool.loaded.confirm")}</p>
                <button type="button" className="btn sm red" disabled={!!busy} onClick={() => void runTool("loaded", true)}>
                  <I n="play" />
                  {t("no.tool.run")}
                </button>
              </div>
            ) : busy === tool.id ? (
              <div className="rn">
                <Seg value={progress?.step ?? 0} total={progress?.total || 1} count={30} />
                {toolStep && <p className="tx">{engineText(toolStep, lang)}</p>}
              </div>
            ) : tool.error ? (
              <p className="tx bad">{tool.error}</p>
            ) : tool.result ? (
              <ToolResult id={tool.id} result={tool.result} onUnstable={locked ? undefined : () => change({ stable: false })} />
            ) : null}
          </div>
        )}

        <p className="note">
          <b>{t("no.honest.title")}</b> {t("no.honest.text")}
        </p>
      </section>

      <Bar
        name={presetName(opts.preset)}
        locked={locked}
        busy={busy}
        progress={progress}
        lines={lines}
        done={done}
        error={error}
        applied={applied}
        dirty={dirty}
        canRestore={!!applied || !!state?.backup}
        backup={!!state?.backup}
        scanning={scanning}
        onApply={() => void run("apply")}
        onRestore={(a) => void run(a)}
      />
    </>
  );
}

/** Un curseur de la console : 24 segments, la poignée, ses deux bouts. Glisser, cliquer ou les flèches du clavier. */
function Fader({
  name,
  value,
  label,
  lo,
  hi,
  hint,
  locked,
  onChange,
}: {
  name: string;
  value: number;
  label: string;
  lo: string;
  hi: string;
  hint: string;
  /** gratuit : un clic ouvre l'offre */
  locked?: () => void;
  onChange: (v: number) => void;
}) {
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
  };
  const set = (n: number) => {
    const x = Math.max(0, Math.min(100, n));
    if (x !== value) onChange(x);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20, Home: -100, End: 100 };
    if (!(e.key in step)) return;
    e.preventDefault();
    if (locked) return locked();
    set(value + step[e.key]);
  };
  return (
    <div className="fd">
      <div className="fh">
        <b>{name}</b>
        <em>{label}</em>
      </div>
      <div
        className="trk"
        role="slider"
        tabIndex={0}
        title={hint}
        aria-label={hint}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={label}
        onPointerDown={(e) => {
          if (locked) return locked();
          e.currentTarget.setPointerCapture(e.pointerId);
          set(at(e));
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && set(at(e))}
        onKeyDown={key}
      >
        <Seg value={value} total={100} count={24} />
        <span className="kn" style={{ left: `${Math.max(1, Math.min(99, value))}%` }} />
      </div>
      <div className="ends">
        <span className="lbl">{lo}</span>
        <span className="lbl">{hi}</span>
      </div>
    </div>
  );
}

/** Ce que ces réglages changent dans Windows : sa valeur, puis celle de Rago (netopt.rs, `compute`). */
function Diff({ o, v, buffersOff, t }: { o: NetOptions; v: NetValues; buffersOff: number; t: T }) {
  const w = WINDOWS_VALUES;
  const none = t("s5.no.d.none");
  const rows: [Key, string, string][] = [
    ["s5.no.d.nagle", t("s5.no.d.on"), v.noDelay ? t("s5.no.d.off") : t("s5.no.d.on")],
    ["s5.no.d.ack", `${w.ackFrequency} · ${w.ackTimeout} ms`, `${v.ackFrequency} · ${v.ackTimeout} ms`],
    ["s5.no.d.resend", `${w.minRto} ms`, `${v.minRto} ms`],
    ["s5.no.d.buffers", t("s5.no.d.nOn", { n: 6 }), t("s5.no.d.nOn", { n: 6 - buffersOff })],
    ["s5.no.d.prio", none, !o.smart || v.dscp === 0 ? none : `${v.dscp}${v.dscpName ? ` ${v.dscpName}` : ""}`],
  ];
  return (
    <div className="diff">
      <div className="dh">
        <span />
        <span className="lbl">{t("s5.no.d.windows")}</span>
        <span />
        <span className="lbl">{t("s5.no.d.rago")}</span>
      </div>
      {rows.map(([k, a, b]) => (
        <div key={k} className={`dr${a === b ? " same" : ""}`}>
          <span className="k">{t(k)}</span>
          <span className="a">{a}</span>
          <I n="right" />
          <b>{b}</b>
        </div>
      ))}
    </div>
  );
}

function Toggle({ name, desc, on, onChange }: { name: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`tw${on ? " on" : ""}`} title={desc} onClick={() => onChange(!on)}>
      <span className="nm">{name}</span>
      <i className={`sw${on ? " on" : ""}`} />
    </button>
  );
}

/** Carreau « connection » : le type de ligne, choisi dans une liste qui s'ouvre dessous. */
function LineTile({ value, locked, onLocked, onChange }: { value: number; locked: boolean; onLocked: () => void; onChange: (line: number) => void }) {
  const { t } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="lsel" ref={ref}>
      <button type="button" className="tw val" aria-haspopup="listbox" aria-expanded={open} title={t("no.line")} onClick={() => (locked ? onLocked() : setOpen((x) => !x))}>
        <span className="nm">{t("s5.no.o.line")}</span>
        <span className="v">{t(`s5.no.line.${value}` as Key)}</span>
        <I n="chev" className="chev" />
      </button>
      {open && (
        <div className="lmenu panel" role="listbox" aria-label={t("no.line")}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === value}
              className={n === value ? "on" : undefined}
              onClick={() => {
                setOpen(false);
                if (n !== value) onChange(n);
              }}
            >
              {t(`s5.no.line.${n}` as Key)}
              {n === value && <I n="check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** En-tête d'un bloc déplié (avancé, expert), comme les avancés des pages de module. */
function FoldHead({ name, n, lead, extra, onHide }: { name: string; n: number; lead: string; extra?: ReactNode; onHide: () => void }) {
  const { t } = useStore();
  return (
    <div className="advh">
      {name}
      <em>{n}</em>
      <small>{lead}</small>
      <i className="ln" />
      {extra}
      <button type="button" className="hd" onClick={onHide}>
        {t("module.hide")}
        <I n="chev" />
      </button>
    </div>
  );
}

/** Rangée à options (.tw.var des pages de module). */
function VarRow({ name, note, warn, children }: { name: string; note: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className={`tw var${warn ? " warn" : ""}`}>
      <span className="tx">
        <span className="nm">{name}</span>
        <span className="note">{note}</span>
      </span>
      <div className="opts">{children}</div>
    </div>
  );
}

function Opt({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={`o${on ? " on" : ""}`} aria-pressed={on} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

/** Avancé : les 9 réglages que les presets posent et que la console ne montre pas. */
function Advanced({ o, v, change, win11, onHide }: { o: NetOptions; v: NetValues; change: (p: Partial<NetOptions>) => void; win11: boolean; onHide: () => void }) {
  const { t } = useStore();
  const [mtu, setMtu] = useState(String(o.mtu));
  useEffect(() => setMtu(String(o.mtu)), [o.mtu]);
  const okTarget = validTarget(o.target);
  const dscp = v.dscp;
  return (
    <div className="tgrid nadv">
      <FoldHead name={t("s5.no.o.advanced")} n={9} lead={t("s5.no.a.lead")} onHide={onHide} />
      <Toggle name={t("s5.no.a.pmode")} desc={t("no.pmode.desc")} on={o.priorityMode} onChange={(priorityMode) => change({ priorityMode })} />
      <Toggle name={t("s5.no.a.nps")} desc={t("no.nps.desc")} on={o.powerSaving} onChange={(powerSaving) => change({ powerSaving })} />
      <Toggle name={t("s5.no.a.wifi")} desc={t("no.wifi.desc")} on={o.wifi} onChange={(wifi) => change({ wifi })} />
      <Toggle name={t("s5.no.a.bguard")} desc={t("no.bguard.desc")} on={o.bgGuard} onChange={(bgGuard) => change({ bgGuard })} />
      <label className={`tw fld${okTarget ? "" : " bad"}`} title={t("no.target.desc")}>
        <span className="tx">
          <span className="nm">{t("s5.no.a.target")}</span>
          <span className="note">{okTarget ? t("s5.no.a.targetD") : t("no.target.bad")}</span>
        </span>
        <input value={o.target} spellCheck={false} maxLength={253} onChange={(e) => change({ target: e.target.value.trim(), preset: o.preset })} />
      </label>
      <VarRow name={t("s5.no.a.prio")} note={o.smart ? t("s5.no.a.prioD") : t("no.prio.off")} warn={!o.smart && dscp !== 0}>
        {PRIOS.map((p) => (
          <Opt key={p.dscp} on={o.expert.dscp == null && dscp === p.dscp} label={p.dscp === 0 ? t("s5.no.d.none") : `${p.dscp} ${DSCP_NAMES[p.dscp]}`} onClick={() => change({ priority: p.priority })} />
        ))}
      </VarRow>
      <VarRow name={t("s5.no.a.mtu")} note={t("no.mtu.desc")}>
        <Opt on={o.mtuMode === 0} label={t("s5.no.a.keep")} onClick={() => change({ mtuMode: 0 })} />
        <Opt on={o.mtuMode === 1} label={t("s5.no.a.auto")} onClick={() => change({ mtuMode: 1 })} />
        <Opt on={o.mtuMode === 2} label={t("s5.no.a.set")} onClick={() => change({ mtuMode: 2 })} />
        {o.mtuMode === 2 && (
          <input
            className="num"
            inputMode="numeric"
            aria-label={t("no.mtu.manual")}
            value={mtu}
            onChange={(e) => setMtu(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onBlur={() => {
              const n = parseInt(mtu, 10);
              change({ mtu: Number.isNaN(n) ? o.mtu : Math.max(576, Math.min(n, 1500)) });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        )}
      </VarRow>
      <VarRow name={t("s5.no.a.tuning")} note={t("s5.no.a.tuningD", { v: v.autoTuning })}>
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <Opt key={n} on={o.tuning === n} label={t(`s5.no.tu.${n}` as Key)} onClick={() => change({ tuning: n })} />
        ))}
      </VarRow>
      <VarRow name={t("s5.no.a.ccp")} note={t("s5.no.a.ccpD")}>
        {[0, 1, 2, 3, 4, 5]
          .filter((n) => n !== 5 || win11 || o.congestion === 5)
          .map((n) => (
            <Opt key={n} on={o.congestion === n} label={t(`s5.no.cc.${n}` as Key)} onClick={() => change({ congestion: n })} />
          ))}
      </VarRow>
    </div>
  );
}

/** Expert : chaque valeur calculée, laissée en auto ou remplacée à la main (NetExpert, null = auto). */
type NumId = "minRto" | "initialRto" | "icw" | "ackFrequency" | "ackTimeout" | "dscp";
type BoolId = "timestamps" | "ecn" | "interruptModeration";
const NUM_ROWS: Record<NumId, { min: number; max: number; step: number; ms: boolean }> = {
  minRto: { min: 20, max: 300, step: 10, ms: true },
  initialRto: { min: 300, max: 3000, step: 100, ms: true },
  icw: { min: 2, max: 64, step: 1, ms: false },
  ackFrequency: { min: 1, max: 255, step: 1, ms: false },
  ackTimeout: { min: 10, max: 600, step: 10, ms: true },
  dscp: { min: 0, max: 63, step: 1, ms: false },
};
const EXPERT_ROWS: (NumId | BoolId)[] = ["minRto", "initialRto", "ackFrequency", "ackTimeout", "icw", "dscp", "timestamps", "ecn", "interruptModeration"];

function Expert({ o, v, count, set, clear, onHide }: { o: NetOptions; v: NetValues; count: number; set: (p: Partial<NetExpert>) => void; clear: () => void; onHide: () => void }) {
  const { t } = useStore();
  const w = WINDOWS_VALUES;
  const x = o.expert;
  const onOff = (b: boolean) => (b ? t("s5.no.x.on") : t("s5.no.x.off"));
  const autoNum: Record<NumId, number> = { minRto: v.minRto, initialRto: v.initialRto, icw: 10, ackFrequency: v.ackFrequency, ackTimeout: v.ackTimeout, dscp: v.dscp };
  const winNum: Record<NumId, string> = {
    minRto: `${w.minRto} ms`,
    initialRto: `${w.initialRto} ms`,
    icw: "10",
    ackFrequency: String(w.ackFrequency),
    ackTimeout: `${w.ackTimeout} ms`,
    dscp: t("s5.no.d.none"),
  };
  const autoBool: Record<BoolId, boolean> = { timestamps: v.timestamps, ecn: v.ecn, interruptModeration: v.interruptModeration !== 2 };
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
    <div className="tgrid nadv nx">
      <FoldHead
        name={t("s5.no.o.expert")}
        n={9}
        lead={t("s5.no.x.lead")}
        onHide={onHide}
        extra={
          <button type="button" className="hd" disabled={!count} onClick={clear}>
            <I n="undo" />
            {t("s5.no.x.reset")}
          </button>
        }
      />
      {EXPERT_ROWS.map((id) => {
        const manual = x[id] != null;
        const tip = warn(id);
        const isNum = id in NUM_ROWS;
        const win = isNum ? winNum[id as NumId] : winBool[id as BoolId];
        const note = tip ? t(tip) : t(manual ? "s5.no.x.manualNote" : "s5.no.x.autoNote", { w: win });
        return (
          <div key={id} className={`tw xp${manual ? " on" : ""}${tip ? " warn" : ""}`} title={t(`no.x.${id}.desc` as Key)}>
            <span className="tx">
              <span className="nm">{t(`s5.no.x.n.${id}` as Key)}</span>
              <span className="note">{note}</span>
            </span>
            {isNum ? (
              <Stepper
                value={(x[id] as number | null | undefined) ?? autoNum[id as NumId]}
                auto={!manual}
                {...NUM_ROWS[id as NumId]}
                suffix={(n) => (id === "dscp" ? (DSCP_NAMES[n] ?? "") : NUM_ROWS[id as NumId].ms ? "ms" : "")}
                onChange={(n) => set({ [id]: n })}
                onAuto={() => set({ [id]: null })}
                t={t}
              />
            ) : (
              <div className="opts">
                <Opt on={!manual} label={`${t("s5.no.x.auto")} · ${onOff(autoBool[id as BoolId])}`} onClick={() => set({ [id]: null })} />
                <Opt on={x[id] === true} label={t("s5.no.x.on")} onClick={() => set({ [id]: true })} />
                <Opt on={x[id] === false} label={t("s5.no.x.off")} onClick={() => set({ [id]: false })} />
              </div>
            )}
          </div>
        );
      })}
      <p className="note xn">
        <b>{t("no.x.introTitle")}</b> {t("no.x.note")}
      </p>
    </div>
  );
}

function Stepper({
  value,
  auto,
  min,
  max,
  step,
  suffix,
  onChange,
  onAuto,
  t,
}: {
  value: number;
  auto: boolean;
  min: number;
  max: number;
  step: number;
  suffix: (n: number) => string;
  onChange: (n: number) => void;
  onAuto: () => void;
  t: T;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = () => {
    const n = parseInt(text, 10);
    if (Number.isNaN(n) || (auto && n === value)) setText(String(value));
    else onChange(clamp(n));
  };
  return (
    <div className={`stp${auto ? " auto" : ""}`}>
      {!auto && (
        <button type="button" className="rs" title={t("s5.no.x.toAuto")} aria-label={t("s5.no.x.toAuto")} onClick={onAuto}>
          <I n="undo" />
        </button>
      )}
      <button type="button" aria-label={t("no.x.less")} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        <I n="minus" line />
      </button>
      <input inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
      {suffix(value) && <small>{suffix(value)}</small>}
      <button type="button" aria-label={t("no.x.more")} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        <I n="plus" line />
      </button>
    </div>
  );
}

/** « find my preset » : les trois étapes à gauche, le preset conseillé et ses raisons à droite. */
function ScanPanel({
  scan,
  cardName,
  presetName,
  onApply,
  onKeep,
}: {
  scan: Scan;
  cardName: (d: Detect | null | undefined) => string;
  presetName: (p: string) => string;
  onApply: () => void;
  onKeep: () => void;
}) {
  const { t, lang } = useStore();
  const order = ["card", "pc", "line", "done"] as const;
  const at = order.indexOf(scan.step);
  const stateOf = (s: (typeof order)[number]) => (order.indexOf(s) < at ? "ok" : order.indexOf(s) === at ? "now" : "next");
  const dec = (x: number | null | undefined) => (x == null ? "–" : (Math.round(x * 10) / 10).toLocaleString(lang === "fr" ? "fr-FR" : "en-US"));
  const m = scan.measure;
  const lost = m ? (m.lost ?? Math.round(m.loss * m.samples)) : 0;
  const advice = scan.advice;
  const steps: { id: "card" | "pc" | "line"; icon: string; title: Key; text: string | null }[] = [
    {
      id: "card",
      icon: scan.card?.wifi ? "wifi" : "net",
      title: "an.step.card",
      text: scan.card === undefined ? null : scan.card?.connected ? `${scan.card.wifi ? "Wi-Fi" : t("an.wired")} · ${cardName(scan.card)}` : t("an.card.none"),
    },
    {
      id: "pc",
      icon: "cpu",
      title: "an.step.pc",
      text: scan.pc ? [scan.pc.cpu, scan.pc.threads ? t("an.threads", { n: scan.pc.threads }) : "", scan.pc.win].filter(Boolean).join(" · ") || "–" : null,
    },
    {
      id: "line",
      icon: "activity",
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
    <section className="scan panel" aria-live="polite">
      <div className="sl">
        <h3>{t("an.title")}</h3>
        <ol>
          {steps.map(({ id, icon, title, text }) => {
            const s = stateOf(id);
            return (
              <li key={id} className={s}>
                <span className="mk">{s === "ok" ? <I n="check" line /> : s === "now" ? <I n="loader" className="spin" /> : <I n={icon} line />}</span>
                <div>
                  <b>{t(title)}</b>
                  {text && <span>{text}</span>}
                  {id === "line" && s === "now" && <Seg value={scan.samples} total={LINE_SAMPLES} count={40} />}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="sr">
        <span className="lbl">{t("an.pick")}</span>
        <b className="pn">{advice ? presetName(advice.preset) : t("an.wait")}</b>
        {advice && (
          <>
            <ul>
              {advice.why.map((w, i) => (
                <li key={i}>{t(w.key, w.vars && Object.fromEntries(Object.entries(w.vars).map(([k, x]) => [k, typeof x === "number" ? dec(x) : x])))}</li>
              ))}
            </ul>
            <p className="tx">{t("an.note")}</p>
            <div className="acts">
              <button type="button" className="btn sm red" onClick={onApply}>
                <I n="zap" />
                {t("an.apply")}
              </button>
              <button type="button" className="clr" onClick={onKeep}>
                {t("an.keep")}
              </button>
            </div>
          </>
        )}
      </div>
      <button type="button" className="ic x" aria-label={t("an.close")} disabled={scan.step !== "done"} onClick={onKeep}>
        <I n="x" />
      </button>
    </section>
  );
}

/** La barre du Packet Optimizer (.apply > .ap.net de la maquette), posée dans la fenêtre comme celle des réglages :
 * le preset, l'état, « restore » (sauvegarde ou valeurs de Windows), le journal et « apply ». */
function Bar({
  name,
  locked,
  busy,
  progress,
  lines,
  done,
  error,
  applied,
  dirty,
  canRestore,
  backup,
  scanning,
  onApply,
  onRestore,
}: {
  name: string;
  locked: boolean;
  busy: NetAction | null;
  progress: { step: number; total: number } | null;
  lines: NetLine[];
  done: { action: NetAction; outcome: NetOutcome } | null;
  error: string | null;
  applied: NetState["applied"];
  dirty: boolean;
  canRestore: boolean;
  backup: boolean;
  scanning: boolean;
  onApply: () => void;
  onRestore: (a: "restore" | "defaults") => void;
}) {
  const { t, lang, setUpsell } = useStore();
  const [pop, setPop] = useState<"restore" | "log" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => setHost(document.querySelector(".win")), []);
  useEffect(() => {
    if (!pop) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPop(null);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [pop]);

  const changing = busy === "apply" || busy === "restore" || busy === "defaults";
  const pct = progress && progress.total ? Math.min(100, (progress.step / progress.total) * 100) : changing ? 4 : 0;
  const when = (ts: number) => {
    const d = new Date(ts);
    const loc = lang === "fr" ? "fr-FR" : "en-US";
    return `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })} ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}`;
  };
  const ok = done?.outcome.code === 0;
  const counts = done ? [done.outcome.warn ? t("no.done.warn", { n: done.outcome.warn }) : "", done.outcome.fail ? t("no.done.fail", { n: done.outcome.fail }) : ""].filter(Boolean).join(" · ") : "";

  let lb: string;
  let small: ReactNode;
  let tip: string | undefined;
  if (changing) {
    lb = t(busy === "apply" ? "s5.no.b.applying" : "s5.no.b.restoring");
    small = (
      <>
        <I n="loader" className="spin" />
        {engineText([...lines].reverse().find((l) => l.tag === "title")?.text ?? "…", lang)}
      </>
    );
  } else if (error) {
    lb = t("s5.no.b.failed");
    tip = error;
    small = (
      <>
        <I n="alert" />
        {error}
      </>
    );
  } else if (done) {
    lb = !ok ? t("s5.no.b.failed") : done.action === "apply" ? t("s5.no.b.applied") : t("s5.no.b.restored");
    const what = done.action === "apply" ? t("s5.no.b.done", { n: done.outcome.ok }) : done.action === "restore" ? t("no.done.restore") : t("no.done.defaults");
    tip = [what, counts, ok && done.action === "apply" ? t("s5.no.b.reboot") : ""].filter(Boolean).join(" · ");
    small = (
      <>
        <I n={ok ? "rotate" : "alert"} />
        {[what, counts].filter(Boolean).join(" · ")}
      </>
    );
  } else if (locked) {
    lb = t("s5.no.b.locked");
    small = (
      <>
        <I n="lock" />
        {t("s5.no.b.restoreFree")}
      </>
    );
  } else if (applied && !dirty) {
    lb = t("s5.no.b.applied");
    small = (
      <>
        <I n="check" />
        {when(applied.at)}
      </>
    );
  } else {
    lb = applied ? t("s5.no.b.changed") : t("s5.no.b.never");
    small = (
      <>
        <I n="wifi" />
        {t("s5.no.b.drop")}
      </>
    );
  }

  const restoreClick = () => {
    if (!canRestore || busy) return;
    // gratuit : une seule action, la sauvegarde si elle existe, sinon les valeurs de Windows
    if (locked) return onRestore(backup ? "restore" : "defaults");
    setPop((p) => (p === "restore" ? null : "restore"));
  };

  const bar = (
    <div className="apply">
      <div className={`ap net${changing ? " run" : ""}${error || (done && !ok) ? " bad" : ""}`} ref={ref} role="region" aria-label={t("hub.tab.packet")}>
        <b>{name}</b>
        <span className="lb" title={tip}>
          {lb}
          <small>{small}</small>
        </span>
        {lines.length > 0 && !changing && (
          <button type="button" className="clr" aria-expanded={pop === "log"} onClick={() => setPop((p) => (p === "log" ? null : "log"))}>
            {t("s5.no.b.log")}
          </button>
        )}
        <button type="button" className="clr" disabled={!canRestore || !!busy} aria-expanded={pop === "restore"} onClick={restoreClick}>
          {t("s5.no.b.restore")}
        </button>
        {locked ? (
          <button type="button" className="btn" onClick={() => setUpsell("plan")}>
            <I n="lock" />
            {t("free.upgrade")}
          </button>
        ) : done?.action === "apply" && ok && !dirty ? (
          <button type="button" className="btn" onClick={() => void api.restartPc()}>
            <I n="power" />
            {t("s5.no.b.restart")}
          </button>
        ) : (
          <button type="button" className="btn" disabled={!!busy || scanning} onClick={onApply}>
            <I n={busy === "apply" ? "loader" : "zap"} className={busy === "apply" ? "spin" : undefined} />
            {t("s5.no.b.apply")}
          </button>
        )}
        {changing && <i className="pg" style={{ width: `calc((100% - 28px) * ${pct / 100})` }} />}
        {pop === "restore" && (
          <div className="pop panel" role="menu">
            <button type="button" role="menuitem" disabled={!backup} onClick={() => (setPop(null), onRestore("restore"))}>
              <b>{t("no.restore.backup")}</b>
              <span>{t("no.restore.backup.desc")}</span>
            </button>
            <button type="button" role="menuitem" onClick={() => (setPop(null), onRestore("defaults"))}>
              <b>{t("no.restore.defaults")}</b>
              <span>{t("no.restore.defaults.desc")}</span>
            </button>
          </div>
        )}
        {pop === "log" && <Log lines={lines} />}
      </div>
    </div>
  );
  return host ? createPortal(bar, host) : null;
}

function Log({ lines }: { lines: NetLine[] }) {
  const { lang } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <div className="pop panel log" ref={ref}>
      {lines.map((l, i) =>
        l.tag === "title" ? (
          <b key={i}>{engineText(l.text, lang)}</b>
        ) : (
          <span key={i} className={l.tag}>
            <i>{l.tag === "ok" ? "✓" : l.tag === "warn" ? "!" : l.tag === "fail" ? "✕" : "·"}</i>
            {l.text}
          </span>
        ),
      )}
    </div>
  );
}
