import { CornerDownLeft, Lock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { catalog, searchTweaks, totalTweaks, tweakModule } from "../lib/catalog";
import { useStore } from "../lib/store";
import { Modal } from "./Modal";
import { Kbd } from "./ui";

export function SearchPalette() {
  const { t, lang, paletteOpen, setPaletteOpen, goTo, selected, toggle, unselectMany, isLocked, setUpsell } = useStore();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const results = useMemo(() => searchTweaks(q, lang), [q, lang]);
  const moduleName = (id: string) => catalog.modules.find((m) => m.id === tweakModule.get(id))?.name[lang] ?? "";

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
    }
  }, [paletteOpen]);
  useEffect(() => setIdx(0), [q]);

  const open = (id: string) => {
    setPaletteOpen(false);
    goTo(tweakModule.get(id)!, id);
  };

  return (
    <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} className="palette">
      <div className="palette-input">
        <Search size={16} />
        <input
          autoFocus
          value={q}
          placeholder={t("palette.placeholder", { n: totalTweaks })}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[idx]) {
              open(results[idx].id);
            }
          }}
        />
        <Kbd>Esc</Kbd>
      </div>
      {q && (
        <ul className="palette-list">
          {results.length === 0 && <li className="palette-empty">{t("palette.empty")}</li>}
          {results.map((tw, i) => (
            <li
              key={tw.id}
              className={i === idx ? "active" : undefined}
              onMouseEnter={() => setIdx(i)}
              onClick={() => open(tw.id)}
            >
              <div className="palette-item">
                <span className="palette-name">{tw.name[lang]}</span>
                <span className="palette-module">{moduleName(tw.id)}</span>
              </div>
              {tw.kind === "tweak" && isLocked(tw.id) && (
                <button
                  type="button"
                  className="palette-toggle locked"
                  aria-label={t("free.lock")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaletteOpen(false);
                    setUpsell("tweak", tw.id);
                  }}
                >
                  <Lock size={11} />
                </button>
              )}
              {tw.kind === "tweak" && !isLocked(tw.id) && (
                <button
                  type="button"
                  className={`palette-toggle${selected.has(tw.id) ? " on" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // « + » allume, « ✓ » retire de la sélection : jamais d'annulation d'un réglage déjà appliqué
                    if (selected.has(tw.id)) unselectMany([tw.id]);
                    else toggle(tw.id, true);
                  }}
                >
                  {selected.has(tw.id) ? "✓" : "+"}
                </button>
              )}
              {i === idx && <CornerDownLeft size={13} className="muted" />}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
