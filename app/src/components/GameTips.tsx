import { useState } from "react";
import { api } from "../lib/api";
import type { Lang } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { tipsFor, useTipsDone } from "../lib/tips";
import { I } from "../s5/I";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Les premiers réglages seulement, le reste au clic : la place reste aux réglages en direct. */
const FIRST = 3;

/** Liens du pied (« show 1 more setting ») en minuscule, comme la maquette. */
const lower = (s: string) => s.charAt(0).toLocaleLowerCase() + s.slice(1);

/** Réglages en jeu conseillés pour un jeu, dans la barre en jeu (maquette app-ingame, bloc .igtp) : le joueur coche ce
 * qu'il a réglé, Rago ne le lui redemande plus. Rien n'est changé dans le jeu. */
export function GameTips({ game, t, lang, open: startOpen = true }: { game: string; t: T; lang: Lang; open?: boolean }) {
  const def = tipsFor(game);
  const [done, mark] = useTipsDone();
  const [open, setOpen] = useState(startOpen);
  const [showDone, setShowDone] = useState(false);
  const [all, setAll] = useState(false);
  if (!def) return null;

  const left = def.tips.filter((x) => !done.has(x.id));
  const doneCount = def.tips.length - left.length;
  const list = showDone ? def.tips : left;
  const shown = all ? list : list.slice(0, FIRST);
  const hidden = list.length - shown.length;

  return (
    <div className={`igtp${open ? "" : " shut"}`}>
      <button type="button" className="igth" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <I n="bulb" />
        <span className="igo">{t("tips.title", { game: def.name })}</span>
        <em className={left.length ? undefined : "ok"}>{left.length ? t("tips.left", { n: left.length }) : t("tips.allDone")}</em>
        <I n="chev" className="chv" />
      </button>
      {open && (
        <>
          {shown.map((tip) => {
            const isDone = done.has(tip.id);
            return (
              <div key={tip.id} className={`igtr${isDone ? " done" : ""}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  className={`igcb${isDone ? " on" : ""}`}
                  title={isDone ? t("tips.markUndone") : t("tips.markDone")}
                  aria-label={`${tip.setting} : ${isDone ? t("tips.markUndone") : t("tips.markDone")}`}
                  onClick={() => mark(tip.id, !isDone)}
                >
                  {isDone && <I n="check" line />}
                </button>
                <div>
                  <div className="l1">
                    <b>{tip.setting}</b>
                    <i aria-hidden>→</i>
                    <span>{tip.value[lang]}</span>
                    <em className="igtg">{t(`tips.tag.${tip.tag}` as Key)}</em>
                  </div>
                  <p className="why">{tip.why[lang]}</p>
                </div>
              </div>
            );
          })}
          <div className="igtf">
            {hidden > 0 && (
              <button type="button" onClick={() => setAll(true)}>
                <u>{lower(t("tips.more", { n: hidden }))}</u>
              </button>
            )}
            <span>
              {t("tips.source")}{" "}
              {def.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && ", "}
                  <button type="button" onClick={() => void api.openUrl(s.url)}>
                    <u>{s.name}</u>
                  </button>
                </span>
              ))}
            </span>
            {doneCount > 0 && (
              <button type="button" onClick={() => setShowDone((v) => !v)}>
                <u>{lower(showDone ? t("tips.hideDone") : t("tips.showDone", { n: doneCount }))}</u>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
