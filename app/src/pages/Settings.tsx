// Paramètres, à l'identique des maquettes v5 app-settings.html (Premium), app-settings-free.html (gratuit) et
// app-settings-canceled.html (abonnement résilié) : l'offre dans l'étiquette rouge de l'en-tête, puis deux colonnes
// de blocs en lignes .sr (compte, profil, app, à propos ; barre en jeu, pendant la partie, mémoire, dossiers).
// Styles : s5/pages/module.css (socle) et s5/pages/pages.css, retouches dans s5/app.css. La fenêtre « sign out? »
// reprend la maquette app-signout (win.css, `.mdl.cxm`).
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatPrice } from "../lib/accountApi";
import { api, isTauri } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { FREE_COUNT, useStore } from "../lib/store";
import { ACCOUNT_URL, SITE_URL, SUPPORT_URL } from "../components/LicenseGate";
import { Modal } from "../components/Modal";
import { ProfileSection } from "../components/ProfileCard";
import { SubscriptionRow, useSubscription } from "../components/SubscriptionCard";
import { BackgroundSection } from "../components/BackgroundCard";
import { SessionSection } from "../components/SessionCard";
import { I, LogoR } from "../s5/I";
import { Sw } from "../s5/ui";
import { dayMonth } from "../s5/text";

/** Exe de test (serveur staging) : Paramètres montre la dernière recherche de mise à jour, et son erreur. */
const STAGING = import.meta.env.VITE_RAGO_SERVER === "staging";

// Avis complets des programmes livrés dans resources\ : THIRD_PARTY_NOTICES.txt et PresentMon-LICENSE.txt (q74, 28/11).
// Profile Inspector livré = version « Modified by DeadManWalking » 3.5.0.0 (MIT, fork d'Orbmu2k, MIT aussi).
const LICENCES = [
  { name: "NVIDIA Profile Inspector (DeadManWalking mod)", licence: "MIT", url: "https://github.com/DeadManWalkingTO/NVidiaProfileInspectorDmW" },
  { name: "PresentMon (Intel)", licence: "MIT", url: "https://github.com/GameTechDev/PresentMon" },
  { name: "Barlow, Barlow Condensed", licence: "SIL OFL 1.1", url: "https://github.com/jpt/barlow" },
  { name: "Tauri", licence: "MIT / Apache 2.0", url: "https://tauri.app" },
  { name: "React", licence: "MIT", url: "https://react.dev" },
  { name: "Motion", licence: "MIT", url: "https://motion.dev" },
  { name: "Lucide", licence: "ISC", url: "https://lucide.dev" },
];

const titleSize = (name: string) => (name.length <= 8 ? 150 : Math.floor((150 * 8.4) / name.length));

/** Choix à deux ou trois cases (.seg2 de la maquette), au clavier avec les flèches. */
function Seg2<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const key = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (next < 0 || next >= options.length) return;
    e.preventDefault();
    onChange(options[next].id);
  };
  return (
    <span className="seg2" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <span
          key={o.id}
          role="radio"
          aria-checked={o.id === value}
          tabIndex={o.id === value ? 0 : -1}
          className={o.id === value ? "on" : undefined}
          onClick={() => onChange(o.id)}
          onKeyDown={(e) => key(e, i)}
        >
          {o.label}
        </span>
      ))}
    </span>
  );
}

export function Settings() {
  const { t, lang, setLang, motion, setMotion, license, signOut, setUpsell, activatedAt, sys, cleanTrim, setCleanTrim, goTo } = useStore();
  const [confirmOut, setConfirmOut] = useState(false);
  /** Réglages que la déconnexion remettra comme avant (liste du moteur), lue à l'ouverture de la confirmation. */
  const [outPlan, setOutPlan] = useState(0);
  const [sub, setSub] = useSubscription();
  const askSignOut = () => {
    setOutPlan(0);
    setConfirmOut(true);
    void api.signOutPlan().then(
      (ids) => setOutPlan(ids.length),
      () => {},
    );
  };
  const device = license?.deviceName ?? sys?.hostname ?? "";
  const licensed = license?.state === "active" || license?.state === "expired";
  const title = t("settings.title").toLowerCase();
  const short = (ts: number) => dayMonth(lang, ts).toLowerCase();
  const subDate = sub ? (sub.renewsAt ?? sub.endsAt) : null;
  const help = SUPPORT_URL && (
    <button type="button" className="lnk" onClick={() => void api.openUrl(SUPPORT_URL)}>
      <I n="info" />
      {t("account.help")}
    </button>
  );

  // en-tête : l'offre, et le prochain paiement ou la fin (gratuit : réglages ouverts)
  let planName = t("s5.st.free");
  let planLines: [string, string] = [t("s5.st.freeCnt", { n: FREE_COUNT, total: totalTweaks }), t("s5.st.freeRest")];
  if (licensed) {
    planName = license.plan === "premium" || !license.plan ? "premium" : license.plan;
    if (license.state === "expired") planLines = [t("s5.st.pending"), t("account.pending")];
    else if (sub)
      planLines = [
        sub.canceled ? t("s5.st.canceled") : sub.trial ? t("s5.st.trial") : sub.interval === "year" ? t("s5.st.yearly") : t("s5.st.monthly"),
        subDate
          ? sub.canceled
            ? t("s5.st.until", { date: short(Date.parse(subDate)) })
            : t("s5.st.next", { price: sub.price ? formatPrice(sub.price, lang) : "", date: short(Date.parse(subDate)) })
          : "",
      ];
    else planLines = [t("s5.st.active"), license.expiresAt ? t("s5.st.verified", { date: short(license.expiresAt) }) : ""];
  }

  return (
    <div className="pg-mod pg-pages pg-settings is-page">
      <section className="head">
        <div>
          <p className="kick">
            {title} <b>//</b> {t("s5.st.kick")}
          </p>
          <h1 className="title" data-t={title} style={{ fontSize: titleSize(title) }}>
            {title}
          </h1>
        </div>
        <div className={`ping sig plan${licensed ? "" : " free"}`}>
          <div className="pv">
            <b>{planName}</b>
          </div>
          <div className="pl">
            <span>{planLines[0]}</span>
            {planLines[1] && <span>{planLines[1]}</span>}
          </div>
        </div>
      </section>
      <div className="nobar" />

      <div className="setgrid">
        <div className="col">
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("account.title")}</h2>
              {licensed && (
                <button type="button" className="fold" onClick={askSignOut}>
                  {t("account.signOut")}
                  <I n="external" />
                </button>
              )}
            </div>
            {licensed ? (
              <div className="panel sp">
                <div className="who">
                  <span className="av" aria-hidden="true">
                    {[...(license.email ?? "?")][0]}
                  </span>
                  <div className="l">
                    <b>{license.email}</b>
                    <span>{license.state === "expired" ? t("account.pending") : activatedAt ? t("s5.st.activated", { date: dayMonth(lang, activatedAt) }) : t("account.device")}</span>
                  </div>
                </div>
                <div className="sr">
                  <div className="l">
                    <b>{t("account.plan")}</b>
                  </div>
                  <span className="vv">
                    rago optimizer {license.plan ?? "premium"}
                    {license.expiresAt && <small>{t("s5.st.verified", { date: short(license.expiresAt) })}</small>}
                  </span>
                </div>
                {sub && <SubscriptionRow sub={sub} onChange={setSub} />}
                {license.keyHint && (
                  <div className="sr">
                    <div className="l">
                      <b>{t("account.key")}</b>
                    </div>
                    <span className="vv m">{license.keyHint}</span>
                  </div>
                )}
                <div className="sr">
                  <div className="l">
                    <b>{t("account.machine")}</b>
                  </div>
                  <span className="vv m">{license.deviceName}</span>
                </div>
                <div className="sa">
                  <button type="button" className="btn sm" onClick={() => void api.openUrl(`${ACCOUNT_URL}/account`)}>
                    <I n="external" />
                    {t("account.manage")}
                  </button>
                  {help}
                </div>
              </div>
            ) : (
              <div className="panel sp">
                <div className="frp">
                  <b>
                    {FREE_COUNT}
                    <small>/ {totalTweaks}</small>
                  </b>
                  <div className="l">
                    <p>{t("account.free", { n: FREE_COUNT, total: totalTweaks })}</p>
                    <div className="fm">
                      <i style={{ "--w": `${((FREE_COUNT / totalTweaks) * 100).toFixed(1)}%` } as CSSProperties} />
                    </div>
                  </div>
                </div>
                <div className="sa">
                  <button type="button" className="btn sm red" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
                    {t("free.upgrade")}
                  </button>
                  <button type="button" className="btn sm" onClick={() => setUpsell("signin")}>
                    {t("free.signIn")}
                  </button>
                  {help}
                </div>
              </div>
            )}
          </section>

          <ProfileSection />

          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("s5.st.app")}</h2>
            </div>
            <div className="panel sp">
              <div className="sr">
                <div className="l">
                  <b>{t("settings.lang")}</b>
                </div>
                <Seg2
                  label={t("settings.lang")}
                  value={lang}
                  onChange={setLang}
                  options={[
                    { id: "fr", label: "français" },
                    { id: "en", label: "english" },
                  ]}
                />
              </div>
              <div className="sr">
                <div className="l">
                  <b>{t("settings.motion")}</b>
                </div>
                <Seg2
                  label={t("settings.motion")}
                  value={motion}
                  onChange={setMotion}
                  options={[
                    { id: "full", label: t("settings.motion.full") },
                    { id: "reduced", label: t("settings.motion.reduced") },
                  ]}
                />
              </div>
              <button type="button" className="sr lk2" onClick={() => goTo("share")}>
                <span className="ic2">
                  <I n="external" />
                </span>
                <span className="l">
                  <b>{t("settings.share")}</b>
                  <span>{t("settings.shareHint")}</span>
                </span>
                <I n="right" />
              </button>
            </div>
          </section>

          {/* Mémoire à gauche : les deux colonnes finissent à la même hauteur (25/11) */}
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("settings.memory")}</h2>
            </div>
            <div className="panel sp">
              <div className="sr">
                <div className="l">
                  <b>{t("settings.cleanTrim")}</b>
                  <span>{t("settings.cleanTrimHint")}</span>
                </div>
                <Sw on={cleanTrim} onChange={setCleanTrim} label={t("settings.cleanTrim")} />
              </div>
            </div>
          </section>
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("settings.about")}</h2>
            </div>
            <div className="panel sp about2">
              <div className="lock">
                <LogoR />
                <b>ago</b>
                <span>optimizer</span>
              </div>
              <p className="ver">
                {t("settings.version", { v: __APP_VERSION__ })} <b>//</b> {t("s5.st.tweaks", { n: totalTweaks })}
              </p>
              <p className="mb">{t("settings.madeBy")}</p>
              {!isTauri && <p className="mb nt">{t("settings.demo")}</p>}
              {STAGING && <UpdateCheck />}
              <span className="lbl">{t("settings.licences")}</span>
              <div className="lics">
                {LICENCES.map((l) => (
                  <button type="button" key={l.name} className="lcn" onClick={() => void api.openUrl(l.url)}>
                    <b>{l.name}</b>
                    {l.licence}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="col">
          <BackgroundSection />
          <SessionSection />
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("settings.folders")}</h2>
            </div>
            <div className="panel sp">
              {(["logs", "resources", "data"] as const).map((k) => (
                <div className="sr" key={k}>
                  <div className="l">
                    <b>{t(`settings.${k}`)}</b>
                  </div>
                  <button type="button" className="btn sm" onClick={() => api.openFolder(k)}>
                    <I n="file" />
                    {t("settings.open")}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal open={confirmOut} onClose={() => setConfirmOut(false)} v5="cxm">
        <h2 className="h2 tape mt">{t("signout.title")}</h2>
        {outPlan > 0 && <p className="ml hi">{t("signout.undoLead", { n: outPlan })}</p>}
        <p className="ml">{t("signout.lead", { device })}</p>
        <div className="mf">
          <button type="button" className="btn gh2 pl" onClick={() => void api.openUrl(`${ACCOUNT_URL}/account`)}>
            <I n="user" />
            {t("account.manage")}
          </button>
          <button type="button" className="btn gh2" onClick={() => setConfirmOut(false)}>
            {t("signout.cancel")}
          </button>
          <button
            type="button"
            className="btn red"
            autoFocus
            onClick={() => {
              setConfirmOut(false);
              void signOut();
            }}
          >
            <I n="logout" />
            {outPlan > 0 ? t("signout.go") : t("account.signOut")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UpdateCheck() {
  const { t } = useStore();
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    const read = () => void api.updateStatus().then(setStatus, () => {});
    read();
    // la recherche part au lancement : la ligne se remplit quand elle se termine
    const id = window.setInterval(read, 3000);
    return () => window.clearInterval(id);
  }, []);
  return <p className="mb nt">{t("settings.updateCheck", { s: status ?? t("settings.updateCheckWaiting") })}</p>;
}
