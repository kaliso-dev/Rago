// « Analyze my PC » (1.3.0) : ce qui ralentit le PC en jeu, mesuré, avec pour chaque point ce qui le règle ; puis
// l'avant/après quand des tweaks ont été appliqués depuis. Logique : lib/analysis.ts.
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, LoaderCircle, RefreshCw, ScanSearch, Sparkles, Wrench } from "lucide-react";
import { useStore, FREE } from "../lib/store";
import { analyze, deltas, findings, record, resetBaseline, saved, STEPS, type Finding, type Group, type Step, type Values } from "../lib/analysis";
import { Badge, Button, Card } from "../components/ui";
import type { Key } from "../lib/i18n";

const GROUPS: Group[] = ["network", "fps", "system", "windows"];

/** Valeur affichée : un texte à traduire (an.v.*) ou un nombre déjà mis en forme. */
function useShow() {
  const { t } = useStore();
  return (v: string) => (v.startsWith("pa.") ? t(v as Key) : v);
}

export function Analysis() {
  const { t, premium, applied, requestApplyEntries, setUpsell, goTo } = useStore();
  const show = useShow();
  const [step, setStep] = useState<Step | null>(null);
  const [store, setStore] = useState(saved);
  const current: Values | null = store.after ?? store.before;
  const list = useMemo(() => (current ? findings(current) : []), [current]);
  const issues = list.filter((f) => f.issue);
  const byFix = (k: "free" | "premium" | "diy") => issues.filter((f) => f.fix.kind === k);
  // tweaks gratuits qui règlent un point trouvé et qui ne sont pas encore appliqués
  const freeTweaks = [...new Set(byFix("free").flatMap((f) => (f.fix.kind === "free" ? f.fix.tweaks : [])))].filter((id) => FREE.has(id) && !applied.has(id));
  const compare = store.before && store.after ? deltas(store.before, store.after) : [];

  const run = async () => {
    setStep("hardware");
    try {
      const v = await analyze(setStep);
      record(v);
      setStore(saved());
    } finally {
      setStep(null);
    }
  };
  // ouverte après une application : la nouvelle mesure part toute seule
  useEffect(() => {
    if (store.changed && !step) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badge = (f: Finding) =>
    !f.issue ? (
      <Badge tone="ok">{t("pa.fine")}</Badge>
    ) : f.fix.kind === "free" ? (
      <Badge tone="info">{t("pa.free")}</Badge>
    ) : f.fix.kind === "premium" ? (
      <Badge tone="red">{t("pa.premium")}</Badge>
    ) : f.fix.kind === "diy" ? (
      <Badge tone="warn">{t("pa.diy")}</Badge>
    ) : null;

  return (
    <motion.div className="page analysis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <header className="page-head">
        <div className="rg-overline">{t("pa.overline")}</div>
        <h1>{t("pa.title")}</h1>
        <p className="lead">{t("pa.lead")}</p>
      </header>

      {step ? (
        <Card className="an-steps">
          <ol>
            {STEPS.map((s) => {
              const i = STEPS.indexOf(s);
              const at = STEPS.indexOf(step);
              return (
                <li key={s} className={i < at ? "done" : i === at ? "now" : ""}>
                  {i < at ? <Check size={14} /> : i === at ? <LoaderCircle size={14} className="spin" /> : <span className="dot" />}
                  {t(`pa.step.${s}` as Key)}
                </li>
              );
            })}
          </ol>
          <p className="muted small">{t("pa.wait")}</p>
        </Card>
      ) : !current ? (
        <Card className="an-start">
          <ScanSearch size={28} />
          <p>{t("pa.startLead")}</p>
          <Button variant="primary" size="lg" icon={<ScanSearch size={16} />} onClick={() => void run()}>
            {t("pa.start")}
          </Button>
        </Card>
      ) : (
        <>
          {store.changed && (
            <Card className="an-note">
              <p>{t("pa.changed")}</p>
              <Button variant="primary" size="sm" icon={<RefreshCw size={13} />} onClick={() => void run()}>
                {t("pa.measureAgain")}
              </Button>
            </Card>
          )}

          {compare.length > 0 && (
            <Card title={t("pa.beforeAfter")} className="an-compare">
              <table>
                <tbody>
                  {compare.map((d) => (
                    <tr key={d.id} className={d.better ? "better" : "worse"}>
                      <td>{t(`pa.${d.id}` as Key)}</td>
                      <td className="rg-metric muted">
                        {d.before} {d.unit}
                      </td>
                      <td>
                        <ArrowRight size={12} />
                      </td>
                      <td className="rg-metric">
                        {d.after} {d.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {store.after?.fps == null || store.after.fps === store.before?.fps ? <p className="muted small">{t("pa.fpsLater")}</p> : null}
            </Card>
          )}

          <Card className="an-summary">
            {issues.length === 0 ? (
              <p>{t("pa.allFine")}</p>
            ) : (
              <p>
                {t("pa.found", { n: issues.length })}{" "}
                <span className="muted">{t("pa.split", { free: byFix("free").length, premium: byFix("premium").length, diy: byFix("diy").length })}</span>
              </p>
            )}
            <div className="setting-actions">
              {freeTweaks.length > 0 && (
                <Button variant="primary" icon={<Wrench size={13} />} onClick={() => requestApplyEntries(freeTweaks)}>
                  {t("pa.applyFree", { n: freeTweaks.length })}
                </Button>
              )}
              {!premium && byFix("premium").length > 0 && (
                <Button icon={<Sparkles size={13} />} onClick={() => setUpsell("analysis")}>
                  {t("pa.seePremium")}
                </Button>
              )}
              {premium && byFix("premium").length > 0 && (
                <Button icon={<Sparkles size={13} />} onClick={() => goTo("latency")}>
                  {t("pa.openLatency")}
                </Button>
              )}
              <Button variant="ghost" icon={<RefreshCw size={13} />} onClick={() => void run()}>
                {t("pa.again")}
              </Button>
            </div>
          </Card>

          {GROUPS.map((g) => {
            const rows = list.filter((f) => f.group === g);
            if (!rows.length) return null;
            return (
              <Card key={g} title={t(`pa.group.${g}` as Key)} className="an-group">
                {rows.map((f) => (
                  <div key={f.id} className={`setting an-row${f.issue ? " issue" : ""}`}>
                    <div>
                      <div>{t(`pa.${f.id}` as Key)}</div>
                      <div className="muted small">
                        {t(f.norm as Key, { max: current.refreshMax ?? "", rated: current.memRated ?? "", half: current.fps != null ? Math.round(current.fps / 2) : "" })}
                        {f.issue && f.fix.kind === "diy" && <> · {t(f.fix.how as Key, { max: current.refreshMax ?? "" })}</>}
                      </div>
                    </div>
                    <span className="rg-metric">{show(f.value)}</span>
                    {badge(f)}
                  </div>
                ))}
              </Card>
            );
          })}
          <p className="muted small">
            {t("pa.measuredOn", { date: new Date(current.at).toLocaleString() })}{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                resetBaseline();
                setStore(saved());
              }}
            >
              {t("pa.reset")}
            </button>
          </p>
        </>
      )}
    </motion.div>
  );
}
