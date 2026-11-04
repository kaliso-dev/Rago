// Abonnement dans les Paramètres (1.3.0) : l'offre, le prochain paiement ou la date de fin, et la résiliation en un
// écran (« Before you cancel ») : date de fin, ce qui reviendra comme avant ce jour-là, le gain mesuré sur ce PC,
// puis deux boutons de même taille. Pas de remise, pas de second écran, pas de frais.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { accountApi, asAccountError, formatPrice, type Subscription } from "../lib/accountApi";
import { useStore } from "../lib/store";
import { lastGain } from "../lib/analysis";
import { Modal } from "./Modal";
import { Button } from "./ui";
import type { Key } from "../lib/i18n";

const longDate = (lang: string, iso: string) =>
  new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });

export function SubscriptionRows() {
  const { t, lang } = useStore();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [undo, setUndo] = useState(0);

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

  if (!sub) return null;
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
      setSub(s);
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
      <div className="setting">
        <div>
          <div>{plan}</div>
          <div className="muted small">{line}</div>
        </div>
        {sub.canceled ? (
          <Button size="sm" disabled={busy} onClick={() => void act(false)}>
            {t("sub.resume")}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={open}>
            {sub.trial ? t("sub.cancelTrial") : t("sub.cancel")}
          </Button>
        )}
      </div>
      {err && !ask && <p className="small error-text">{err}</p>}
      <Modal open={ask} onClose={() => !busy && setAsk(false)} className="confirm cancel-sub">
        {done ? (
          <>
            <h2>{sub.trial ? t("sub.doneTrialTitle") : t("sub.doneTitle")}</h2>
            <p>{t("sub.doneLead", { date: sub.endsAt ? longDate(lang, sub.endsAt) : "" })}</p>
            <div className="modal-actions">
              <Button variant="primary" onClick={() => setAsk(false)}>
                {t("sub.close")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2>{t("sub.beforeTitle")}</h2>
            <ul className="cancel-facts">
              <li>{sub.trial ? t("sub.factTrial", { date: date ? longDate(lang, date) : "" }) : t("sub.factEnd", { date: date ? longDate(lang, date) : "" })}</li>
              {undo > 0 && <li>{t("sub.factUndo", { n: undo })}</li>}
              {gain && <li>{t("sub.factGain", { what: gain })}</li>}
              <li>{t("sub.factUndoFree")}</li>
            </ul>
            {err && <p className="small error-text">{err}</p>}
            <div className="modal-actions even">
              <Button disabled={busy} onClick={() => setAsk(false)}>
                {t("sub.keep")}
              </Button>
              <Button disabled={busy} onClick={() => void act(true)}>
                {sub.trial ? t("sub.cancelTrial") : t("sub.cancel")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
