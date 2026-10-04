import { Minus, Search, Square, X } from "lucide-react";
import { api, isTauri } from "../lib/api";
import { useStore } from "../lib/store";
import { Mark } from "./Logo";
import { Kbd } from "./ui";

export function TitleBar() {
  const { t, setPaletteOpen, license } = useStore();
  const locked = !!license && license.state !== "active" && license.state !== "unconfigured";
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <Mark size={16} />
        <span data-tauri-drag-region>Rago Hub</span>
        {!isTauri && <span className="titlebar-demo">{t("demo.banner")}</span>}
      </div>
      {locked ? <span /> : (
      <button type="button" className="titlebar-search" onClick={() => setPaletteOpen(true)}>
        <Search size={14} />
        <span>{t("app.search")}</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      )}
      <div className="titlebar-controls">
        <button type="button" aria-label="Réduire" onClick={() => api.window.minimize()}>
          <Minus size={14} />
        </button>
        <button type="button" aria-label="Agrandir" onClick={() => api.window.toggleMaximize()}>
          <Square size={11} />
        </button>
        <button type="button" aria-label="Fermer" className="close" onClick={() => api.window.close()}>
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
