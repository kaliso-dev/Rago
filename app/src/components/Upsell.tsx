import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { accountApi, formatPrice, type Plans } from "../lib/accountApi";
import { findings, saved } from "../lib/analysis";
import { catalog, totalTweaks, tweaks } from "../lib/catalog";
import { FREE, FREE_REVERTS, FREE_SLOTS, useStore } from "../lib/store";
import type { Key } from "../lib/i18n";
import { ACCOUNT_URL, LicenseGate, SITE_URL } from "./LicenseGate";
import { Modal } from "./Modal";
import { I } from "../s5/I";
import appIcon from "../assets/s5/img/rago-app-dark-64.svg";

type Plan = "year" | "month" | "lifetime";

/** Plan gratuit : fenêtre « Passer Premium » avec les prix (1.3.0), et connexion à la demande.
 * Écran v5 : maquettes app-upsell-plan, -tweak, -preset, -slots, -analysis et -sent (win.css, `.mdl.ups`) : panneau rouge
 * à gauche (ce que Premium ouvre selon d'où vient la fenêtre), à droite l'offre, les plans, l'essai et les liens. */
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
  // Essai : toujours sur le mensuel (Sofiene, 10/11 : après l'essai, mensuel seulement), quel que soit le plan choisi
  const trial = plans && plan !== "lifetime" && plans.month && plans.trialDays > 0 ? plans.trialDays : 0;
  const options: { id: Plan; label: Key; sub: string }[] = plans
    ? ([
        plans.year && { id: "year" as Plan, label: "upsell.yearly" as Key, sub: t("upsell.yearlySub", { month: formatPrice({ ...plans.year, amount: Math.round(plans.year.amount / 12) }, lang), year: formatPrice(plans.year, lang) }) },
        plans.month && { id: "month" as Plan, label: "upsell.monthly" as Key, sub: t("upsell.monthlySub", { price: formatPrice(plans.month, lang) }) },
        plans.lifetime && { id: "lifetime" as Plan, label: "upsell.lifetime" as Key, sub: t("upsell.lifetimeSub") },
      ].filter(Boolean) as { id: Plan; label: Key; sub: string }[])
    : [];
  const checkout = (withTrial: boolean) => {
    const url = plan === "lifetime" ? `${ACCOUNT_URL}/buy/lifetime` : withTrial ? `${ACCOUNT_URL}/buy?interval=month&trial=1` : `${ACCOUNT_URL}/buy?interval=${plan}`;
    void api.openUrl(url);
    setSent(true);
  };

  // panneau rouge de gauche : ce qui est ouvert avec Premium, selon d'où vient la fenêtre (maquettes app-upsell-*)
  const side = found
    ? { big: found.premium.length, of: found.all, label: t("upsell.sideFound"), sub: t("upsell.sideFoundSub") }
    : slots
      ? { big: FREE_SLOTS, of: FREE_SLOTS, label: t("upsell.sideSlots"), sub: t("upsell.sideSlotsSub") }
      : upsell === "preset"
        ? { big: catalog.presets.length, of: 0, label: t("upsell.sidePresets"), sub: t("upsell.sidePresetsSub") }
        : { big: totalTweaks, of: 0, label: t("upsell.sideTweaks"), sub: t("upsell.sideFree", { n: FREE.size }) };
  // valeur d'un point trouvé, écrite comme sur la page Analyse : « 141 fps », « 38 j » en français, textes traduits
  const shown = (v: string) => {
    if (v.startsWith("pa.")) return t(v as Key);
    const m = /^(-?[\d.]+)\s*(.*)$/.exec(v);
    return m ? `${m[1]} ${m[2] === "d" ? t("s5.pa.days") : m[2] === "FPS" ? "fps" : m[2]}`.trim() : v;
  };
  const site = SITE_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <>
      <Modal open={open} onClose={close} v5="ups">
        <div className="upl">
          <img src={appIcon} alt="" draggable={false} />
          <div className="usig">
            <b>
              {side.big}
              {side.of > 0 && <em>/{side.of}</em>}
            </b>
            <span>{side.label}</span>
            <small>{side.sub}</small>
          </div>
        </div>
        <div className="upr">
          <p className="ukk">
            <I n="lock" />
            {kicker}
          </p>
          <h2 className="h2 tape mt">{title}</h2>
          {sent ? (
            <>
              <p className="ml">{t("upsell.sentLead")}</p>
              <div className="brw">
                <I n="globe" />
                <span>{site}</span>
                <i className="lv" />
                <em>{t("upsell.waiting")}</em>
              </div>
              <button type="button" className="btn red lg cta" onClick={() => setUpsell("signin")}>
                {t("upsell.sentSignIn")}
                <I n="arrow" />
              </button>
              <div className="uln">
                <button type="button" className="lnk" onClick={() => setSent(false)}>
                  {t("upsell.sentBack")}
                </button>
              </div>
            </>
          ) : (
            <>
              {found ? (
                <>
                  <ul className="fnd">
                    {found.premium.map((f) => (
                      <li key={f.id}>
                        <b>{t(`pa.${f.id}` as Key)}</b>
                        <span>{shown(f.value)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="ml sm2">{t("upsell.analysisRest", { free: found.free, diy: found.diy })}</p>
                </>
              ) : (
                <>
                  <p className="ml">
                    {slots ? t("upsell.slotsLead", { n: FREE_SLOTS }) : t("upsell.lead", vars)}
                    {tw && FREE_REVERTS.has(tw.id) && ` ${t("upsell.revertFree")}`}
                  </p>
                  {slots ? (
                    <div className="slt">
                      {Array.from({ length: FREE_SLOTS }, (_, i) => (
                        <i key={i} />
                      ))}
                    </div>
                  ) : (
                    <ul className="bn">
                      {(["upsell.b1", "upsell.b2", "upsell.b3", "upsell.b4"] as const).map((k) => (
                        <li key={k}>
                          <I n="check" />
                          {t(k)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {options.length > 0 ? (
                <>
                  <p className="grp">{t("upsell.choose")}</p>
                  <div className={`pls${options.length > 2 ? " three" : ""}`} role="radiogroup" aria-label={t("upsell.choose")}>
                    {options.map((o) => (
                      <button key={o.id} type="button" role="radio" aria-checked={plan === o.id} className={`pl3${plan === o.id ? " on" : ""}`} onClick={() => setPlan(o.id)}>
                        <i className="rd" />
                        <b>{t(o.label)}</b>
                        <span className="pr">{o.id === "lifetime" && plans?.lifetime ? formatPrice(plans.lifetime, lang) : o.id === "year" && plans?.year ? formatPrice(plans.year, lang) : plans?.month ? formatPrice(plans.month, lang) : ""}</span>
                        <small>{o.sub}</small>
                      </button>
                    ))}
                  </div>
                  <p className="prm">
                    <span>
                      <I n="check" />
                      {t("upsell.undoFree")}
                    </span>
                    {plan !== "lifetime" && (
                      <span>
                        <I n="check" />
                        {t("upsell.cancelAnytime")}
                      </span>
                    )}
                  </p>
                  {trial > 0 && price ? (
                    <>
                      <button type="button" className="btn red lg cta" onClick={() => checkout(true)}>
                        {t("upsell.trial", { n: trial })}
                        <I n="arrow" />
                      </button>
                      <p className="tn">{t("upsell.trialNote", { n: trial, price: formatPrice(plans!.month!, lang), per: t("upsell.perMonth") })}</p>
                    </>
                  ) : (
                    <button type="button" className="btn red lg cta" onClick={() => checkout(false)}>
                      {plan === "lifetime" ? t("upsell.getLifetime") : t("upsell.cta")}
                      <I n="arrow" />
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="btn red lg cta" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
                  {t("upsell.cta")}
                  <I n="arrow" />
                </button>
              )}
              <div className="uln">
                {options.length > 0 && trial > 0 && price && (
                  <button type="button" className="lnk" onClick={() => checkout(false)}>
                    {t("upsell.payNow")}
                  </button>
                )}
                <button type="button" className="lnk" onClick={() => setUpsell("signin")}>
                  {t("upsell.have")}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <Modal open={upsell === "signin"} onClose={close} v5="gate2">
        <LicenseGate onDone={close} />
      </Modal>
    </>
  );
}
