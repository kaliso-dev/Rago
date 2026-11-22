/** Deux lettres du nom d'un jeu, sur sa vignette tant que l'image officielle n'est pas là (ou s'il n'y en a pas). */
export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** Teinte propre à un jeu (son dégradé de vignette), toujours la même pour le même id. */
export function hue(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
