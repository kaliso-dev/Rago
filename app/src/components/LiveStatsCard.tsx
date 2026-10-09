import { Cpu, Gpu, MemoryStick } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api, type LiveStats } from "../lib/api";
import { useStore } from "../lib/store";
import { Card } from "./ui";

/** Une demande par seconde, jamais deux à la fois, et aucune quand la fenêtre est cachée. */
const PERIOD = 1000;
const UNAVAILABLE: LiveStats = { ready: true, ram: null, cpu: null, gpu: null };

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

function Meter({ icon, label, value, ready }: { icon: ReactNode; label: string; value: number | null; ready: boolean }) {
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
      title={off ? t("live.unavailableHint") : undefined}
    >
      <div className="meter-head">
        <span className="spec-icon">{icon}</span>
        <span className="meter-label">{label}</span>
        <span className="meter-value rg-metric">
          {!ready ? "…" : pct == null ? t("live.unavailable") : `${pct}${lang === "fr" ? " %" : "%"}`}
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
  const { t } = useStore();
  const stats = useLiveStats();
  const ready = !!stats?.ready;
  return (
    <Card title={t("live.title")} action={ready ? <span className="live-dot" aria-hidden /> : undefined} className="live">
      <div className="meters">
        <Meter icon={<MemoryStick size={15} />} label={t("live.ram")} value={stats?.ram ?? null} ready={ready} />
        <Meter icon={<Gpu size={15} />} label={t("live.gpu")} value={stats?.gpu ?? null} ready={ready} />
        <Meter icon={<Cpu size={15} />} label={t("live.cpu")} value={stats?.cpu ?? null} ready={ready} />
      </div>
      <p className="muted small">{t("live.hint")}</p>
    </Card>
  );
}
