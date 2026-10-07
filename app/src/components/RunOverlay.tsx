import { AnimatePresence, motion } from "motion/react";
import { Activity, ArrowRight, Check, FolderOpen, LoaderCircle, Power, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { formatNumber } from "../lib/i18n";
import { totalTweaks } from "../lib/catalog";
import { FREE, itemName, useStore } from "../lib/store";
import { Pulse } from "./Logo";
import { Button } from "./ui";

export function RunOverlay() {
  const { t, lang, run, setRun, goTo, requestPing, premium, license, setUpsell } = useStore();
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run?.logs.length]);

  const listRef = useRef<HTMLOListElement>(null);
  const runningIndex = run?.rows.findIndex((r) => r.status === "running") ?? -1;
  useEffect(() => {
    if (runningIndex < 0) return;
    listRef.current?.children[runningIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [runningIndex]);

  const total = run?.rows.length ?? 0;
  const finished = run?.rows.filter((r) => r.status === "ok" || r.status === "error").length ?? 0;
  const failed = run?.rows.filter((r) => r.status === "error").length ?? 0;
  const current = run?.rows.find((r) => r.status === "running");
  const isDone = !!run && (!!run.done || !!run.error);
  const cancelled = run?.done?.cancelled;
  const seconds = run ? ((run.endedAt ?? Date.now()) - run.startedAt) / 1000 : 0;
  const pct = total ? (finished / total) * 100 : 0;

  const close = () => setRun(null);

  return (
    <AnimatePresence>
      {run && (
        <motion.div className="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
          <div className="run-hero">
            <Pulse size={132} active={!isDone} />
            <div className="rg-overline run-state">{isDone ? (cancelled ? t("run.cancelled") : t("run.done")) : t("run.title")}</div>
            <div className="run-counter rg-metric">
              <motion.span key={finished} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                {String(finished).padStart(2, "0")}
              </motion.span>
              <span className="run-counter-total">/{String(total).padStart(2, "0")}</span>
            </div>
            <div className="run-progress">
              <motion.div className="run-progress-fill" animate={{ width: `${pct}%` }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.42 }} />
            </div>
            <div className="run-current">
              {isDone ? (
                run.error ? (
                  <span className="error-text">{run.error}</span>
                ) : (
                  <>
                    {t("run.summary", { ok: finished - failed, total, s: formatNumber(lang, seconds) })}
                    {failed > 0 && <div className="error-text">{t("run.failed", { n: failed })}</div>}
                    {run.reboot && !cancelled && <div className="muted">{t("run.rebootNeeded")}</div>}
                    {license && !premium && !cancelled && (
                      <button
                        type="button"
                        className="run-upsell"
                        onClick={() => {
                          close();
                          setUpsell("plan");
                        }}
                      >
                        <Sparkles size={13} />
                        <span>{t("done.upsell", { n: totalTweaks - FREE.size })}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </>
                )
              ) : (
                current && itemName(current.id, lang)
              )}
            </div>
            <div className="run-actions">
              {!isDone ? (
                <Button icon={<Square size={12} />} onClick={() => api.cancelRun()}>
                  {t("run.cancel")}
                </Button>
              ) : (
                <>
                  {run.reboot && !cancelled && (
                    <Button variant="primary" icon={<Power size={14} />} onClick={() => api.restartPc()}>
                      {t("run.reboot")}
                    </Button>
                  )}
                  <Button
                    variant={run.reboot ? "secondary" : "primary"}
                    icon={<Activity size={14} />}
                    onClick={() => {
                      close();
                      goTo("dashboard");
                      requestPing();
                    }}
                  >
                    {t("run.ping")}
                  </Button>
                  <Button variant="ghost" onClick={close}>
                    {t("run.close")}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="run-side">
            <ol className="run-list" ref={listRef}>
              {run.rows.map((r, i) => (
                <li key={`${r.id}-${i}`} className={`run-row ${r.status}`}>
                  <span className="run-icon">
                    {r.status === "running" && <LoaderCircle size={14} className="spin" />}
                    {r.status === "ok" && <Check size={14} />}
                    {r.status === "error" && <X size={14} />}
                    {r.status === "pending" && <span className="run-dot" />}
                  </span>
                  <span className="run-name">{itemName(r.id, lang)}</span>
                  {r.durationMs != null && <span className="rg-metric run-ms">{formatNumber(lang, r.durationMs / 1000)} s</span>}
                </li>
              ))}
            </ol>
            <div className="run-console-head">
              <span className="rg-overline">{t("run.console")}</span>
              {isDone && run.done?.logFile && (
                <button type="button" className="link" onClick={() => api.openFolder("logs")}>
                  <FolderOpen size={12} /> {t("run.openLog")}
                </button>
              )}
            </div>
            <div className="run-console" ref={consoleRef}>
              {run.logs.map((l, i) => (
                <div key={i} className={l.line.startsWith("!") ? "err" : undefined}>
                  <span className="run-console-id">{l.id}</span> {l.line}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
