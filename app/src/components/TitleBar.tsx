import { Minus, Search, Square, X } from "./ri";
import { api, isTauri } from "../lib/api";
import { useStore } from "../lib/store";
import { Kbd } from "./ui";

/** Barre du haut (charte v5) : posée au-dessus des pages, à droite de la barre latérale. On y déplace la fenêtre. */
export function TitleBar() {
  const { t, setPaletteOpen, license, premium, setUpsell } = useStore();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <button type="button" className="titlebar-search" onClick={() => setPaletteOpen(true)}>
        <Search size={15} />
        <span>{t("app.search")}</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      {!isTauri ? (
        <span className="titlebar-demo" data-tauri-drag-region>{t("demo.banner")}</span>
      ) : (
        import.meta.env.VITE_RAGO_SERVER === "staging" && <span className="titlebar-demo" data-tauri-drag-region>{t("staging.banner")}</span>
      )}
      <div className="titlebar-controls" data-tauri-drag-region>
        {license &&
          (premium ? (
            <span className="titlebar-plan">Premium</span>
          ) : (
            <button type="button" className="titlebar-signin" onClick={() => setUpsell("signin")}>
              {t("free.signIn")}
            </button>
          ))}
        <button type="button" className="wc" aria-label={t("window.minimize")} onClick={() => api.window.minimize()}>
          <Minus size={14} />
        </button>
        <button type="button" className="wc" aria-label={t("window.maximize")} onClick={() => api.window.toggleMaximize()}>
          <Square size={11} />
        </button>
        <button type="button" aria-label={t("window.close")} className="wc close" onClick={() => api.window.close()}>
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
