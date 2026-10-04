import { ExternalLink, FolderOpen, LogOut } from "lucide-react";
import { formatDate } from "../lib/i18n";
import { api, isTauri } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { useStore } from "../lib/store";
import { Button, Card, Segmented } from "../components/ui";
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
  const { t, lang, setLang, motion, setMotion, license, signOut } = useStore();
  return (
    <div className="page settings">
      <header className="page-head">
        <h1>{t("settings.title")}</h1>
      </header>
      <div className="settings-grid">
        <Card title={t("account.title")}>
          {license?.state === "active" ? (
            <>
              <div className="setting">
                <div>
                  <div>{license.email}</div>
                  <div className="muted small">{t("account.device")}</div>
                </div>
                <Button size="sm" variant="ghost" icon={<LogOut size={13} />} onClick={() => void signOut()}>
                  {t("account.signOut")}
                </Button>
              </div>
              <div className="setting">
                <span>{t("account.plan")}</span>
                <span className="rg-metric">
                  Rago Hub {license.plan === "premium" ? "Premium" : license.plan}
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
            </>
          ) : (
            <p className="muted small">{t("account.unconfigured")}</p>
          )}
        </Card>
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
          <Wordmark height={18} />
          <p className="rg-metric muted">
            {t("settings.version", { v: "1.0.0" })} · {totalTweaks} {lang === "fr" ? "réglages" : "tweaks"}
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
    </div>
  );
}
