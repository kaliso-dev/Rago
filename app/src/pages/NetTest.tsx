import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Globe, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { api, type NetMeasure } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button } from "../components/ui";

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

type Grade = "great" | "good" | "fair" | "bad";
function grade(m: NetMeasure | undefined): Grade | null {
  if (!m || m.ping == null) return m ? "bad" : null;
  if (m.loss > 0.02 || (m.jitter ?? 0) > 15) return "bad";
  if (m.ping <= 40 && (m.jitter ?? 0) <= 5 && m.loss === 0) return "great";
  if (m.ping <= 80 && (m.jitter ?? 0) <= 10) return "good";
  return "fair";
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
  const [pick, setPick] = useState<string>(() => load("netPick", "hypixel"));
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    const sub = api.onNetMeasure((m) => {
      if (!live.current) return;
      setResults((r) => ({ ...r, [m.id]: m }));
      setRunning((s) => {
        const next = new Set(s);
        next.delete(m.id);
        return next;
      });
    });
    return () => {
      live.current = false;
      void sub.then((un) => un());
    };
  }, []);
  useEffect(() => save("netPick", pick), [pick]);

  const test = async (ids: string[]) => {
    setRunning(new Set(ids));
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
  const sel = results[pick];
  const g = running.has(pick) ? null : grade(sel);
  const name = (id: string) => t(`net.${id}` as Key);
  const ms = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));
  const pct = (v: number | undefined) => (v == null ? "—" : String(Math.round(v * 1000) / 10).replace(".", lang === "fr" ? "," : "."));
  const ago = (ts: number) => {
    const min = Math.round((Date.now() - ts) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { numeric: "auto" });
    return min < 60 ? rtf.format(-min, "minute") : min < 1440 ? rtf.format(-Math.round(min / 60), "hour") : rtf.format(-Math.round(min / 1440), "day");
  };
  const tip = sel && sel.ping != null && (sel.loss > 0 || (sel.jitter ?? 0) > 10);

  return (
    <motion.div className="page nettest" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("net.overline")}</div>
        <h1>{t("net.title")}</h1>
        <p className="lead">{t("net.lead")}</p>
      </motion.header>

      <div className="net-grid">
        <motion.section variants={rise} className="card net-conn">
          <header className="card-head">
            <h3 className="rg-overline">{t("net.connection")}</h3>
          </header>
          <div className={`net-orb${g ? ` ${g}` : ""}${running.has(pick) ? " busy" : ""}`}>
            <Globe size={44} strokeWidth={1.5} />
          </div>
          <div className="net-verdict">{running.has(pick) ? t("net.testing") : g ? t(`net.grade.${g}`, { server: name(pick) }) : t("net.start")}</div>
          <div className="net-sub muted small">
            {name(pick)}
            {last && !busy && ` · ${t("net.tested", { when: ago(last.at) })}`}
          </div>
          <div className="net-stats">
            <div className="net-stat">
              <div className="net-stat-value rg-metric">
                {ms(sel?.ping)}
                <span>ms</span>
              </div>
              <div className="net-stat-label">{t("net.ping")}</div>
            </div>
            <div className="net-stat">
              <div className={`net-stat-value rg-metric${(sel?.jitter ?? 0) > 10 ? " warn" : ""}`}>
                {ms(sel?.jitter)}
                <span>ms</span>
              </div>
              <div className="net-stat-label">{t("net.jitter")}</div>
            </div>
            <div className="net-stat">
              <div className={`net-stat-value rg-metric${(sel?.loss ?? 0) > 0 ? " warn" : ""}`}>
                {pct(sel?.loss)}
                <span>%</span>
              </div>
              <div className="net-stat-label">{t("net.loss")}</div>
            </div>
          </div>
          <Button className="net-go" disabled={busy} icon={busy ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={13} />} onClick={() => void test(ALL)}>
            {busy ? t("net.testing") : last ? t("net.again") : t("net.go")}
          </Button>
          {tip && (
            <button type="button" className="net-tip" onClick={() => goTo("network")}>
              <span>{t("net.tip")}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </motion.section>

        <motion.section variants={rise} className="card net-servers">
          <header className="card-head">
            <h3 className="rg-overline">{t("net.servers")}</h3>
            <Button size="sm" icon={<RefreshCw size={12} className={busy ? "spin" : undefined} />} disabled={busy} onClick={() => void test(ALL)}>
              {t("net.testAll")}
            </Button>
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
                  return (
                    <button key={id} type="button" role="radio" aria-checked={pick === id} className={`net-row${pick === id ? " on" : ""}`} onClick={() => setPick(id)}>
                      <span className="net-radio" />
                      <span className="net-code rg-metric">{code}</span>
                      <span className="net-name">
                        <span>{name(id)}</span>
                        <span className="muted small">{t(`net.${id}.desc` as Key)}</span>
                      </span>
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
        </motion.section>
      </div>
    </motion.div>
  );
}
