import { BrushCleaning, Cpu, Gpu, ListTree, LoaderCircle, MemoryStick } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api, type Cleaned, type LiveStats } from "../lib/api";
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

function Meter({ icon, label, detail, value, ready, action }: { icon: ReactNode; label: string; detail: ReactNode; value: number | null; ready: boolean; action?: ReactNode }) {
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
        {action}
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

/** Résultat du dernier « Nettoyer », affiché une minute sous la RAM. */
const CLEANED_FOR = 60_000;

/** Tableau de bord : RAM, carte graphique et processeur en direct, mesurés par Windows. */
export function LiveStatsCard() {
  const { t, lang, cleanTrim } = useStore();
  const stats = useLiveStats();
  const ready = !!stats?.ready;
  const gb = (bytes: number) => formatNumber(lang, bytes / 1024 ** 3, 1);
  // « Nettoyer » (memory.rs) : le cache vidé s'affiche à côté de la RAM utilisée, en vert, puis disparaît
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState<(Cleaned & { failed?: boolean }) | null>(null);
  useEffect(() => {
    if (!cleaned) return;
    const timer = window.setTimeout(() => setCleaned(null), CLEANED_FOR);
    return () => window.clearTimeout(timer);
  }, [cleaned]);
  const clean = async () => {
    setCleaning(true);
    try {
      setCleaned(await api.cleanRam(cleanTrim));
    } catch {
      setCleaned({ standby: 0, trimmed: 0, apps: 0, failed: true });
    } finally {
      setCleaning(false);
    }
  };
  // moins de 50 Mo : rien à annoncer
  const cleanedText = !cleaned
    ? null
    : cleaned.failed
      ? t("live.cleanFailed")
      : [
          cleaned.standby >= 50 * 1024 ** 2 ? t("live.cleaned", { n: gb(cleaned.standby) }) : t("live.cleanedEmpty"),
          cleaned.apps > 0 ? t("live.cleanedApps", { gb: gb(cleaned.trimmed), n: cleaned.apps }) : null,
        ]
          .filter(Boolean)
          .join(" · ");
  const ramDetail = (
    <>
      {stats?.ramUsed != null && stats.ramTotal != null
        ? t("live.ramDetail", { used: gb(stats.ramUsed), total: formatNumber(lang, Math.round(stats.ramTotal / 1024 ** 3), 0) })
        : ""}
      {cleanedText && <span className={`meter-cleaned${cleaned?.failed ? " failed" : ""}`}> · {cleanedText}</span>}
    </>
  );
  const cleanBtn = (
    <Button
      size="sm"
      className="meter-clean"
      title={t("live.cleanHint")}
      disabled={cleaning}
      icon={cleaning ? <LoaderCircle size={13} className="spin" /> : <BrushCleaning size={13} />}
      onClick={() => void clean()}
    >
      {cleaning ? t("live.cleaning") : t("live.clean")}
    </Button>
  );
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
        <Meter icon={<MemoryStick size={15} />} label={t("live.ram")} detail={ramDetail} value={stats?.ram ?? null} ready={ready} action={cleanBtn} />
        <Meter icon={<Gpu size={15} />} label={t("live.gpu")} detail={t("live.gpuDetail")} value={stats?.gpu ?? null} ready={ready} />
        <Meter icon={<Cpu size={15} />} label={t("live.cpu")} detail={t("live.cpuDetail")} value={stats?.cpu ?? null} ready={ready} />
      </div>
      <p className="muted small live-note">
        {t("live.hint")} {t("live.free")}
      </p>
    </Card>
  );
}
