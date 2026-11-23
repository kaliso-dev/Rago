import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { I } from "../s5/I";

/** Barre du haut de la maquette v5 : la recherche et les boutons de la fenêtre. On y déplace la fenêtre. */
export function TitleBar() {
  const { t, setPaletteOpen } = useStore();
  return (
    <div className="topbar" data-tauri-drag-region onDoubleClick={(e) => e.target === e.currentTarget && api.window.toggleMaximize()}>
      <div className="search" role="button" tabIndex={0} onClick={() => setPaletteOpen(true)} onKeyDown={(e) => e.key === "Enter" && setPaletteOpen(true)}>
        <I n="search" />
        {t("app.search")}
        <kbd>ctrl k</kbd>
      </div>
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
