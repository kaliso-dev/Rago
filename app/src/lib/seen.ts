import { useSyncExternalStore } from "react";

// Pages et onglets de la 1.2.0 déjà ouverts : leur badge « Nouveau » s'efface à la première visite, dans la barre
// latérale comme dans les onglets de Réseau.
const KEY = "rago.seenPages";
const subs = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    cache = [];
  }
  return cache;
}

export function markSeen(id: string) {
  const cur = read();
  if (cur.includes(id)) return;
  cache = [...cur, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* stockage indisponible : le badge revient au prochain lancement */
  }
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function useSeen(): string[] {
  return useSyncExternalStore(subscribe, read);
}
