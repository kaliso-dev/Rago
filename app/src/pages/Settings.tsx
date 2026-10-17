import { useState } from "react";
import { ChevronRight, ExternalLink, FolderOpen, LifeBuoy, LogOut, Share2, UserRound } from "lucide-react";
import { formatDate } from "../lib/i18n";
import { api, isTauri } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { FREE, useStore } from "../lib/store";
import { ACCOUNT_URL, SITE_URL, SUPPORT_URL } from "../components/LicenseGate";
import { Modal } from "../components/Modal";
import { ProfileCard } from "../components/ProfileCard";
import { Button, Card, Segmented, Switch } from "../components/ui";
import { Wordmark } from "../components/Logo";

const LICENCES = [
  { name: "NVIDIA Profile Inspector", licence: "MIT", url: "https://github.com/Orbmu2k/nvidiaProfileInspector" },
  { name: "Geist, Geist Mono", licence: "SIL OFL 1.1", url: "https://vercel.com/font" },
  { name: "Tauri", licence: "MIT / Apache 2.0", url: "https://tauri.app" },
  { name: "React", licence: "MIT", url: "https://react.dev" },
  { name: "Motion", licence: "MIT", url: "https://motion.dev" },
  { name: "Lucide", licence: "ISC", url: "https://lucide.dev" },
];

export function Settings() {
  const { t, lang, setLang, motion, setMotion, license, signOut, setUpsell, activatedAt, sys, cleanTrim, setCleanTrim, goTo } = useStore();
  const [confirmOut, setConfirmOut] = useState(false);
  /** Réglages que la déconnexion remettra comme avant (liste du moteur), lue à l'ouverture de la confirmation. */
  const [outPlan, setOutPlan] = useState(0);
  const askSignOut = () => {
    setOutPlan(0);
    setConfirmOut(true);
    void api.signOutPlan().then(
      (ids) => setOutPlan(ids.length),
      () => {},
    );
  };
  const device = license?.deviceName ?? sys?.hostname ?? "";
  return (
    <div className="page settings">
      <header className="page-head">
        <h1>{t("settings.title")}</h1>
      </header>
      <div className="settings-grid">
        <Card title={t("account.title")}>
          {license?.state === "active" || license?.state === "expired" ? (
            <>
              <div className="setting">
                <div>
                  <div>{license.email}</div>
                  <div className="muted small">
                    {/* « 14 oct. » finit déjà par un point : la phrase n'en prend pas un second */}
                    {license.state === "expired"
                      ? t("account.pending")
                      : activatedAt
                        ? `${t("account.device")} ${t("account.activated", { date: formatDate(lang, activatedAt) }).replace(/\.?$/, ".")}`
                        : t("account.device")}
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={<LogOut size={13} />} onClick={askSignOut}>
                  {t("account.signOut")}
                </Button>
              </div>
              <div className="setting">
                <span>{t("account.plan")}</span>
                <span className="rg-metric">
                  Rago Optimizer {license.plan === "premium" ? "Premium" : license.plan}
                  {license.expiresAt && <span className="muted"> · {t("account.renews", { date: formatDate(lang, license.expiresAt) })}</span>}
                </span>
              </div>
              {license.keyHint && (
                <div className="setting">
                  <span>{t("account.key")}</span>
                  <span className="rg-metric muted">{license.keyHint}</span>
                </div>
              )}
              <div className="setting">
                <span>{t("account.machine")}</span>
                <span className="rg-metric muted">{license.deviceName}</span>
              </div>
              <div className="setting-actions">
                <Button size="sm" icon={<UserRound size={13} />} onClick={() => void api.openUrl(`${ACCOUNT_URL}/account`)}>
                  {t("account.manage")}
                </Button>
                {SUPPORT_URL && (
                  <Button size="sm" variant="ghost" icon={<LifeBuoy size={13} />} onClick={() => void api.openUrl(SUPPORT_URL)}>
                    {t("account.help")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="muted small">{t("account.free", { n: FREE.size, total: totalTweaks })}</p>
              <div className="setting-actions">
                <Button size="sm" variant="primary" onClick={() => void api.openUrl(`${SITE_URL}/#pricing`)}>
                  {t("free.upgrade")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setUpsell("signin")}>
                  {t("free.signIn")}
                </Button>
                {SUPPORT_URL && (
                  <Button size="sm" variant="ghost" icon={<LifeBuoy size={13} />} onClick={() => void api.openUrl(SUPPORT_URL)}>
                    {t("account.help")}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
        <ProfileCard />
        <Card>
          <div className="setting">
            <span>{t("settings.lang")}</span>
            <Segmented layoutId="set-lang" value={lang} onChange={setLang} options={[{ id: "fr", label: "Français" }, { id: "en", label: "English" }]} />
          </div>
          <div className="setting">
            <span>{t("settings.motion")}</span>
            <Segmented
              layoutId="set-motion"
              value={motion}
              onChange={setMotion}
              options={[
                { id: "full", label: t("settings.motion.full") },
                { id: "reduced", label: t("settings.motion.reduced") },
              ]}
            />
          </div>
        </Card>
        <Card>
          <button type="button" className="setting setting-link" onClick={() => goTo("share")}>
            <Share2 size={16} className="setting-link-icon" />
            <div>
              <div>{t("settings.share")}</div>
              <div className="muted small">{t("settings.shareHint")}</div>
            </div>
            <ChevronRight size={16} className="setting-link-chevron" />
          </button>
        </Card>
        <Card title={t("settings.memory")}>
          <div className="setting">
            <div>
              <div>{t("settings.cleanTrim")}</div>
              <div className="muted small">{t("settings.cleanTrimHint")}</div>
            </div>
            <Switch checked={cleanTrim} onChange={setCleanTrim} label={t("settings.cleanTrim")} />
          </div>
        </Card>
        <Card title={t("settings.folders")}>
          {(["logs", "resources", "data"] as const).map((k) => (
            <div className="setting" key={k}>
              <span>{t(`settings.${k}`)}</span>
              <Button size="sm" icon={<FolderOpen size={13} />} onClick={() => api.openFolder(k)}>
                {t("settings.open")}
              </Button>
            </div>
          ))}
        </Card>
        <Card title={t("settings.about")} className="about">
          <Wordmark height={20} />
          <p className="rg-metric muted">
            {t("settings.version", { v: __APP_VERSION__ })} · {totalTweaks} {lang === "fr" ? "réglages" : "tweaks"}
          </p>
          {!isTauri && <p className="muted small">{t("settings.demo")}</p>}
          <div className="rg-overline" style={{ marginTop: 16 }}>
            {t("settings.licences")}
          </div>
          <ul className="licences">
            {LICENCES.map((l) => (
              <li key={l.name}>
                <button type="button" className="link" onClick={() => api.openUrl(l.url)}>
                  {l.name} <ExternalLink size={11} />
                </button>
                <span className="rg-metric muted">{l.licence}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Modal open={confirmOut} onClose={() => setConfirmOut(false)} className="confirm signout">
        <h2>{t("signout.title")}</h2>
        {outPlan > 0 && <p>{t("signout.undoLead", { n: outPlan })}</p>}
        <p className="muted">{t("signout.lead", { device })}</p>
        <div className="modal-actions">
          <Button variant="ghost" className="push-left" onClick={() => void api.openUrl(`${ACCOUNT_URL}/account`)}>
            {t("account.manage")}
          </Button>
          <Button onClick={() => setConfirmOut(false)}>{t("signout.cancel")}</Button>
          <Button
            variant="primary"
            icon={<LogOut size={14} />}
            onClick={() => {
              setConfirmOut(false);
              void signOut();
            }}
          >
            {outPlan > 0 ? t("signout.go") : t("account.signOut")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
