import { Minus, Search, Square, X } from "lucide-react";
import { api, isTauri } from "../lib/api";
import { useStore } from "../lib/store";
import { Mark } from "./Logo";
import { Kbd } from "./ui";

export function TitleBar() {
  const { t, setPaletteOpen, license, premium, setUpsell } = useStore();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <Mark size={16} />
        <span data-tauri-drag-region>Rago Optimizer</span>
        {!isTauri ? (
          <span className="titlebar-demo">{t("demo.banner")}</span>
        ) : (
          import.meta.env.VITE_RAGO_SERVER === "staging" && <span className="titlebar-demo">{t("staging.banner")}</span>
        )}
      </div>
      <button type="button" className="titlebar-search" onClick={() => setPaletteOpen(true)}>
        <Search size={14} />
        <span>{t("app.search")}</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      <div className="titlebar-controls">
        {license && (premium ? (
          <span className="titlebar-plan rg-overline">Premium</span>
        ) : (
          <button type="button" className="titlebar-signin" onClick={() => setUpsell("signin")}>
            {t("free.signIn")}
          </button>
        ))}
        <button type="button" aria-label={t("window.minimize")} onClick={() => api.window.minimize()}>
          <Minus size={14} />
        </button>
        <button type="button" aria-label={t("window.maximize")} onClick={() => api.window.toggleMaximize()}>
          <Square size={11} />
        </button>
        <button type="button" aria-label={t("window.close")} className="close" onClick={() => api.window.close()}>
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
