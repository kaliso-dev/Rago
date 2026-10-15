import { ArrowRight, LifeBuoy, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { type Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { SITE_URL, SUPPORT_URL } from "./LicenseGate";
import { Button } from "./ui";

/**
 * Licence perdue au rafraîchissement (abonnement terminé, remboursement, autre PC) ou plus vérifiable
 * hors ligne : le joueur l'apprend ici au lieu de retomber sans un mot sur le plan gratuit.
 */
export function LicenseNotice() {
  const { t, lang, licenseNotice, setLicenseNotice, refreshLicense, setUpsell } = useStore();
  const [busy, setBusy] = useState(false);
  if (!licenseNotice) return null;
  const n = licenseNotice;
  const expired = n.code === "expired";
  const key = (n.code === "revoked" && n.buyUrl ? "notice.subscription_ended" : `notice.${n.code}`) as Key;
  const fallback = t(key) === key ? t("notice.revoked") : t(key);
  // en anglais, le message du serveur (voix de la marque) s'affiche tel quel
  const text = lang === "en" && n.message ? n.message : fallback;

  const retry = async () => {
    setBusy(true);
    try {
      // même chemin qu'au démarrage : une licence révoquée entre-temps change la licence et ce bandeau ; toujours hors
      // ligne, le bandeau reste
      await refreshLicense(await api.licenseStatus());
    } catch {
      /* moteur injoignable : le bandeau reste */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`license-notice${expired ? " warn" : ""}`} role="status">
      <TriangleAlert size={15} />
      <span className="license-notice-text">{text}</span>
      {expired ? (
        <Button size="sm" icon={<RefreshCw size={12} />} disabled={busy} onClick={() => void retry()}>
          {t("notice.retry")}
        </Button>
      ) : n.buyUrl ? (
        <Button size="sm" variant="primary" onClick={() => void api.openUrl(n.buyUrl!)}>
          {t("notice.renew")} <ArrowRight size={12} />
        </Button>
      ) : n.code === "invalid_token" || n.code === "bound_to_other_device" ? (
        <Button size="sm" variant="primary" onClick={() => setUpsell("signin")}>
          {t("free.signIn")}
        </Button>
      ) : (
        <Button size="sm" variant="primary" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
          {t("free.upgrade")}
        </Button>
      )}
      {/* remboursement, révocation, autre PC : le message renvoie vers le support, le bouton aussi */}
      {SUPPORT_URL && ((n.code === "revoked" && !n.buyUrl) || n.code === "bound_to_other_device" || n.code === "invalid_request") && (
        <Button size="sm" icon={<LifeBuoy size={12} />} onClick={() => void api.openUrl(SUPPORT_URL)}>
          {t("account.help")}
        </Button>
      )}
      <button type="button" className="icon-btn" aria-label={t("notice.dismiss")} onClick={() => setLicenseNotice(null)}>
        <X size={14} />
      </button>
    </div>
  );
}
