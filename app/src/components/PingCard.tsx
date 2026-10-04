import { motion } from "motion/react";
import { Activity, ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type PingResult } from "../lib/api";
import { formatNumber } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button, Card } from "./ui";

interface Saved {
  result: PingResult;
  ts: number;
}

function read<T>(k: string, f: T): T {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : f;
  } catch {
    return f;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* rien */
  }
}

function Spark({ samples }: { samples: number[] }) {
  if (samples.length < 2) return null;
  const w = 220;
  const h = 44;
  const max = Math.max(...samples) * 1.1;
  const min = Math.min(...samples) * 0.9;
  const pts = samples.map((s, i) => [(i / (samples.length - 1)) * w, h - ((s - min) / (max - min || 1)) * h]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <motion.path d={d} fill="none" stroke="var(--rg-red-500)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
    </svg>
  );
}

export function PingCard() {
  const { t, lang, pingRequest } = useStore();
  const [host, setHost] = useState(() => read("rago.pingHost", "hypixel.net"));
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Saved | null>(() => read("rago.pingLast", null));
  const [prev, setPrev] = useState<Saved | null>(() => read("rago.pingPrev", null));
  const handled = useRef(0);

  const measure = useCallback(async () => {
    setBusy(true);
    write("rago.pingHost", host);
    try {
      const result = await api.ping(host.trim(), 25565, 10);
      const now = { result, ts: Date.now() };
      // on ne compare qu'avec une mesure réussie vers le même serveur
      const base = last && last.result.host === result.host && last.result.avg != null ? last : prev?.result.host === result.host ? prev : null;
      setPrev(base);
      setLast(now);
      write("rago.pingPrev", base);
      write("rago.pingLast", now);
    } finally {
      setBusy(false);
    }
  }, [host, last, prev]);

  useEffect(() => {
    if (pingRequest > handled.current) {
      handled.current = pingRequest;
      void measure();
    }
  }, [pingRequest, measure]);

  const r = last?.result;
  const delta = r?.avg != null && prev?.result.avg != null ? r.avg - prev.result.avg : null;

  return (
    <Card title={t("ping.title")} className="ping">
      <form
        className="ping-form"
        onSubmit={(e) => {
          e.preventDefault();
          void measure();
        }}
      >
        <input className="input" value={host} onChange={(e) => setHost(e.target.value)} aria-label={t("ping.host")} spellCheck={false} />
        <Button type="submit" variant="secondary" icon={<Activity size={14} className={busy ? "pulse-icon" : undefined} />} disabled={busy || !host.trim()}>
          {busy ? t("ping.measuring") : t("ping.measure")}
        </Button>
      </form>
      {r && !r.error && r.avg != null ? (
        <>
          <div className="ping-main">
            <div className="ping-value rg-metric">
              <motion.span key={last!.ts} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {formatNumber(lang, r.avg)}
              </motion.span>
              <small>ms</small>
            </div>
            {delta != null && Math.abs(delta) >= 0.1 && (
              <div className={`ping-delta rg-metric ${delta < 0 ? "good" : "bad"}`}>
                {delta < 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                {delta < 0 ? "\u2212" : "+"}
                {formatNumber(lang, Math.abs(delta))} ms
                <span>{t("ping.vsPrev")}</span>
              </div>
            )}
          </div>
          <Spark samples={r.samples} />
          <dl className="ping-stats rg-metric">
            <div><dt>{t("ping.min")}</dt><dd>{formatNumber(lang, r.min ?? 0)}</dd></div>
            <div><dt>{t("ping.max")}</dt><dd>{formatNumber(lang, r.max ?? 0)}</dd></div>
            <div><dt>{t("ping.jitter")}</dt><dd>{formatNumber(lang, r.jitter ?? 0)}</dd></div>
            <div><dt>{t("ping.loss")}</dt><dd>{formatNumber(lang, r.loss, 0)}{lang === "fr" ? " %" : "%"}</dd></div>
          </dl>
        </>
      ) : r?.error ? (
        <p className="error-text small">{t("ping.error")} : {r.error}</p>
      ) : (
        <p className="muted small">{t("ping.hint")}</p>
      )}
    </Card>
  );
}
