import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { api } from "../lib/api";
import { accountApi, formatPrice, type Plans } from "../lib/accountApi";
import { findings, saved } from "../lib/analysis";
import { totalTweaks, tweaks } from "../lib/catalog";
import { FREE, FREE_REVERTS, FREE_SLOTS, useStore } from "../lib/store";
import type { Key } from "../lib/i18n";
import { ACCOUNT_URL, LicenseGate, SITE_URL } from "./LicenseGate";
import { Pulse } from "./Logo";
import { Modal } from "./Modal";
import { Button } from "./ui";

type Plan = "year" | "month" | "lifetime";

/** Plan gratuit : fenêtre « Passer Premium » avec les prix (1.3.0), et connexion à la demande. */
export function Upsell() {
  const { t, lang, upsell, upsellTweak, setUpsell } = useStore();
  const close = () => setUpsell(null);
  const open = upsell === "tweak" || upsell === "preset" || upsell === "plan" || upsell === "slots" || upsell === "analysis";
  const vars = { n: FREE.size, total: totalTweaks };
  const tw = upsell === "tweak" && upsellTweak ? tweaks.get(upsellTweak) : undefined;
  const slots = upsell === "slots";

  // prix lus sur le serveur à chaque ouverture : toujours ceux de Stripe
  const [plans, setPlans] = useState<Plans | null>(null);
  const [plan, setPlan] = useState<Plan>("year");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setPlan("year");
    let live = true;
    accountApi.plans().then(
      (p) => live && setPlans(p),
      () => live && setPlans(null),
    );
    return () => {
      live = false;
    };
  }, [open]);

  // après une analyse : ce que Premium règle parmi ce qu'elle a trouvé, mesuré sur ce PC
  const found = useMemo(() => {
    if (upsell !== "analysis") return null;
    const s = saved();
    const v = s.after ?? s.before;
    if (!v) return null;
    const issues = findings(v).filter((f) => f.issue);
    return { all: issues.length, premium: issues.filter((f) => f.fix.kind === "premium"), free: issues.filter((f) => f.fix.kind === "free").length, diy: issues.filter((f) => f.fix.kind === "diy").length };
  }, [upsell]);

  const title = found
    ? t("upsell.analysis", { p: found.premium.length, n: found.all })
    : slots
      ? t("upsell.slots", { n: FREE_SLOTS })
      : tw
        ? t("upsell.tweakNamed", { name: tw.name[lang] })
        : upsell === "plan"
          ? t("upsell.plan")
          : t("upsell.title", vars);
  const kicker = upsell === "preset" ? t("upsell.preset") : upsell === "plan" || slots || found ? t("free.plan") : t("upsell.tweak");

  const price = plans ? (plan === "lifetime" ? plans.lifetime : plans[plan]) : null;
  const trial = plans && plan !== "lifetime" && plans.trialDays > 0 ? plans.trialDays : 0;
  const options: { id: Plan; label: Key; sub: string }[] = plans
    ? ([
        plans.year && { id: "year" as Plan, label: "upsell.yearly" as Key, sub: t("upsell.yearlySub", { month: formatPrice({ ...plans.year, amount: Math.round(plans.year.amount / 12) }, lang), year: formatPrice(plans.year, lang) }) },
        plans.month && { id: "month" as Plan, label: "upsell.monthly" as Key, sub: t("upsell.monthlySub", { price: formatPrice(plans.month, lang) }) },
        plans.lifetime && { id: "lifetime" as Plan, label: "upsell.lifetime" as Key, sub: t("upsell.lifetimeSub") },
      ].filter(Boolean) as { id: Plan; label: Key; sub: string }[])
    : [];
  const checkout = (withTrial: boolean) => {
    const url = plan === "lifetime" ? `${ACCOUNT_URL}/buy/lifetime` : `${ACCOUNT_URL}/buy?interval=${plan}${withTrial ? "&trial=1" : ""}`;
    void api.openUrl(url);
    setSent(true);
  };

  return (
    <>
      <Modal open={open} onClose={close} className="upsell">
        <div className="upsell-head">
          <Pulse size={40} active />
          <span className="upsell-kicker rg-overline">
            <Lock size={11} /> {kicker}
          </span>
        </div>
        <h2>{title}</h2>
        {sent ? (
          <>
            <p className="muted">{t("upsell.sentLead")}</p>
            <Button variant="primary" size="lg" className="upsell-cta" onClick={() => setUpsell("signin")}>
              {t("upsell.sentSignIn")} <ArrowRight size={16} />
            </Button>
            <button type="button" className="link upsell-have" onClick={() => setSent(false)}>
              {t("upsell.sentBack")}
            </button>
          </>
        ) : (
          <>
            {found ? (
              <>
                <ul className="upsell-found">
                  {found.premium.map((f) => (
                    <li key={f.id}>
                      <span>{t(`pa.${f.id}` as Key)}</span>
                      <span className="rg-metric">{f.value.startsWith("pa.") ? t(f.value as Key) : f.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="muted small">{t("upsell.analysisRest", { free: found.free, diy: found.diy })}</p>
              </>
            ) : (
              <>
                <p className="muted">
                  {slots ? t("upsell.slotsLead", { n: FREE_SLOTS }) : t("upsell.lead", vars)}
                  {tw && FREE_REVERTS.has(tw.id) && ` ${t("upsell.revertFree")}`}
                </p>
                <ul className="upsell-list">
                  {(["upsell.b1", "upsell.b2", "upsell.b3", "upsell.b4"] as const).map((k) => (
                    <li key={k}>
                      <Check size={14} />
                      {t(k)}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {options.length > 0 ? (
              <>
                <div className="rg-overline upsell-choose">{t("upsell.choose")}</div>
                <div className="upsell-plans" role="radiogroup">
                  {options.map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={plan === o.id} className={`upsell-plan${plan === o.id ? " on" : ""}`} onClick={() => setPlan(o.id)}>
                      <span className="upsell-plan-name">{t(o.label)}</span>
                      <span className="rg-metric">{o.id === "lifetime" && plans?.lifetime ? formatPrice(plans.lifetime, lang) : o.id === "year" && plans?.year ? formatPrice(plans.year, lang) : plans?.month ? formatPrice(plans.month, lang) : ""}</span>
                      <span className="muted small">{o.sub}</span>
                    </button>
                  ))}
                </div>
                <ul className="upsell-promises muted small">
                  <li>
                    <Check size={12} /> {t("upsell.undoFree")}
                  </li>
                  {plan !== "lifetime" && (
                    <li>
                      <Check size={12} /> {t("upsell.cancelAnytime")}
                    </li>
                  )}
                </ul>
                {trial > 0 && price ? (
                  <>
                    <Button variant="primary" size="lg" className="upsell-cta" onClick={() => checkout(true)}>
                      {t("upsell.trial", { n: trial })} <ArrowRight size={16} />
                    </Button>
                    <p className="muted small upsell-trial-note">{t("upsell.trialNote", { n: trial, price: formatPrice(price, lang), per: t(plan === "year" ? "upsell.perYear" : "upsell.perMonth") })}</p>
                    <button type="button" className="link upsell-have" onClick={() => checkout(false)}>
                      {t("upsell.payNow")}
                    </button>
                  </>
                ) : (
                  <Button variant="primary" size="lg" className="upsell-cta" onClick={() => checkout(false)}>
                    {plan === "lifetime" ? t("upsell.getLifetime") : t("upsell.cta")} <ArrowRight size={16} />
                  </Button>
                )}
              </>
            ) : (
              <Button variant="primary" size="lg" className="upsell-cta" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
                {t("upsell.cta")} <ArrowRight size={16} />
              </Button>
            )}
            <button type="button" className="link upsell-have" onClick={() => setUpsell("signin")}>
              {t("upsell.have")}
            </button>
          </>
        )}
      </Modal>
      <Modal open={upsell === "signin"} onClose={close} className="modal-gate">
        <LicenseGate embedded onDone={close} />
      </Modal>
    </>
  );
}
