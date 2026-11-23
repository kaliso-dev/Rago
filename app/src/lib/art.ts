/** Deux lettres d'un nom (« Counter-Strike 2 » → CS) : carte d'un pro sans photo dans Display. */
export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

