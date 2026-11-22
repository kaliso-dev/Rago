import { motion } from "motion/react";
import { RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, type RbwCheck } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button } from "./ui";

const STATE: Record<RbwCheck["state"], Key> = {
  running: "rbw.state.running",
  stopped: "rbw.state.stopped",
  starting: "rbw.state.starting",
  stopping: "rbw.state.stopping",
  paused: "rbw.state.paused",
  missing: "rbw.state.missing",
  on: "rbw.state.on",
  off: "rbw.state.off",
};
const START: Record<NonNullable<RbwCheck["start"]>, Key> = {
  auto: "rbw.start.auto",
  manual: "rbw.start.manual",
  disabled: "rbw.start.disabled",
  boot: "rbw.start.system",
  system: "rbw.start.system",
};

/** Sous RBW Mod : ce que lit le vérificateur de Ranked Bedwars, relu toutes les 5 secondes et après chaque lot. */
export function RbwStatus() {
  const { t, run, requestApplyEntries } = useStore();
  const [checks, setChecks] = useState<RbwCheck[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setChecks(await api.rbwStatus());
    } catch {
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    const sub = api.onDone(() => void refresh());
    return () => {
      window.clearInterval(timer);
      void sub.then((un) => un());
    };
  }, [refresh]);

  const services = checks?.filter((c) => c.kind === "service") ?? [];
  const settings = checks?.filter((c) => c.kind === "setting") ?? [];
  const red = checks?.filter((c) => !c.ok).length ?? 0;
  const ready = checks != null && checks.length > 0 && red === 0;

  const row = (c: RbwCheck) => (
    <li key={c.name} className={c.ok ? "ok" : "bad"}>
      <span className={`dot ${c.ok ? "dot-ok" : "dot-bad"}`} />
      <span className="rbw-name rg-metric">{c.name}</span>
      <span className="rbw-state">{t(STATE[c.state])}</span>
      {c.start && <span className="rbw-start">{t(START[c.start])}</span>}
    </li>
  );

  return (
    <motion.section
      className={`card rbw-status${checks == null ? "" : ready ? " ready" : " red"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="rbw-head">
        <span className="rbw-badge" aria-hidden="true">
          {ready || checks == null ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
        </span>
        <div className="rbw-verdict">
          <div className="rg-overline">{t("rbw.title")}</div>
          <h2>{checks == null ? t("rbw.reading") : ready ? t("rbw.ready") : t("rbw.red", { n: red })}</h2>
          <p className="muted small">{ready ? t("rbw.readyLead") : t("rbw.lead")}</p>
        </div>
        <div className="rbw-actions">
          <button type="button" className="icon-btn" aria-label={t("rbw.refresh")} title={t("rbw.refresh")} onClick={() => void refresh()}>
            <RefreshCw size={13} className={loading ? "spin" : undefined} />
          </button>
          {checks != null && red > 0 && (
            <Button
              size="sm"
              variant="primary"
              disabled={!!run}
              // relancé même s'il est déjà « Activé » : Windows ou un autre programme a pu recouper un service depuis
              onClick={() => requestApplyEntries(["rbw_mode:on"], { title: t("rbw.fixTitle"), lead: t("rbw.fixLead") }, true)}
            >
              {t("rbw.fix")}
            </Button>
          )}
        </div>
      </header>
      {checks != null && checks.length > 0 && (
        <div className="rbw-grid">
          <div>
            <div className="rg-overline rbw-group">{t("rbw.services", { n: services.length })}</div>
            <ul className="rbw-list">{services.map(row)}</ul>
          </div>
          <div>
            <div className="rg-overline rbw-group">{t("rbw.settings")}</div>
            <ul className="rbw-list">{settings.map(row)}</ul>
          </div>
        </div>
      )}
    </motion.section>
  );
}
