// Abonnement dans les Paramètres (1.3.0) : l'offre, le prochain paiement ou la date de fin, et la résiliation en un
// écran (« Before you cancel ») : date de fin, ce qui reviendra comme avant ce jour-là, le gain mesuré sur ce PC,
// puis deux boutons de même taille. Pas de remise, pas de second écran, pas de frais.
// Écran v5 (maquettes app-settings*.html) : une ligne .sr du bloc « account » ; résilié, la ligne .sr.cxl et le
// bouton rouge « resume subscription ». L'en-tête de la page lit le même abonnement (useSubscription).
// La fenêtre de résiliation reprend les maquettes app-cancel-before et app-cancel-done (win.css, `.mdl.sm.cxm`) :
// une ligne `.cf` par fait avec son icône, les dates et les nombres en gras (`**…**` lus par Rich).
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { accountApi, asAccountError, formatPrice, type Subscription } from "../lib/accountApi";
import { useStore } from "../lib/store";
import { lastGain } from "../lib/analysis";
import { Modal } from "./Modal";
import { I, Rich } from "../s5/I";
import type { Key } from "../lib/i18n";

export const longDate = (lang: string, iso: string) =>
  new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });

/** Abonnement du compte (null : pas d'abonnement, licence à vie, ou pas encore lu). */
export function useSubscription(): [Subscription | null, (s: Subscription) => void] {
  const [sub, setSub] = useState<Subscription | null>(null);
  useEffect(() => {
    let live = true;
    accountApi.subscription().then(
      (s) => live && setSub(s),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  return [sub, setSub];
}

export function SubscriptionRow({ sub, onChange }: { sub: Subscription; onChange: (s: Subscription) => void }) {
  const { t, lang } = useStore();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [undo, setUndo] = useState(0);

  const date = sub.renewsAt ?? sub.endsAt;
  const plan = sub.trial ? t("sub.trial") : sub.interval === "year" ? t("sub.yearly") : t("sub.monthly");
  const line = sub.canceled
    ? t("sub.ends", { date: date ? longDate(lang, date) : "" })
    : t("sub.next", { price: sub.price ? formatPrice(sub.price, lang) : "", date: date ? longDate(lang, date) : "" });
  const gain = lastGain((id) => t(`pa.${id}` as Key).toLowerCase());

  const open = () => {
    setErr(null);
    setDone(false);
    setUndo(0);
    setAsk(true);
    void api.signOutPlan().then(
      (ids) => setUndo(ids.length),
      () => {},
    );
  };
  const act = async (cancel: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const s = cancel ? await accountApi.cancelSubscription() : await accountApi.resumeSubscription();
      if (s) onChange(s);
      if (cancel) setDone(true);
      void api.licenseRefresh().catch(() => {});
    } catch (e) {
      setErr(asAccountError(e).message ?? t("sub.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`sr${sub.canceled ? " cxl" : ""}`}>
        <div className="l">
          <b>{plan}</b>
          <span>{line}</span>
          {err && !ask && <span className="bad">{err}</span>}
        </div>
        {sub.canceled ? (
          <button type="button" className="btn sm red" disabled={busy} onClick={() => void act(false)}>
            {t("sub.resume")}
          </button>
        ) : (
          <button type="button" className="lnk" onClick={open}>
            {sub.trial ? t("sub.cancelTrial") : t("sub.cancel")}
          </button>
        )}
      </div>
      <Modal open={ask} onClose={() => !busy && setAsk(false)} v5="sm cxm">
        {done ? (
          <>
            <h2 className="h2 tape mt">{sub.trial ? t("sub.doneTrialTitle") : t("sub.doneTitle")}</h2>
            <p className="ml">{t("sub.doneLead", { date: sub.endsAt ? longDate(lang, sub.endsAt) : "" })}</p>
            <div className="mf">
              <button type="button" className="btn red" autoFocus onClick={() => setAsk(false)}>
                {t("sub.close")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="h2 tape mt">{t("sub.beforeTitle")}</h2>
            <ul className="cf">
              <li>
                <I n="clock" />
                <span>
                  <Rich text={t(sub.trial ? "sub.factTrial" : "sub.factEnd", { date: date ? `**${longDate(lang, date)}**` : "" })} />
                </span>
              </li>
              {undo > 0 && (
                <li>
                  <I n="undo" />
                  <span>
                    <Rich text={t("sub.factUndo", { n: undo })} />
                  </span>
                </li>
              )}
              {gain && (
                <li>
                  <I n="activity" />
                  <span>
                    <Rich text={t("sub.factGain", { what: `**${gain}**` })} />
                  </span>
                </li>
              )}
              <li>
                <I n="shield" />
                <span>{t("sub.factUndoFree")}</span>
              </li>
            </ul>
            {err && (
              <p className="err2">
                <I n="alert" />
                <span>{err}</span>
              </p>
            )}
            <div className="mf even">
              <button type="button" className="btn" autoFocus disabled={busy} onClick={() => setAsk(false)}>
                {t("sub.keep")}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void act(true)}>
                {sub.trial ? t("sub.cancelTrial") : t("sub.cancel")}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
