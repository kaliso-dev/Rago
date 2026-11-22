import { useEffect, useState } from "react";
import raw from "../data/tips.json";
import { api } from "./api";
import { presetForGame } from "./catalog";
import { presetGameKey } from "./gameLogos";

/** Réglages en jeu conseillés au lancement d'un jeu (src/data/tips.json, lu aussi par tips.rs). Les noms des réglages
 * et leurs valeurs restent ceux du jeu en anglais, tels que les guides et les pros les donnent. */
export type TipTag = "see" | "lag" | "fps" | "build" | "aim";
export interface Tip {
  id: string;
  tag: TipTag;
  /** nom du réglage dans le jeu (plusieurs séparés par « · ») */
  setting: string;
  value: { en: string; fr: string };
  why: { en: string; fr: string };
}
export interface TipSource {
  name: string;
  url: string;
  /** date de la page lue (AAAA-MM-JJ ou AAAA-MM) */
  date: string;
}
export interface GameTips {
  name: string;
  sources: TipSource[];
  tips: Tip[];
}

const games = (raw as unknown as { games: Record<string, GameTips> }).games;

/** Réglages conseillés d'un jeu par sa clé (« valorant », « fortnite »…). */
export const tipsFor = (key: string | null | undefined): GameTips | undefined => (key ? games[key] : undefined);

/** Clé des réglages conseillés d'un jeu de la bibliothèque, d'après son nom (comme le preset proposé). */
export const tipsKeyForGame = (name: string): string | null => {
  const key = presetGameKey(presetForGame(name)?.id ?? "");
  return key && games[key] ? key : null;
};

/** Réglages cochés « fait », suivis en direct (l'app et la barre en jeu restent d'accord). */
export function useTipsDone(): [Set<string>, (id: string, done: boolean) => void] {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    void api.tipsDone().then((l) => setDone(new Set(l)), () => {});
    const sub = api.onTipsDone((l) => setDone(new Set(l)));
    return () => void sub.then((un) => un());
  }, []);
  const mark = (id: string, isDone: boolean) => {
    setDone((s) => {
      const next = new Set(s);
      if (isDone) next.add(id);
      else next.delete(id);
      return next;
    });
    void api.tipsMark(id, isDone).then((l) => setDone(new Set(l)), () => {});
  };
  return [done, mark];
}
