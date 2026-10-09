import { Cpu, Gpu, ListTree, MemoryStick } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api, type LiveStats } from "../lib/api";
import { formatNumber } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button, Card } from "./ui";

/** Une demande par seconde, jamais deux à la fois, et aucune quand la fenêtre est cachée. */
const PERIOD = 1000;
const UNAVAILABLE: LiveStats = { ready: true, ram: null, cpu: null, gpu: null, ramUsed: null, ramTotal: null };

function useLiveStats(): LiveStats | null {
  const [stats, setStats] = useState<LiveStats | null>(null);
  useEffect(() => {
    let alive = true;
    let busy = false;
    let timer: number | undefined;
    const tick = async () => {
      if (!alive || busy || document.hidden) return;
      busy = true;
      try {
        const s = await api.liveStats();
        if (alive) setStats(s);
      } catch {
        if (alive) setStats(UNAVAILABLE);
      } finally {
        busy = false;
      }
      if (alive && !document.hidden) {
        window.clearTimeout(timer);
        timer = window.setTimeout(tick, PERIOD);
      }
    };
    const onVisibility = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return stats;
}

function Meter({ icon, label, detail, value, ready }: { icon: ReactNode; label: string; detail: string; value: number | null; ready: boolean }) {
  const { t, lang } = useStore();
  const off = ready && value == null;
  const pct = value == null ? null : Math.round(value);
  return (
    <div
      className={`meter${off ? " off" : ""}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      aria-valuetext={off ? t("live.unavailable") : undefined}
    >
      <div className="meter-head">
        <span className="spec-icon">{icon}</span>
        <div className="meter-text">
          <div className="meter-label">{label}</div>
          <div className="meter-detail">{off ? t("live.unavailableHint") : detail}</div>
        </div>
        <span className="meter-value rg-metric">
          {!ready ? "…" : pct == null ? t("live.unavailable") : `${pct}${lang === "fr" ? "\u00a0%" : "%"}`}
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ transform: `scaleX(${(pct ?? 0) / 100})` }} />
      </div>
    </div>
  );
}

/** Tableau de bord : RAM, carte graphique et processeur en direct, mesurés par Windows. */
export function LiveStatsCard() {
  const { t, lang } = useStore();
  const stats = useLiveStats();
  const ready = !!stats?.ready;
  const gb = (bytes: number) => formatNumber(lang, bytes / 1024 ** 3, 1);
  const ramDetail =
    stats?.ramUsed != null && stats.ramTotal != null
      ? t("live.ramDetail", { used: gb(stats.ramUsed), total: formatNumber(lang, Math.round(stats.ramTotal / 1024 ** 3), 0) })
      : "";
  return (
    <Card
      title={
        <>
          {t("live.title")}
          {ready && <span className="live-dot" aria-hidden />}
        </>
      }
      action={
        <Button variant="ghost" size="sm" className="live-taskmgr" icon={<ListTree size={13} />} onClick={() => void api.openTaskManager().catch(() => undefined)}>
          {t("live.taskmgr")}
        </Button>
      }
      className="live"
    >
      <div className="meters">
        <Meter icon={<MemoryStick size={15} />} label={t("live.ram")} detail={ramDetail} value={stats?.ram ?? null} ready={ready} />
        <Meter icon={<Gpu size={15} />} label={t("live.gpu")} detail={t("live.gpuDetail")} value={stats?.gpu ?? null} ready={ready} />
        <Meter icon={<Cpu size={15} />} label={t("live.cpu")} detail={t("live.cpuDetail")} value={stats?.cpu ?? null} ready={ready} />
      </div>
      <p className="muted small live-note">
        {t("live.hint")} {t("live.free")}
      </p>
    </Card>
  );
}
