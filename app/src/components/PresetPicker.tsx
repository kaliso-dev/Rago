// Choix du preset d'un jeu (maquette rendus-v5/src/app-preset-picker.html, 23/11/2026) : une cover verticale par jeu,
// l'abréviation en gros sur une bande rouge penchée, « on your pc » pour les jeux trouvés. Rien n'est appliqué ici :
// le preset choisi sert au prochain « Optimiser et jouer ».
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Game } from "../lib/api";
import { catalog, presetForGame, tweaks, type Preset } from "../lib/catalog";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { Tabs } from "../s5/ui";
import { artByKey } from "../s5/art";

/** Ordre des presets de jeux dans la grille (celui de la maquette) ; ceux trouvés sur le PC passent devant. */
const ORDER = ["game_valorant", "game_cs2", "game_fortnite", "mc_pvp", "game_apex", "game_r6", "game_overwatch", "game_rl", "game_lol", "game_pubg", "game_rivals", "game_finals", "game_tarkov", "game_roblox", "game_gta", "game_bedrock"];
/** Icône imprimée des presets tout faits. */
const READY_ICON: Record<string, string> = { fps: "apply", latency: "latency", laptop: "battery", privacy: "eyeoff" };
/** Abréviation des presets tout faits. */
const READY_AB: Record<string, string> = { fps: "fps", latency: "ping", laptop: "eco", privacy: "priv" };

type Tab = "game" | "ready" | "mine";
type Card = { ref: string; name: string; desc: string; ab: string; n: number; cover: string | null; icon?: string; onPc?: boolean };

/** Réglages utilisables d'un preset (sans les actions ni les réglages retirés du catalogue). */
export const presetCount = (entries: string[]) => entries.filter((e) => tweaks.get(e.split(":")[0])?.kind === "tweak").length;
/** Clé de l'image d'un preset de jeu : « game_valorant » → valorant, « mc_pvp » → minecraft. */
export const presetArtKey = (id: string) => (id === "mc_pvp" ? "minecraft" : id.replace(/^game_/, ""));
const isGamePreset = (p: Preset) => !!p.game || p.id === "mc_pvp";

export function PresetPicker({ game, value, games, onPick, onClose }: { game: string; value: string; games: Game[]; onPick: (ref: string) => void; onClose: () => void }) {
  const { t, lang, myPresets } = useStore();
  const [sel, setSel] = useState(value);
  const found = useMemo(() => {
    const s = new Set<string>();
    for (const g of games) {
      const p = presetForGame(g.name);
      if (p) s.add(p.id);
    }
    return s;
  }, [games]);

  const cards: Record<Tab, Card[]> = useMemo(() => {
    const game: Card[] = ORDER.map((id) => catalog.presets.find((p) => p.id === id))
      .concat(catalog.presets.filter((p) => isGamePreset(p) && !ORDER.includes(p.id)))
      .filter((p): p is Preset => !!p)
      .map((p) => ({
        ref: `builtin:${p.id}`,
        name: p.name[lang],
        desc: p.desc?.[lang] ?? "",
        ab: (p.tag ?? p.name[lang].slice(0, 3)).toLowerCase(),
        n: presetCount(p.tweaks),
        cover: artByKey(presetArtKey(p.id), "cover"),
        onPc: found.has(p.id),
      }));
    game.sort((a, b) => Number(!!b.onPc) - Number(!!a.onPc));
    const ready: Card[] = catalog.presets
      .filter((p) => !isGamePreset(p))
      .map((p) => ({ ref: `builtin:${p.id}`, name: p.name[lang], desc: p.desc?.[lang] ?? "", ab: READY_AB[p.id] ?? p.name[lang].slice(0, 4), n: presetCount(p.tweaks), cover: null, icon: READY_ICON[p.id] ?? "apply" }));
    ready.push({ ref: "none", name: t("games.noPresetShort"), desc: t("s5.pick.noneDesc"), ab: t("s5.pick.noneAb"), n: 0, cover: null, icon: "ban" });
    const mine: Card[] = myPresets.map((p) => ({
      ref: `mine:${p.id}`,
      name: p.name,
      desc: t("s5.pick.mineDesc"),
      ab: p.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 4) || "mine",
      n: presetCount(p.t),
      cover: null,
      icon: "star",
    }));
    return { game, ready, mine };
  }, [lang, t, myPresets, found]);

  const all = [...cards.game, ...cards.ready, ...cards.mine];
  const tabOf = (ref: string): Tab => (cards.ready.some((c) => c.ref === ref) ? "ready" : cards.mine.some((c) => c.ref === ref) ? "mine" : "game");
  const [tab, setTab] = useState<Tab>(() => tabOf(value));
  const cur = all.find((c) => c.ref === sel) ?? null;

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  // posée sur la fenêtre entière, au-dessus de la barre latérale (la page, elle, est animée et rognée)
  return createPortal(
    <div className="ovl" role="dialog" aria-modal="true" aria-label={t("s5.pick.title")}>
      <div className="dim2" onClick={onClose} />
      <div className="mdl pk">
        <div className="hd">
          <div>
            <p className="kick">
              {game} <b>//</b> {t("s5.pick.kick")}
            </p>
            <h2 className="h2 tape mt">{t("s5.pick.title")}</h2>
            <p className="ml">{t("s5.pick.lead")}</p>
          </div>
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            ariaLabel={t("s5.pick.title")}
            items={[
              { id: "game", label: t("s5.pick.games"), n: cards.game.length },
              { id: "ready", label: t("s5.pick.ready"), n: cards.ready.length },
              { id: "mine", label: t("s5.pick.mine"), n: cards.mine.length, disabled: cards.mine.length === 0 },
            ]}
          />
        </div>
        <div className="vgrid" role="listbox" aria-label={t("s5.pick.title")}>
          {cards[tab].map((c) => (
            <div
              key={c.ref}
              role="option"
              aria-selected={c.ref === sel}
              tabIndex={0}
              title={c.name}
              className={`vc${c.ref === sel ? " on" : ""}${c.cover ? "" : " plain"}`}
              style={c.cover ? { backgroundImage: `url(${c.cover})` } : undefined}
              onClick={() => setSel(c.ref)}
              onDoubleClick={() => onPick(c.ref)}
              onKeyDown={(e) => (e.key === "Enter" ? onPick(c.ref) : e.key === " " && (e.preventDefault(), setSel(c.ref)))}
            >
              {c.icon && <I n={c.icon} className="big" />}
              {c.onPc && (
                <span className="pc">
                  <i className="dot" />
                  {t("s5.pick.onPc")}
                </span>
              )}
              {c.ref === sel && (
                <span className="ck">
                  <I n="check" line />
                </span>
              )}
              <div className="ft">
                <b className={`ab${c.ab.length >= 4 ? " l4" : ""}`}>{c.ab}</b>
                <span className="n">{c.ref === "none" ? t("s5.pick.noTweaks") : t("s5.nav.tweaks", { n: c.n })}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mf">
          <div className="now">
            {cur && (
              <span className={`th${cur.cover ? "" : " plain"}`} style={cur.cover ? { backgroundImage: `url(${cur.cover})` } : undefined}>
                {cur.icon && <I n={cur.icon} />}
              </span>
            )}
            <div>
              <b>{cur ? (cur.ref === "none" ? cur.name : t("s5.pick.presetName", { name: cur.name })) : "–"}</b>
              <span className="sub">{cur ? (cur.ref === "none" ? cur.desc : `${t("s5.nav.tweaks", { n: cur.n })}: ${cur.desc}`) : ""}</span>
            </div>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            {t("s5.pick.cancel")}
          </button>
          <button type="button" className="btn red" disabled={!cur} onClick={() => cur && onPick(cur.ref)}>
            <I n="check" />
            {t("s5.pick.use")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
