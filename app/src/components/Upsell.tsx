import { ArrowRight, Check, Lock } from "lucide-react";
import { api } from "../lib/api";
import { totalTweaks, tweaks } from "../lib/catalog";
import { FREE, REVERTS, useStore } from "../lib/store";
import { LicenseGate, SITE_URL } from "./LicenseGate";
import { Pulse } from "./Logo";
import { Modal } from "./Modal";
import { Button } from "./ui";

/** Plan gratuit : fenêtre « Passer Premium », et connexion à la demande. */
export function Upsell() {
  const { t, lang, upsell, upsellTweak, setUpsell } = useStore();
  const close = () => setUpsell(null);
  const vars = { n: FREE.size, total: totalTweaks };
  const tw = upsell === "tweak" && upsellTweak ? tweaks.get(upsellTweak) : undefined;
  const title = tw ? t("upsell.tweakNamed", { name: tw.name[lang] }) : upsell === "plan" ? t("upsell.plan") : t("upsell.title", vars);
  const kicker = upsell === "preset" ? t("upsell.preset") : upsell === "plan" ? t("free.plan") : t("upsell.tweak");
  return (
    <>
      <Modal open={upsell === "tweak" || upsell === "preset" || upsell === "plan"} onClose={close} className="upsell">
        <div className="upsell-head">
          <Pulse size={40} active />
          <span className="upsell-kicker rg-overline">
            <Lock size={11} /> {kicker}
          </span>
        </div>
        <h2>{title}</h2>
        <p className="muted">
          {t("upsell.lead", vars)}
          {tw && REVERTS.has(tw.id) && ` ${t("upsell.revertFree")}`}
        </p>
        <ul className="upsell-list">
          {(["upsell.b1", "upsell.b2", "upsell.b3", "upsell.b4"] as const).map((k) => (
            <li key={k}>
              <Check size={14} />
              {t(k)}
            </li>
          ))}
        </ul>
        <Button variant="primary" size="lg" className="upsell-cta" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
          {t("upsell.cta")} <ArrowRight size={16} />
        </Button>
        <button type="button" className="link upsell-have" onClick={() => setUpsell("signin")}>
          {t("upsell.have")}
        </button>
      </Modal>
      <Modal open={upsell === "signin"} onClose={close} className="modal-gate">
        <LicenseGate embedded onDone={close} />
      </Modal>
    </>
  );
}
