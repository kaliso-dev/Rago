import { motion } from "motion/react";
import { Check, Copy, Cpu, Gpu, HardDrive, MemoryStick, Network, Plus, RefreshCw, Lock, RotateCcw, Trash2, TriangleAlert, Zap } from "lucide-react";
import { availability, catalog, distinctKey, retired, totalTweaks, tweaks } from "../lib/catalog";
import { api } from "../lib/api";
import { formatDate } from "../lib/i18n";
import { encodePreset, MAX_NAME } from "../lib/share";
import { FREE, useStore, type MyPreset } from "../lib/store";
import { LiveStatsCard } from "../components/LiveStatsCard";
import { Button, Card } from "../components/ui";
import { useState, type ReactNode } from "react";

/** Interrupteurs du catalogue (les actions ponctuelles ne restent jamais « appliquées »), jumeaux comptés une fois. */
const totalSwitches = new Set([...tweaks.values()].filter((tw) => tw.kind === "tweak").map((tw) => distinctKey(tw.id))).size;
/** Plus aucun réglage ne se sert de WMIC (retiré de Windows 11 24H2) : sans lui, la ligne n'a rien à signaler. */
const wmicUsed = [...tweaks.values()].some((tw) => tw.requires.includes("wmic"));

/** « Optimisations gratuites » : les interrupteurs du plan gratuit, chacun avec sa variante par défaut (mode jeu
 * Windows « Activé »). Les outils ponctuels du plan gratuit (point de restauration, réinitialisations) n'en font pas
 * partie. */
const FREE_ENTRIES = [...FREE].flatMap((id) => {
  const tw = tweaks.get(id);
  if (!tw || tw.kind !== "tweak") return [];
  return [tw.variants?.length ? `${id}:${tw.defaultVariant ?? tw.variants[0].id}` : id];
});

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
  const { t, lang, sys, sysLoading, refreshSys, isOn, selected, variantOf, selectMany, lastRestore, requestApply, premium, setUpsell, applied: appliedMap, retiredApplied, requestUndo, requestUndoAll, run, myPresets, currentSetup, savePreset, toApply, requestApplyEntries } = useStore();
  // optimisations gratuites encore à appliquer sur ce PC
  const freeLeft = sys ? toApply(FREE_ENTRIES).ids.length : 0;
  const [naming, setNaming] = useState<string | null>(null);
  // réglages appliqués en ce moment (ceux qu'on a décochés depuis ne comptent plus), jumeaux comptés une fois
  const applied = new Set([...appliedMap.values()].filter((a) => a.ok && tweaks.get(a.id)?.kind === "tweak").map((a) => distinctKey(a.id))).size;

  /** Réglages d'un preset utilisables sur ce PC (comme selectMany : pas les pilotes d'une autre marque de carte graphique
   * ou de processeur), et preset complet : chacun allumé, avec la variante du preset. */
  const presetState = (entries: string[]) => {
    const usable = entries.flatMap((e) => {
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
        ...(wmicUsed ? [{ label: t("dash.health.wmic"), ok: sys.hasWmic, value: sys.hasWmic ? t("dash.yes") : t("dash.no") }] : []),
        {
          label: t("dash.health.npi"),
          ok: sys.resources.includes("nvidiaProfileInspector.exe"),
          value: sys.resources.includes("nvidiaProfileInspector.exe") ? t("dash.yes") : t("dash.no"),
        },
        // dernier point réussi : une tentative ratée depuis ne le fait pas oublier
        {
          label: t("dash.health.restore"),
          ok: lastRestore != null,
          value: lastRestore != null ? new Date(lastRestore).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" }) : t("dash.health.restoreNone"),
          action: lastRestore == null ? (
            <Button size="sm" onClick={() => requestApply(["rst_point"])}>
              {t("dash.createRestore")}
            </Button>
          ) : undefined,
        },
        {
          label: t("dash.health.applied"),
          ok: applied > 0,
          value: `${applied} / ${totalSwitches}`,
          // tout ce que Rago Optimizer a appliqué sur ce PC, remis comme avant après confirmation (RAG-43)
          action:
            appliedMap.size > 0 ? (
              <Button size="sm" icon={<RotateCcw size={12} />} disabled={!!run} onClick={() => void requestUndoAll()}>
                {t("dash.undoAll")}
              </Button>
            ) : undefined,
        },
      ]
    : [];

  return (
    <motion.div className="page dashboard" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("dash.overline")}</div>
        <h1 className="display">{t("dash.title")}</h1>
        <p className="lead">{t("dash.lead", { n: totalTweaks })}</p>
      </motion.header>

      <motion.section variants={rise} className={`card free-boost${sys && freeLeft === 0 ? " done" : ""}`}>
        <span className="free-boost-icon" aria-hidden="true">
          {sys && freeLeft === 0 ? <Check size={18} strokeWidth={2.25} /> : <Zap size={18} strokeWidth={2} />}
        </span>
        <div className="free-boost-text">
          <h2 className="free-boost-title">{t("dash.free.title")}</h2>
          <p className="muted small">{t("dash.free.lead", { n: FREE_ENTRIES.length })}</p>
        </div>
        <Button
          variant={sys && freeLeft === 0 ? "secondary" : "primary"}
          icon={sys && freeLeft === 0 ? <Check size={14} /> : <Zap size={14} />}
          disabled={!sys || freeLeft === 0 || !!run}
          onClick={() => requestApplyEntries(FREE_ENTRIES, { title: t("dash.free.confirmTitle"), lead: t("dash.free.confirmLead") })}
        >
          {sys && freeLeft === 0 ? t("dash.free.done") : t("dash.free.go")}
        </Button>
      </motion.section>

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
            const { n, on: all } = presetState(p.tweaks);
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

      {/* presets enregistrés par le joueur, ouverts en gratuit (seuls les réglages de son plan sont ajoutés) */}
      <motion.section variants={rise} className="mine">
        <h2 className="section-title rg-overline">{t("dash.mine")}</h2>
        <div className="presets">
          {myPresets.map((p) => (
            <MyPresetCard key={p.id} preset={p} state={presetState(p.t)} />
          ))}
          {naming == null ? (
            <motion.button
              type="button"
              className="preset mine-new"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              disabled={!currentSetup.length}
              onClick={() => setNaming("")}
            >
              <span className="mine-plus">
                <Plus size={16} />
              </span>
              <span className="preset-name">{t("dash.mine.save")}</span>
              <span className="preset-desc">{currentSetup.length ? t("dash.mine.saveHint") : t("dash.mine.empty")}</span>
              <span className="preset-foot">
                <span className="rg-metric">{t("dash.preset.count", { n: currentSetup.length })}</span>
              </span>
            </motion.button>
          ) : (
            <form
              className="preset mine-new naming"
              onSubmit={(e) => {
                e.preventDefault();
                if (!naming.trim() || !currentSetup.length) return;
                savePreset(naming, currentSetup);
                setNaming(null);
              }}
            >
              <label htmlFor="mine-name" className="preset-index rg-metric">
                {t("dash.mine.name")}
              </label>
              <input
                id="mine-name"
                className="input"
                autoFocus
                maxLength={MAX_NAME}
                value={naming}
                placeholder={t("dash.mine.namePh")}
                onChange={(e) => setNaming(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setNaming(null)}
              />
              <span className="preset-desc">{t("dash.mine.saveHint")}</span>
              <span className="preset-foot">
                <button type="button" className="link" onClick={() => setNaming(null)}>
                  {t("dash.mine.cancel")}
                </button>
                <Button size="sm" variant="primary" type="submit" disabled={!naming.trim()}>
                  {t("dash.mine.ok")}
                </Button>
              </span>
            </form>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

function MyPresetCard({ preset, state }: { preset: MyPreset; state: { n: number; on: boolean } }) {
  const { t, lang, selectMany, deletePreset } = useStore();
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const copy = async () => {
    try {
      await api.copyText(await encodePreset({ n: preset.name, t: preset.t }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* presse-papiers indisponible : la page Partage et support reste là */
    }
  };
  return (
    <motion.div className={`preset mine-card${state.on ? " on" : ""}`} whileHover={{ y: -2 }}>
      <button type="button" className="preset-hit" aria-label={preset.name} onClick={() => selectMany(preset.t)} />
      <span className="preset-index rg-metric">{formatDate(lang, preset.at)}</span>
      <span className="preset-name">{preset.name}</span>
      <span className="preset-desc mine-tools">
        <button type="button" className="icon-btn" title={copied ? t("dash.mine.copied") : t("dash.mine.copy")} aria-label={t("dash.mine.copy")} onClick={() => void copy()}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button
          type="button"
          className={`icon-btn${asking ? " danger" : ""}`}
          title={asking ? t("dash.mine.deleteAsk", { name: preset.name }) : t("dash.mine.delete")}
          aria-label={t("dash.mine.delete")}
          onBlur={() => setAsking(false)}
          onClick={() => (asking ? deletePreset(preset.id) : setAsking(true))}
        >
          <Trash2 size={13} />
        </button>
        {asking && <span className="mine-ask small">{t("dash.mine.deleteAsk", { name: preset.name })}</span>}
        {copied && !asking && <span className="mine-ask ok small">{t("dash.mine.copied")}</span>}
      </span>
      <span className="preset-foot">
        <span className="rg-metric">{t("dash.preset.count", { n: state.n })}</span>
        <span className="preset-cta">
          {state.on ? <Check size={13} /> : <Plus size={13} />}
          {state.on ? t("dash.preset.added") : t("dash.preset.add")}
        </span>
      </span>
    </motion.div>
  );
}
