import { useEffect, useMemo, useRef, useState } from "react";
import { catalog, searchTweaks, totalTweaks, tweakModule } from "../lib/catalog";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { Modal } from "./Modal";

/** Recherche (Ctrl+K), maquette app-search : la boîte `.pal` en haut de la fenêtre, la page assombrie dessous. Entrée
 * ouvre le module du réglage choisi ; « + » l'ajoute à la sélection, « ✓ » l'en retire (jamais d'annulation d'un
 * réglage déjà appliqué) ; un réglage Premium en gratuit ouvre la fenêtre Premium. */
export function SearchPalette() {
  const { t, lang, paletteOpen, setPaletteOpen, goTo, selected, toggle, unselectMany, isLocked, setUpsell } = useStore();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
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
  // flèches : la ligne choisie reste visible quand la liste défile
  useEffect(() => {
    listRef.current?.children[idx]?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const open = (id: string) => {
    setPaletteOpen(false);
    goTo(tweakModule.get(id)!, id);
  };

  return (
    <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} v5="" box="pal">
      <div className="pin">
        <I n="search" />
        <input
          className="q"
          autoFocus
          spellCheck={false}
          value={q}
          placeholder={t("palette.placeholder", { n: totalTweaks })}
          aria-label={t("palette.placeholder", { n: totalTweaks })}
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
        <kbd>esc</kbd>
      </div>
      {q && (
        <ul className="pls2" ref={listRef}>
          {results.length === 0 && <li className="emp">{t("palette.empty")}</li>}
          {results.map((tw, i) => {
            const on = selected.has(tw.id);
            return (
              <li key={tw.id} className={i === idx ? "act" : undefined} onMouseMove={() => i !== idx && setIdx(i)} onClick={() => open(tw.id)}>
                <div className="l">
                  <b>{tw.name[lang]}</b>
                  <span>{moduleName(tw.id)}</span>
                </div>
                {tw.kind === "tweak" &&
                  (isLocked(tw.id) ? (
                    <button
                      type="button"
                      className="tg2 lk"
                      aria-label={t("free.lock")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaletteOpen(false);
                        setUpsell("tweak", tw.id);
                      }}
                    >
                      <I n="lock" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`tg2${on ? " on" : ""}`}
                      // la saisie garde le focus : Entrée ouvre toujours le réglage choisi
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={t(on ? "palette.remove" : "palette.add")}
                      aria-pressed={on}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (on) unselectMany([tw.id]);
                        else toggle(tw.id, true);
                      }}
                    >
                      <I n={on ? "check" : "plus"} />
                    </button>
                  ))}
                {i === idx ? <I n="enter" className="ent" /> : <i className="ent" />}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
