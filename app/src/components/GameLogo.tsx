import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { GAME_GLYPHS, presetGameKey } from "../lib/gameLogos";

/** Icônes des jeux installés, demandées une fois pour toute l'app (le moteur les cherche dans les dossiers des jeux). */
let pending: Promise<Record<string, string>> | null = null;

export function usePresetIcons(): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    pending ??= api.presetIcons().catch(() => {
      pending = null;
      return {};
    });
    void pending.then((i) => alive && setIcons(i));
    return () => {
      alive = false;
    };
  }, []);
  return icons;
}

/** Logo du jeu d'un preset : l'icône du jeu installé, sinon son glyphe, sinon les lettres du preset (`tag`). */
export function GameLogo({ presetId, tag, icons }: { presetId: string; tag?: string; icons: Record<string, string> }) {
  const key = presetGameKey(presetId);
  const icon = key ? icons[key] : undefined;
  if (icon) return <img className="game-logo-img" src={icon} alt="" draggable={false} />;
  const glyph = key ? GAME_GLYPHS[key] : undefined;
  if (glyph)
    return (
      <svg className="game-logo-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path d={glyph} fill="currentColor" />
      </svg>
    );
  return <>{tag}</>;
}
