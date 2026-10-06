import { ArrowRight, Check, Lock } from "lucide-react";
import { api } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { FREE, useStore } from "../lib/store";
import { LicenseGate, SITE_URL } from "./LicenseGate";
import { Pulse } from "./Logo";
import { Modal } from "./Modal";
import { Button } from "./ui";

/** Plan gratuit : fenêtre « Passer Premium », et connexion à la demande. */
export function Upsell() {
  const { t, upsell, setUpsell } = useStore();
  const close = () => setUpsell(null);
  const vars = { n: FREE.size, total: totalTweaks };
  return (
    <>
      <Modal open={upsell === "tweak" || upsell === "preset"} onClose={close} className="upsell">
        <div className="upsell-head">
          <Pulse size={40} active />
          <span className="upsell-kicker rg-overline">
            <Lock size={11} /> {t(upsell === "preset" ? "upsell.preset" : "upsell.tweak")}
          </span>
        </div>
        <h2>{t("upsell.title", vars)}</h2>
        <p className="muted">{t("upsell.lead", vars)}</p>
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
