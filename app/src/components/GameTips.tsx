import { useState } from "react";
import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { api } from "../lib/api";
import type { Lang } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { tipsFor, useTipsDone } from "../lib/tips";
import "../styles/tips.css";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Dans la barre en jeu (`compact`), les premiers réglages seulement, le reste au clic : la place reste aux réglages
 * en direct. */
const COMPACT = 3;

/** Réglages en jeu conseillés pour un jeu (barre en jeu, bibliothèque) : le joueur coche ce qu'il a réglé, Rago ne
 * le lui redemande plus. Rien n'est changé dans le jeu. */
export function GameTips({
  game,
  t,
  lang,
  open: startOpen = true,
  compact = false,
  className = "",
}: {
  game: string;
  t: T;
  lang: Lang;
  open?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const def = tipsFor(game);
  const [done, mark] = useTipsDone();
  const [open, setOpen] = useState(startOpen);
  const [showDone, setShowDone] = useState(false);
  const [all, setAll] = useState(!compact);
  if (!def) return null;

  const left = def.tips.filter((x) => !done.has(x.id));
  const doneCount = def.tips.length - left.length;
  const list = showDone ? def.tips : left;
  const shown = all ? list : list.slice(0, COMPACT);
  const hidden = list.length - shown.length;

  return (
    <div className={`game-tips ${className}`}>
      <button type="button" className="game-tips-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Lightbulb size={13} />
        <span className="rg-overline">{t("tips.title", { game: def.name })}</span>
        <span className={`game-tips-count${left.length ? "" : " ok"}`}>{left.length ? t("tips.left", { n: left.length }) : t("tips.allDone")}</span>
        <ChevronDown size={14} className={`game-tips-chevron${open ? " open" : ""}`} />
      </button>
      {open && (
        <>
          {left.length > 0 && !compact && <p className="game-tips-lead">{t("tips.lead")}</p>}
          {shown.length > 0 && (
            <ul className="game-tips-list">
              {shown.map((tip) => {
                const isDone = done.has(tip.id);
                return (
                  <li key={tip.id} className={`game-tip${isDone ? " done" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      className="game-tip-check"
                      title={isDone ? t("tips.markUndone") : t("tips.markDone")}
                      aria-label={`${tip.setting} : ${isDone ? t("tips.markUndone") : t("tips.markDone")}`}
                      onClick={() => mark(tip.id, !isDone)}
                    >
                      {isDone && <Check size={11} />}
                    </button>
                    <div className="game-tip-body">
                      <div className="game-tip-line">
                        <span className="game-tip-setting">{tip.setting}</span>
                        <span className="game-tip-arrow" aria-hidden>
                          →
                        </span>
                        <span className="game-tip-value">{tip.value[lang]}</span>
                        <span className={`game-tip-tag tag-${tip.tag}`}>{t(`tips.tag.${tip.tag}` as Key)}</span>
                      </div>
                      <div className="game-tip-why">{tip.why[lang]}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="game-tips-foot">
            {hidden > 0 && (
              <button type="button" className="link" onClick={() => setAll(true)}>
                {t("tips.more", { n: hidden })}
              </button>
            )}
            <span>
              {t("tips.source")}{" "}
              {def.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && ", "}
                  <button type="button" className="link" onClick={() => void api.openUrl(s.url)}>
                    {s.name}
                  </button>
                </span>
              ))}
            </span>
            {doneCount > 0 && (
              <button type="button" className="link" onClick={() => setShowDone((v) => !v)}>
                {showDone ? t("tips.hideDone") : t("tips.showDone", { n: doneCount })}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
