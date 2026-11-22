import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CircleX, Globe, LoaderCircle, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { api, type NetMeasure } from "../lib/api";
import type { Key } from "../lib/i18n";
import { loadDraft, NET_DEFAULTS, saveDraft } from "../lib/netopt";
import { useStore } from "../lib/store";
import { Button } from "../components/ui";
import { Tool, validTarget, type ToolId } from "../components/NetTools";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

/** Serveurs mesurés (mêmes identifiants que nettest.rs), par groupe, avec le code affiché dans la pastille. */
const GROUPS: { label: Key; items: { id: string; code: string }[] }[] = [
  { label: "net.group.mc", items: [{ id: "hypixel", code: "MC" }, { id: "minemen", code: "MC" }] },
  {
    label: "net.group.regions",
    items: [
      { id: "paris", code: "FR" },
      { id: "frankfurt", code: "DE" },
      { id: "london", code: "UK" },
      { id: "madrid", code: "ES" },
      { id: "stockholm", code: "SE" },
      { id: "virginia", code: "US" },
    ],
  },
  { label: "net.group.internet", items: [{ id: "internet", code: "CF" }] },
];
const ALL = GROUPS.flatMap((g) => g.items.map((i) => i.id));
// essais par mesure (nettest.rs) : la courbe garde sa place pendant le test
const slots = (id: string) => (id === "hypixel" || id === "minemen" ? 8 : 40);
const DIAG: ToolId[] = ["quality", "loaded", "mtu"];

type Grade = "great" | "good" | "fair" | "bad";
function grade(m: NetMeasure | undefined): Grade | null {
  if (!m || m.ping == null) return m ? "bad" : null;
  if (m.loss >= 0.02 || (m.jitter ?? 0) > 15) return "bad";
  if (m.ping <= 40 && (m.jitter ?? 0) <= 5 && m.loss === 0) return "great";
  if (m.ping <= 80 && (m.jitter ?? 0) <= 10) return "good";
  return "fair";
}
/** Résumé des essais déjà reçus, affiché pendant la mesure (le résultat de nettest.rs le remplace à la fin). */
function partial(id: string, series: (number | null | undefined)[]): NetMeasure | undefined {
  const done = series.filter((v): v is number | null => v !== undefined);
  const ok = done.filter((v): v is number => v != null);
  if (!done.length) return undefined;
  const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  const jitter = ok.length > 1 ? ok.slice(1).reduce((a, v, i) => a + Math.abs(v - ok[i]), 0) / (ok.length - 1) : null;
  const lost = done.length - ok.length;
  return { id, ping: avg, best: ok.length ? Math.min(...ok) : null, worst: ok.length ? Math.max(...ok) : null, jitter, loss: lost / done.length, lost, samples: done.length, error: null };
}
const bars = (ping: number | null) => (ping == null ? 0 : ping < 30 ? 4 : ping < 60 ? 3 : ping < 100 ? 2 : 1);

interface Saved {
  at: number;
  results: Record<string, NetMeasure>;
}
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`rago.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(`rago.${key}`, JSON.stringify(v));
  } catch {
    /* stockage indisponible : le dernier test n'est pas gardé */
  }
}

export function NetTest() {
  const { t, lang, goTo } = useStore();
  const [last, setLast] = useState<Saved | null>(() => load<Saved | null>("netLast", null));
  const [results, setResults] = useState<Record<string, NetMeasure>>(() => last?.results ?? {});
  const [running, setRunning] = useState<Set<string>>(new Set());
  // essais reçus pendant la mesure, avant le résultat
  const [samples, setSamples] = useState<Record<string, (number | null)[]>>({});
  const [pick, setPick] = useState<string>(() => load("netPick", "hypixel"));
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    const subs = [
      api.onNetSample((s) => {
        if (!live.current) return;
        setSamples((all) => {
          const next = [...(all[s.id] ?? [])];
          next[s.i] = s.ms;
          return { ...all, [s.id]: next };
        });
      }),
      api.onNetMeasure((m) => {
        if (!live.current) return;
        setResults((r) => ({ ...r, [m.id]: m }));
        setRunning((s) => {
          const next = new Set(s);
          next.delete(m.id);
          return next;
        });
      }),
    ];
    return () => {
      live.current = false;
      for (const sub of subs) void sub.then((un) => un());
    };
  }, []);
  useEffect(() => save("netPick", pick), [pick]);

  const test = async (ids: string[]) => {
    setRunning(new Set(ids));
    setSamples((all) => {
      const next = { ...all };
      for (const id of ids) next[id] = [];
      return next;
    });
    try {
      const out = await api.netTest(ids);
      if (!live.current) return;
      setResults((r) => {
        const next = { ...r };
        for (const m of out) next[m.id] = m;
        const saved = { at: Date.now(), results: next };
        save("netLast", saved);
        setLast(saved);
        return next;
      });
    } finally {
      if (live.current) setRunning(new Set());
    }
  };
  // première visite : le test se lance tout seul
  useEffect(() => {
    if (!last) void test(ALL);
  }, []);

  const busy = running.size > 0;
  // serveur introuvable (pas de réseau, serveur renommé) : la ligne disparaît plutôt que d'afficher une erreur
  const visible = (id: string) => results[id]?.error !== "dns";
  const testing = running.has(pick);
  const sel = testing ? undefined : results[pick];
  const g = grade(sel);
  // pendant la mesure : les chiffres des essais déjà reçus
  const shown = testing ? partial(pick, samples[pick] ?? []) : sel;
  const name = (id: string) => t(`net.${id}` as Key);
  const ms = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));
  const dec = (v: number | null | undefined) => (v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString(lang === "fr" ? "fr-FR" : "en-US"));
  const pct = (v: number | undefined) => (v == null ? "—" : `${dec(v * 100)} %`);
  const ago = (ts: number) => {
    const min = Math.round((Date.now() - ts) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { numeric: "auto" });
    return min < 60 ? rtf.format(-min, "minute") : min < 1440 ? rtf.format(-Math.round(min / 60), "hour") : rtf.format(-Math.round(min / 1440), "day");
  };
  const tip = sel && sel.ping != null && (sel.loss > 0 || (sel.jitter ?? 0) > 10);
  // la courbe : les essais en direct pendant la mesure, sinon ceux du dernier résultat
  const series = testing ? (samples[pick] ?? []) : (sel?.series ?? []);
  const lost = shown?.lost ?? (shown ? Math.round(shown.loss * shown.samples) : undefined);
  const done = testing ? series.filter((v) => v !== undefined).length : 0;

  return (
    <motion.div className="nettest" variants={stagger} initial="initial" animate="animate">
      <div className="net-grid">
        <motion.section variants={rise} className="card nt-hero">
          <header className="card-head">
            <h3 className="rg-overline">{t("net.connection")}</h3>
            {sel?.method && <span className="badge">{t(`net.method.${sel.method}` as Key)}</span>}
          </header>
          <div className="nt-head">
            <div className={`net-orb nt-orb${g ? ` ${g}` : ""}${testing ? " busy" : ""}`}>
              <Globe size={26} strokeWidth={1.5} />
            </div>
            <div className="nt-head-text">
              <div className="net-verdict">{testing ? t("net.testing") : g ? t(`net.grade.${g}`) : t("net.start")}</div>
              <div className="net-sub muted small">
                {name(pick)}
                {testing ? ` · ${done}/${slots(pick)}` : last && results[pick] ? ` · ${t("net.tested", { when: ago(last.at) })}` : ""}
              </div>
            </div>
            <div className="nt-avg">
              <div className={`nt-avg-value rg-metric${g ? ` ${g}` : ""}`}>
                {ms(shown?.ping)}
                <span>ms</span>
              </div>
              <div className="nt-avg-label">{t("net.average")}</div>
            </div>
          </div>

          <Chart series={series} n={testing ? slots(pick) : Math.max(series.length, slots(pick))} avg={sel?.ping ?? null} t={t} />

          <div className="nt-stats">
            <Stat label={t("net.best")} value={ms(shown?.best)} unit="ms" />
            <Stat
              label={t("net.worst")}
              value={ms(shown?.worst)}
              unit="ms"
              warn={shown?.worst != null && shown.ping != null && shown.worst > shown.ping * 2 && shown.worst - shown.ping > 20}
            />
            <Stat label={t("net.jitter")} value={dec(shown?.jitter)} unit="ms" warn={(shown?.jitter ?? 0) > 10} />
            <Stat
              label={t("net.lost")}
              value={shown ? `${lost ?? 0}/${shown.samples}` : "—"}
              unit={shown && lost ? pct(shown.loss) : undefined}
              warn={(lost ?? 0) > 0}
            />
            <Stat label={t("net.spikes")} value={sel?.spikes == null ? "—" : String(sel.spikes)} warn={(sel?.spikes ?? 0) >= 3} />
          </div>

          <div className="nt-actions">
            <Button variant="primary" disabled={busy} icon={testing ? <LoaderCircle size={14} className="spin" /> : <Play size={13} />} onClick={() => void test([pick])}>
              {testing ? t("net.testing") : t("net.testThis", { server: name(pick) })}
            </Button>
            <Button disabled={busy} icon={busy && !testing ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={13} />} onClick={() => void test(ALL)}>
              {t("net.testAll")}
            </Button>
          </div>
          {tip && (
            <button type="button" className="net-tip" onClick={() => goTo("netopt")}>
              <span>{t("net.tip")}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </motion.section>

        <motion.section variants={rise} className="card net-servers">
          <header className="card-head">
            <h3 className="rg-overline">{t("net.servers")}</h3>
            <span className="muted small">{t("net.servers.hint")}</span>
          </header>
          {GROUPS.map((grp) => {
            const items = grp.items.filter((i) => visible(i.id));
            if (!items.length) return null;
            return (
              <div key={grp.label} className="net-group">
                <div className="rg-overline net-group-label">{t(grp.label)}</div>
                {items.map(({ id, code }) => {
                  const m = results[id];
                  const q = grade(m);
                  const b = bars(m?.ping ?? null);
                  const lostN = m?.lost ?? (m ? Math.round(m.loss * m.samples) : 0);
                  return (
                    <button key={id} type="button" role="radio" aria-checked={pick === id} className={`net-row${pick === id ? " on" : ""}`} onClick={() => setPick(id)}>
                      <span className="net-radio" />
                      <span className="net-code rg-metric">{code}</span>
                      <span className="net-name">
                        <span>{name(id)}</span>
                        <span className="muted small">{t(`net.${id}.desc` as Key)}</span>
                      </span>
                      {m && !running.has(id) && lostN > 0 && <span className="nt-lost rg-metric">{t("net.lostShort", { n: lostN })}</span>}
                      <span className={`net-bars${q ? ` ${q}` : ""}`} aria-hidden>
                        {[1, 2, 3, 4].map((i) => (
                          <i key={i} className={i <= b ? "lit" : undefined} />
                        ))}
                      </span>
                      <span className={`net-ms rg-metric${q ? ` ${q}` : ""}`}>
                        {running.has(id) ? <LoaderCircle size={13} className="spin" /> : m?.ping != null ? `${ms(m.ping)} ms` : m ? t("net.noAnswer") : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <p className="net-note muted small">
            <ShieldCheck size={13} />
            {t("net.note")}
          </p>
          <p className="net-note muted small">
            <Globe size={13} />
            {t("net.shared")}
          </p>
        </motion.section>
      </div>

      <motion.div variants={rise}>
        <Diagnostic />
      </motion.div>
    </motion.div>
  );
}

type T = (key: Key, vars?: Record<string, string | number>) => string;

function Stat({ label, value, unit, warn }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className="net-stat">
      <div className={`net-stat-value rg-metric${warn ? " warn" : ""}`}>
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <div className="net-stat-label">{label}</div>
    </div>
  );
}

/** Chaque essai en barre : jaune quand il monte nettement au-dessus des autres, rouge quand il est perdu. */
function Chart({ series, n, avg, t }: { series: (number | null | undefined)[]; n: number; avg: number | null; t: T }) {
  const got = series.filter((v): v is number => typeof v === "number");
  const sorted = [...got].sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  // même règle que nettest.rs pour les pics
  const spike = (v: number) => sorted.length >= 4 && v > med + Math.max(15, med / 2);
  const top = Math.max(10, ...got, (avg ?? med) * 1.6);
  return (
    <div className="nt-chart" role="img" aria-label={t("net.chart")}>
      <div className="nt-plot">
        <span className="nt-chart-top rg-metric">{Math.round(top)} ms</span>
        <div className="nt-bars">
          {avg != null && (
            <span className="nt-chart-avg" style={{ bottom: `${(avg / top) * 100}%` }}>
              <span className="rg-metric">
                {t("net.chart.avg")} {Math.round(avg)}
              </span>
            </span>
          )}
          {Array.from({ length: n }, (_, i) => {
            const v = series[i];
            if (v === undefined) return <i key={i} className="pending" />;
            if (v === null) return <i key={i} className="lost" title={`#${i + 1} · ${t("net.chart.lost")}`} />;
            return <i key={i} className={spike(v) ? "spike" : undefined} style={{ height: `${Math.max(3, (v / top) * 100)}%` }} title={`#${i + 1} · ${Math.round(v * 10) / 10} ms`} />;
          })}
        </div>
      </div>
    </div>
  );
}

/** Tests plus longs du moteur réseau vers un serveur choisi : stabilité sur 100 pings, ping sous charge, MTU. */
function Diagnostic() {
  const { t, goTo } = useStore();
  const [target, setTarget] = useState<string>(() => load("netTarget", "1.1.1.1"));
  const [busy, setBusy] = useState<ToolId | null>(null);
  const [progress, setProgress] = useState<{ step: number; total: number } | null>(null);
  const [results, setResults] = useState<Partial<Record<ToolId, Record<string, unknown>>>>({});
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    const sub = api.onNetOptLine((l) => {
      if (live.current && l.tag === "progress") setProgress({ step: l.step ?? 0, total: l.total ?? 0 });
    });
    return () => {
      live.current = false;
      void sub.then((un) => un());
    };
  }, []);
  useEffect(() => save("netTarget", target), [target]);

  const run = async (id: ToolId) => {
    if (busy) return;
    setBusy(id);
    setError(null);
    setProgress(null);
    try {
      const out = await api.netOptRun(id, { ...NET_DEFAULTS, target });
      if (live.current && out.result) setResults((r) => ({ ...r, [id]: out.result! }));
    } catch (e) {
      const m = String(e);
      if (live.current) setError(m.startsWith("busy") ? t("no.busy") : m);
    } finally {
      if (live.current) {
        setBusy(null);
        setProgress(null);
      }
    }
  };
  // ligne instable : le Packet Optimizer s'ouvre avec « tolérance aux pertes » activée, à appliquer
  const markUnstable = async () => {
    const s = await api.netOptState().catch(() => null);
    const base = loadDraft() ?? (s?.applied ? { ...NET_DEFAULTS, ...s.applied.options } : NET_DEFAULTS);
    saveDraft({ ...base, stable: false, preset: "custom" });
    goTo("netopt");
  };

  return (
    <section className="card nt-diag">
      <header className="card-head">
        <h3 className="rg-overline">{t("net.diag")}</h3>
      </header>
      <div className="nt-diag-grid">
        <label className="no-target">
          <span className="no-toggle-title">{t("no.target")}</span>
          <span className="no-toggle-desc">{t("net.diag.desc")}</span>
          <input
            className={`input${validTarget(target) ? "" : " bad"}`}
            value={target}
            spellCheck={false}
            maxLength={253}
            onChange={(e) => setTarget(e.target.value.trim())}
          />
          {!validTarget(target) && <span className="no-bad small">{t("no.target.bad")}</span>}
          {error && (
            <span className="no-error small">
              <CircleX size={13} />
              {error}
            </span>
          )}
        </label>
        <div className="nt-diag-tools">
          {DIAG.map((id) => (
            <Tool
              key={id}
              id={id}
              running={busy === id}
              disabled={!!busy || !validTarget(target)}
              result={results[id]}
              progress={busy === id ? progress : null}
              onRun={() => void run(id)}
              onUnstable={() => void markUnstable()}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
