import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ListPlus, Plus, Search, X } from "lucide-react";
import { catalog, searchTweaks, tweakModule, tweaks } from "../lib/catalog";
import { MAX_NAME } from "../lib/share";
import { itemName, useStore } from "../lib/store";
import { Modal } from "./Modal";
import { Button } from "./ui";

const moduleName = (id: string, lang: "fr" | "en") => catalog.modules.find((m) => m.id === tweakModule.get(id))?.name[lang] ?? "";

/** Modifier un preset de « Mes presets » (enregistré ici ou importé d'un ami) : son nom, ses réglages et leurs
 * variantes. Rien n'est appliqué : le preset s'ajoute ensuite à la sélection comme avant. */
export function PresetEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, lang, myPresets, updatePreset, currentSetup } = useStore();
  const preset = myPresets.find((p) => p.id === id) ?? null;
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!preset) return;
    setName(preset.name);
    setEntries(preset.t);
    setQ("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const has = useMemo(() => new Set(entries.map((e) => e.split(":")[0])), [entries]);
  const found = useMemo(() => searchTweaks(q, lang).filter((tw) => tw.kind === "tweak" && !has.has(tw.id)).slice(0, 8), [q, lang, has]);
  const entryOf = (tid: string) => {
    const tw = tweaks.get(tid);
    return tw?.variants?.length ? `${tid}:${tw.defaultVariant ?? tw.variants[0].id}` : tid;
  };
  // un réglage déjà là change de variante sur place
  const add = (e: string) =>
    setEntries((list) => {
      const i = list.findIndex((x) => x.split(":")[0] === e.split(":")[0]);
      return i < 0 ? [...list, e] : list.map((x, j) => (j === i ? e : x));
    });
  // la sélection en cours s'ajoute ; un réglage déjà dans le preset prend la variante choisie en ce moment
  const fromSetup = currentSetup.filter((e) => !entries.includes(e));
  const save = () => {
    if (!preset || !name.trim() || !entries.length) return;
    updatePreset(preset.id, name, entries);
    onClose();
  };

  return (
    <Modal open={!!preset} onClose={onClose} className="preset-editor">
      <h2 className="modal-title">{t("dash.mine.editTitle")}</h2>
      <p className="modal-lead">{t("dash.mine.editLead")}</p>

      <label className="pe-label" htmlFor="pe-name">
        {t("dash.mine.name")}
      </label>
      <input
        id="pe-name"
        className="input text pe-name"
        maxLength={MAX_NAME}
        value={name}
        placeholder={t("dash.mine.namePh")}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />

      <div className="pe-head">
        <span className="pe-label">{t("dash.mine.editTweaks", { n: entries.length })}</span>
        {fromSetup.length > 0 && (
          <button type="button" className="link small" onClick={() => fromSetup.forEach(add)}>
            <ListPlus size={12} />
            {t("dash.mine.editFromSetup", { n: fromSetup.length })}
          </button>
        )}
      </div>
      <ul className="pe-list">
        {entries.map((e) => {
          const [tid, v] = e.split(":");
          const tw = tweaks.get(tid);
          return (
            <li key={tid}>
              <span className="pe-item">
                <span className="pe-item-name">{tw ? tw.name[lang] : itemName(tid, lang)}</span>
                <span className="pe-item-module">{tw ? moduleName(tid, lang) : t("dash.mine.editUnknown")}</span>
              </span>
              {tw?.variants && tw.variants.length > 1 && (
                <span className="pe-select">
                  <select aria-label={tw.name[lang]} value={v ?? tw.variants[0].id} onChange={(ev) => add(`${tid}:${ev.target.value}`)}>
                    {tw.variants.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label[lang]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </span>
              )}
              <button type="button" className="icon-btn" title={t("dash.mine.editRemove")} aria-label={t("dash.mine.editRemove")} onClick={() => setEntries((list) => list.filter((x) => x !== e))}>
                <X size={13} />
              </button>
            </li>
          );
        })}
        {!entries.length && <li className="pe-empty muted small">{t("dash.mine.editEmpty")}</li>}
      </ul>

      {/* la recherche s'ouvre par-dessus la liste, qui garde sa place */}
      <div className="pe-search">
        <Search size={13} />
        <input
          className="input text"
          value={q}
          placeholder={t("dash.mine.editAdd")}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setSearching(true)}
          onBlur={() => setSearching(false)}
          onKeyDown={(e) => {
            // Échap vide la recherche avant de fermer la fenêtre
            if (e.key === "Escape" && q) {
              e.stopPropagation();
              setQ("");
            }
            if (e.key === "Enter" && found[0]) {
              add(entryOf(found[0].id));
              setQ("");
            }
          }}
        />
        {searching && q.trim() && (
          <ul className="pe-found">
            {found.map((tw) => (
              <li key={tw.id}>
                <button
                  type="button"
                  // le champ garde le focus : on peut ajouter plusieurs réglages à la suite
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    add(entryOf(tw.id));
                    setQ("");
                  }}
                >
                  <Plus size={13} />
                  <span className="pe-item">
                    <span className="pe-item-name">{tw.name[lang]}</span>
                    <span className="pe-item-module">{moduleName(tw.id, lang)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!found.length && <li className="pe-empty muted small">{t("dash.mine.editNone")}</li>}
          </ul>
        )}
      </div>
      <footer className="modal-actions">
        <Button variant="ghost" onClick={onClose}>
          {t("dash.mine.cancel")}
        </Button>
        <Button variant="primary" disabled={!name.trim() || !entries.length} onClick={save}>
          {t("dash.mine.ok")}
        </Button>
      </footer>
    </Modal>
  );
}
