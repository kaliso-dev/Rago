import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Gauge, LoaderCircle, RotateCcw, Sparkles, Zap } from "lucide-react";
import { api, type GraphicsLevel, type GraphicsStatus } from "../lib/api";
import { GFX_DETAILS, GFX_LEVELS } from "../lib/graphics";
import { useStore } from "../lib/store";

const ICONS: Record<GraphicsLevel, typeof Zap> = { performance: Zap, balanced: Gauge, quality: Sparkles };

type Note = { tone: "ok" | "warn"; text: string } | null;

/** Graphismes d'un jeu, comme OptiFine dans Minecraft : Performance, Équilibré ou Qualité en un clic, écrits dans les
 * réglages du jeu (gamecfg.rs). Jeu fermé seulement ; la copie d'avant se remet d'ici. */
export function GameGraphics({ game, title, running }: { game: string; title: string; running: boolean }) {
  const { t, lang } = useStore();
  const [status, setStatus] = useState<GraphicsStatus | null>(null);
  const [busy, setBusy] = useState<GraphicsLevel | "restore" | null>(null);
  const [note, setNote] = useState<Note>(null);

  const refresh = () =>
    api.graphicsStatus(game).then(
      (s) => setStatus(s),
      () => setStatus(null),
    );
  useEffect(() => {
    setStatus(null);
    setNote(null);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, running]);

  const explain = (e: unknown): string => {
    const code = String(e);
    if (code === "running") return t("gfx.running", { game: title });
    if (code === "not_found") return t("gfx.notFound", { game: title });
    if (code === "locked") return t("gfx.locked", { game: title });
    if (code === "unknown_format") return t("gfx.unknown");
    if (code === "no_backup") return t("gfx.noBackup");
    return t("gfx.error", { msg: code });
  };

  const apply = async (level: GraphicsLevel) => {
    setBusy(level);
    setNote(null);
    try {
      const out = await api.graphicsApply(game, level);
      const locked = out.locked > 0 ? ` ${t("gfx.lockedSome", { n: out.locked })}` : "";
      setNote({ tone: "ok", text: (out.changed === 0 ? t("gfx.already") : t("gfx.applied", { game: title })) + locked });
    } catch (e) {
      setNote({ tone: "warn", text: explain(e) });
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const restore = async () => {
    setBusy("restore");
    setNote(null);
    try {
      await api.graphicsRestore(game);
      setNote({ tone: "ok", text: t("gfx.restored") });
    } catch (e) {
      setNote({ tone: "warn", text: explain(e) });
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const isRunning = running || !!status?.running;
  const missing = status != null && status.files === 0;
  const allLocked = status != null && status.files > 0 && status.locked === status.files;
  const blocked = !status || isRunning || missing || allLocked || busy != null;
  const lead = isRunning
    ? t("gfx.running", { game: title })
    : missing
      ? t("gfx.notFound", { game: title })
      : allLocked
        ? t("gfx.locked", { game: title })
        : status && status.files > 1
          ? t("gfx.leadAccounts", { game: title, n: status.files })
          : t("gfx.lead", { game: title });

  return (
    <motion.section className="card games-gfx" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="games-gfx-head">
        <div>
          <h2 className="section-title rg-overline">{t("gfx.title")}</h2>
          <p className={`small ${isRunning || missing || allLocked ? "games-gfx-warn" : "muted"}`}>{lead}</p>
        </div>
        <div className="games-gfx-state small">
          {status?.level ? (
            <span className="chip">{t("gfx.now", { level: t(`gfx.level.${status.level}`) })}</span>
          ) : status && status.files > 0 ? (
            <span className="chip">{t("gfx.custom")}</span>
          ) : null}
          {status?.saved && (
            <button type="button" className="link small" disabled={blocked} onClick={() => void restore()}>
              {busy === "restore" ? <LoaderCircle size={11} className="spin" /> : <RotateCcw size={11} />}
              {t("gfx.restore")}
            </button>
          )}
        </div>
      </div>
      <div className="games-gfx-levels" role="radiogroup" aria-label={t("gfx.title")}>
        {GFX_LEVELS.map((level) => {
          const Icon = ICONS[level];
          const on = status?.level === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={on}
              className={`games-gfx-level${on ? " on" : ""}`}
              disabled={blocked}
              onClick={() => void apply(level)}
            >
              <span className="games-gfx-level-top">
                <span className="games-gfx-icon">{busy === level ? <LoaderCircle size={15} className="spin" /> : <Icon size={15} />}</span>
                <span className="games-gfx-name">{t(`gfx.level.${level}`)}</span>
                {on && <Check size={14} className="games-gfx-check" />}
              </span>
              <span className="games-gfx-tag small">{t(`gfx.tag.${level}`)}</span>
              <span className="games-gfx-detail small muted">{GFX_DETAILS[game]?.[level]?.[lang]}</span>
            </button>
          );
        })}
      </div>
      {note && <p className={`games-gfx-note small${note.tone === "warn" ? " warn" : ""}`}>{note.text}</p>}
    </motion.section>
  );
}
