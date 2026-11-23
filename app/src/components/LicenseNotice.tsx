import { useState } from "react";
import { api } from "../lib/api";
import { type Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { SITE_URL, SUPPORT_URL } from "./LicenseGate";
import { I } from "../s5/I";

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

  // bandeau de la maquette (frame.css, .lnt) : sous la barre du haut, au-dessus de la page
  return (
    <div className="lnt" role="status">
      <I n="alert" />
      <span className="tx">{text}</span>
      {expired ? (
        <button type="button" className="btn" disabled={busy} onClick={() => void retry()}>
          <I n="refresh" />
          {t("notice.retry")}
        </button>
      ) : n.buyUrl ? (
        <button type="button" className="btn red" onClick={() => void api.openUrl(n.buyUrl!)}>
          {t("notice.renew")}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      ) : n.code === "invalid_token" || n.code === "bound_to_other_device" ? (
        <button type="button" className="btn red" onClick={() => setUpsell("signin")}>
          {t("free.signIn")}
        </button>
      ) : (
        <button type="button" className="btn red" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
          {t("free.upgrade")}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      )}
      {/* remboursement, révocation, autre PC : le message renvoie vers le support, le bouton aussi */}
      {SUPPORT_URL && ((n.code === "revoked" && !n.buyUrl) || n.code === "bound_to_other_device" || n.code === "invalid_request") && (
        <button type="button" className="btn" onClick={() => void api.openUrl(SUPPORT_URL)}>
          {t("account.help")}
        </button>
      )}
      <button type="button" className="x" aria-label={t("notice.dismiss")} onClick={() => setLicenseNotice(null)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
