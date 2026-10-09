import { motion } from "motion/react";
import { Check, Cpu, Gpu, HardDrive, MemoryStick, Network, Plus, RefreshCw, Lock, RotateCcw, TriangleAlert } from "lucide-react";
import { availability, catalog, distinctKey, retired, totalTweaks, tweaks, type Preset } from "../lib/catalog";
import { useStore } from "../lib/store";
import { LiveStatsCard } from "../components/LiveStatsCard";
import { Button, Card } from "../components/ui";
import type { ReactNode } from "react";

const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

function Spec({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <div className="spec">
      <span className="spec-icon">{icon}</span>
      <div>
        <div className="spec-label">{label}</div>
        <div className="spec-value">{value}</div>
        {sub && <div className="spec-sub rg-metric">{sub}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, lang, sys, sysLoading, refreshSys, isOn, selected, variantOf, selectMany, lastRun, requestApply, premium, setUpsell, applied: appliedMap, retiredApplied, requestUndo, run } = useStore();
  // réglages appliqués en ce moment (ceux qu'on a décochés depuis ne comptent plus), jumeaux comptés une fois
  const applied = new Set([...appliedMap.values()].filter((a) => a.ok && tweaks.get(a.id)?.kind === "tweak").map((a) => distinctKey(a.id))).size;
  const restore = lastRun.get("rst_point");

  /** Réglages d'un preset utilisables sur ce PC (comme selectMany : pas les pilotes d'une autre marque de carte graphique
   * ou de processeur), et preset complet : chacun allumé, avec la variante du preset. */
  const presetState = (p: Preset) => {
    const usable = p.tweaks.flatMap((e) => {
      const [id, v] = e.split(":");
      const tw = tweaks.get(id);
      return tw && tw.kind === "tweak" && availability(tw, sys).ok ? [{ tw, v }] : [];
    });
    const variantNow = (id: string) => (selected.has(id) ? variantOf(tweaks.get(id)!) : appliedMap.get(id)?.variant);
    const on = usable.length > 0 && usable.every(({ tw, v }) => isOn(tw.id) && (!v || variantNow(tw.id) === v));
    return { n: usable.length, on };
  };

  const health: { label: string; ok: boolean; value: string; action?: ReactNode }[] = sys
    ? [
        { label: t("dash.health.admin"), ok: sys.isAdmin, value: sys.isAdmin ? t("dash.yes") : t("dash.no") },
        { label: t("dash.health.wmic"), ok: sys.hasWmic, value: sys.hasWmic ? t("dash.yes") : t("dash.no") },
        {
          label: t("dash.health.npi"),
          ok: sys.resources.includes("nvidiaProfileInspector.exe"),
          value: sys.resources.includes("nvidiaProfileInspector.exe") ? t("dash.yes") : t("dash.no"),
        },
        {
          label: t("dash.health.restore"),
          ok: !!restore?.ok,
          value: restore?.ok ? new Date(restore.ts).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" }) : t("dash.health.restoreNone"),
          action: !restore?.ok ? (
            <Button size="sm" onClick={() => requestApply(["rst_point"])}>
              {t("dash.createRestore")}
            </Button>
          ) : undefined,
        },
        { label: t("dash.health.applied"), ok: applied > 0, value: `${applied} / ${totalTweaks}` },
      ]
    : [];

  return (
    <motion.div className="page dashboard" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("dash.overline")}</div>
        <h1 className="display">{t("dash.title")}</h1>
        <p className="lead">{t("dash.lead", { n: totalTweaks })}</p>
      </motion.header>

      <div className="dash-grid">
        <motion.div variants={rise} className="dash-system">
          <Card
            title={t("dash.system")}
            action={
              <button type="button" className="icon-btn" aria-label={t("dash.refresh")} onClick={() => refreshSys(true)}>
                <RefreshCw size={13} className={sysLoading ? "spin" : undefined} />
              </button>
            }
          >
            {sys ? (
              <div className="specs">
                <Spec icon={<HardDrive size={15} />} label={t("dash.os")} value={sys.osName} sub={`build ${sys.osBuild}`} />
                <Spec icon={<Cpu size={15} />} label={t("dash.cpu")} value={sys.cpuName} sub={lang === "fr" ? `${sys.cpuCores} cœurs · ${sys.cpuThreads} threads` : `${sys.cpuCores} cores · ${sys.cpuThreads} threads`} />
                <Spec icon={<Gpu size={15} />} label={t("dash.gpu")} value={sys.gpus.map((g) => g.name).join(" + ") || "—"} />
                <Spec icon={<MemoryStick size={15} />} label={t("dash.ram")} value={`${sys.ramGb} ${lang === "fr" ? "Go" : "GB"}`} />
                <Spec icon={<Network size={15} />} label={t("dash.net")} value={sys.adapterDesc ?? sys.adapter ?? "—"} sub={sys.linkSpeed} />
              </div>
            ) : (
              <div className="specs skeleton">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton-line" />)}</div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={rise} className="dash-live">
          <LiveStatsCard />
        </motion.div>

        <motion.div variants={rise} className="dash-health">
          <Card title={t("dash.health")}>
            <ul className="health">
              {health.map((h) => (
                <li key={h.label}>
                  <span className={`dot ${h.ok ? "dot-ok" : "dot-warn"}`} />
                  <span className="health-label">{h.label}</span>
                  <span className="health-value rg-metric">{h.value}</span>
                  {h.action}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </div>

      {retiredApplied.length > 0 && (
        <motion.div variants={rise} className="dash-retired">
          <Card title={t("dash.retired.title")}>
            <p className="muted small">{t("dash.retired.lead")}</p>
            <ul className="retired-list">
              {retiredApplied.map((id) => {
                const r = retired.get(id)!;
                return (
                  <li key={id}>
                    <TriangleAlert size={13} />
                    <span>
                      <b>{r.name[lang]}.</b> {r.reason[lang]}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button size="sm" icon={<RotateCcw size={12} />} disabled={!!run} onClick={() => requestUndo(retiredApplied)}>
              {t("dash.retired.go")}
            </Button>
          </Card>
        </motion.div>
      )}

      <motion.section variants={rise}>
        <h2 className="section-title rg-overline">{t("dash.presets")}</h2>
        <div className="presets">
          {catalog.presets.map((p, i) => {
            const { n, on: all } = presetState(p);
            return (
              <motion.button
                key={p.id}
                type="button"
                className={`preset${all ? " on" : ""}${premium ? "" : " locked"}`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => (premium ? selectMany(p.tweaks) : setUpsell("preset"))}
              >
                <span className="preset-index rg-metric">{String(i + 1).padStart(2, "0")}</span>
                <span className="preset-name">{p.name[lang]}</span>
                <span className="preset-desc">{p.desc[lang]}</span>
                <span className="preset-foot">
                  <span className="rg-metric">{t("dash.preset.count", { n })}</span>
                  <span className="preset-cta">
                    {!premium ? <Lock size={12} /> : all ? <Check size={13} /> : <Plus size={13} />}
                    {!premium ? t("free.lock") : all ? t("dash.preset.added") : t("dash.preset.add")}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
