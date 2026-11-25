import { useEffect, useState } from "react";
import { api, isTauri } from "../lib/api";
import { useStore } from "../lib/store";
import { I } from "../s5/I";

/** Barre du haut de la maquette v5 : la recherche, le compte et les boutons de la fenêtre. On y déplace la fenêtre.
 * Compte (remis le 25/11, demande de Sofiene : la maquette ne l'avait pas et le joueur ne trouvait plus où se
 * connecter) : « Sign in » sans licence active, « Premium » avec une licence active (ouvre les Paramètres). */
export function TitleBar() {
  const { t, setPaletteOpen, license, premium, setUpsell, goTo } = useStore();
  const banner = !isTauri ? t("demo.banner") : import.meta.env.VITE_RAGO_SERVER === "staging" ? t("staging.banner") : null;
  // exe de test : le vrai Rago Optimizer tourne aussi (deux barres en jeu sur Alt+X), vérifié toutes les 30 s
  const [other, setOther] = useState(false);
  useEffect(() => {
    if (!isTauri || import.meta.env.VITE_RAGO_SERVER !== "staging") return;
    const check = () => void api.otherRagoRunning().then(setOther, () => {});
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="topbar" data-tauri-drag-region onDoubleClick={(e) => e.target === e.currentTarget && api.window.toggleMaximize()}>
      <div className="search" role="button" tabIndex={0} onClick={() => setPaletteOpen(true)} onKeyDown={(e) => e.key === "Enter" && setPaletteOpen(true)}>
        <I n="search" />
        {t("app.search")}
        <kbd>ctrl k</kbd>
      </div>
      {other ? (
        <span className="tb-env warn" title={t("staging.otherLong")}>
          <I n="alert" />
          {t("staging.other")}
        </span>
      ) : (
        banner && (
          <span className="tb-env" data-tauri-drag-region>
            {banner}
          </span>
        )
      )}
      <span className="tb-acc">
        {license &&
          (premium ? (
            <button type="button" className="tb-plan" title={license.email ?? undefined} onClick={() => goTo("settings")}>
              <I n="check" />
              Premium
            </button>
          ) : (
            <button type="button" className="btn sm red" onClick={() => setUpsell("signin")}>
              <I n="user" />
              {t("free.signIn")}
            </button>
          ))}
      </span>
      <span className="wc">
        <span role="button" aria-label={t("window.minimize")} onClick={() => api.window.minimize()}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 7h10" /></svg>
        </span>
        <span role="button" aria-label={t("window.maximize")} onClick={() => api.window.toggleMaximize()}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="2.5" width="9" height="9" /></svg>
        </span>
        <span role="button" className="x" aria-label={t("window.close")} onClick={() => api.window.close()}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3l8 8M11 3l-8 8" /></svg>
        </span>
      </span>
    </div>
  );
}
