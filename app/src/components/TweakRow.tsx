import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Lock, Play, Power, PowerOff, RotateCcw, TriangleAlert } from "./ri";
import { useEffect, useRef, useState } from "react";
import { autoVariant, availability, catalog, tweakModule, tweaks, type Lang, type Tweak } from "../lib/catalog";
import { formatDate, formatTime, type Key } from "../lib/i18n";
import { SESSION_TOGGLES, useStore } from "../lib/store";
import { Badge, Button, Segmented, Switch } from "./ui";

/** Réglages au même script (champ `twin`), avec leur module : « Nom » (Module). */
function twinNames(tweak: Tweak, lang: Lang): string | null {
  if (!tweak.twin) return null;
  const names = [...tweaks.values()]
    .filter((o) => o.twin === tweak.twin && o.id !== tweak.id)
    .map((o) => {
      const mod = catalog.modules.find((m) => m.id === tweakModule.get(o.id));
      return lang === "fr" ? `« ${o.name.fr} » (${mod?.name.fr})` : `“${o.name.en}” (${mod?.name.en})`;
    });
  return names.length ? names.join(", ") : null;
}

export function TweakRow({ tweak }: { tweak: Tweak }) {
  const { t, lang, sys, selected, toggle, variantOf, setVariant, lastRun, requestApply, focusTweak, setFocusTweak, focusSeq, isLocked, variantLocked, undoOnly, premium, setUpsell, isOn: isOnFn, applied, pendingUndo, reapply } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const av = availability(tweak, sys);
  const isOn = isOnFn(tweak.id);
  const last = lastRun.get(tweak.id);
  const done = applied.get(tweak.id);
  const undoing = !!done && pendingUndo.includes(tweak.id);
  const variant = variantOf(tweak);
  const auto = autoVariant(tweak, sys);
  const isAction = tweak.kind === "action";
  const focused = focusTweak === tweak.id;
  const twin = twinNames(tweak, lang);
  // appliqué pendant Premium : on peut toujours l'éteindre (l'annulation reste ouverte sans licence)
  const locked = isLocked(tweak.id) && !done;
  // mode jeu, RBW Mod, mode jeu Windows : on les allume et on les éteint, l'état connu vient de l'historique
  const session = SESSION_TOGGLES.has(tweak.id) && !!tweak.variants?.length && av.ok;
  const sessionState = session && last?.ok && last.variant ? last.variant : null;
  const runVariant = (v: string) => {
    if (variantLocked(tweak.id, v)) return setUpsell("tweak", tweak.id);
    setVariant(tweak.id, v);
    requestApply([tweak.id]);
  };

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
    const h = setTimeout(() => setFocusTweak(null), 1800);
    return () => clearTimeout(h);
  }, [focused, focusSeq, setFocusTweak]);

  const onRowClick = () => {
    if (locked) return setUpsell("tweak", tweak.id);
    if (!av.ok) return;
    if (isAction || session) setOpen((o) => !o);
    else toggle(tweak.id);
  };

  // ligne d'état sous le nom (charte v5 : la tuile ne montre que le nom et ce qui demande l'attention)
  const state: { text: string; tone?: "red" | "ok" } | null = locked
    ? null
    : !av.ok && av.block
      ? { text: t(`block.${av.block}` as Key) }
      : sessionState
        ? { text: t(sessionState === "on" ? "session.onSince" : "session.offSince", { time: formatTime(lang, last!.ts) }), tone: sessionState === "on" ? "ok" : undefined }
        : isAction
          ? last
            ? { text: t(last.ok ? "badge.applied" : "badge.failed", { date: formatDate(lang, last.ts) }), tone: last.ok ? undefined : "red" }
            : null
          : undoing
            ? { text: t("badge.pendingUndo"), tone: "red" }
            : done && selected.has(tweak.id)
              ? { text: t("badge.pendingUpdate"), tone: "red" }
              : done?.drift
                ? { text: t("badge.drift"), tone: "red" }
                : done && !done.ok
                  ? { text: t("badge.failed", { date: formatDate(lang, done.ts) }), tone: "red" }
                  : null;
  const wide = (tweak.variants && tweak.variants.length > 1 && av.ok && !session) || session;

  return (
    <div
      ref={ref}
      className={`tweak tile${wide ? " wide" : ""}${isOn ? " on" : ""}${undoing || (done && selected.has(tweak.id)) ? " pend" : ""}${!av.ok ? " blocked" : ""}${locked ? " locked" : ""}${focused ? " focused" : ""}${open ? " open" : ""}`}
      onClick={onRowClick}
    >
      <div className="tweak-main">
        <div className="tweak-title">
          <span className="tweak-name">{tweak.name[lang]}</span>
          {tweak.reboot && <RotateCcw size={12} className="tweak-reboot" aria-label={t("badge.reboot")} />}
        </div>
        {state && (
          <span className={`tweak-state${state.tone ? ` ${state.tone}` : ""}`}>
            {state.text}
            {done?.drift && !undoing && !selected.has(tweak.id) && !session && (
              <button
                type="button"
                className="link"
                onClick={(e) => {
                  e.stopPropagation();
                  reapply(tweak.id);
                }}
              >
                {t("tweak.reapply")}
              </button>
            )}
          </span>
        )}

        {tweak.variants && tweak.variants.length > 1 && av.ok && !session && (
          <div className="tweak-variants">
            <Segmented
              layoutId={`seg-${tweak.id}`}
              value={variant ?? tweak.variants[0].id}
              onChange={(v) => setVariant(tweak.id, v)}
              options={tweak.variants.map((v) => ({
                id: v.id,
                label: v.label[lang],
                hint: v.auto && v.id === auto ? t("badge.auto") : undefined,
                locked: variantLocked(tweak.id, v.id),
              }))}
            />
          </div>
        )}
      </div>

      {/* détail au survol (ou épinglé par « Détails ») : la phrase, le gain, l'inconvénient, ce que fait le script */}
      <div className="tweak-pop" onClick={(e) => e.stopPropagation()}>
        <p className="tweak-desc">{tweak.desc[lang]}</p>
        {(tweak.gain || tweak.cons) && (
          <ul className="tweak-facts">
            {tweak.gain && (
              <li>
                <b className="g">+</b>
                <span>{tweak.gain[lang]}</span>
              </li>
            )}
            {tweak.cons && (
              <li>
                <b>–</b>
                <span>{tweak.cons[lang]}</span>
              </li>
            )}
          </ul>
        )}
        {av.warn && (
          <p className="tweak-note warn">
            <TriangleAlert size={12} />
            {t(`warn.${av.warn}` as Key)}
          </p>
        )}
        {tweak.confirm && (
          <p className="tweak-note warn">
            <TriangleAlert size={12} />
            {tweak.confirm[lang]}
          </p>
        )}
        {done?.drift && !session && <p className="tweak-note warn">{t("tweak.drift")}</p>}
        <div className="tweak-pop-ft">
          {!premium && !isLocked(tweak.id) && <Badge tone="ok">{t(undoOnly(tweak.id) ? "free.undoBadge" : "free.badge")}</Badge>}
          {tweak.risk === "advanced" && <Badge tone="warn">{t("badge.advanced")}</Badge>}
          {tweak.reboot && (
            <Badge>
              <RotateCcw size={11} />
              {t("badge.reboot")}
            </Badge>
          )}
          {done && done.ok && !isAction && <Badge tone="ok">{t("badge.applied", { date: formatDate(lang, done.ts) })}</Badge>}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="tweak-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="small">
                {tweak.native ? t(`tweak.native.${tweak.native}` as Key) : t("tweak.details", { n: tweak.variants?.find((v) => v.id === variant)?.lines ?? tweak.lines })}
                {!isAction && <> {t(session ? "tweak.undoSession" : done && !done.backup ? "tweak.undoDefaults" : "tweak.undoSwitch")}</>}
                {twin && <> {t(isAction ? "tweak.twinAction" : "tweak.twin", { names: twin })}</>}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {!locked && (
          <button
            type="button"
            className={`tweak-more${open ? " open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            {t("tweak.more")}
            <ChevronDown size={12} />
          </button>
        )}
      </div>

      <div className="tweak-side">
        {locked ? (
          <Button
            size="sm"
            className="tweak-lock"
            icon={<Lock size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              setUpsell("tweak", tweak.id);
            }}
          >
            {t("free.lock")}
          </Button>
        ) : session ? (
          <div className="tweak-session">
            {tweak.variants!.map((v) => (
              <Button
                key={v.id}
                size="sm"
                variant={sessionState === v.id ? "primary" : "secondary"}
                icon={variantLocked(tweak.id, v.id) ? <Lock size={12} /> : v.id === "off" ? <PowerOff size={12} /> : <Power size={12} />}
                onClick={(e) => {
                  e.stopPropagation();
                  runVariant(v.id);
                }}
              >
                {t(v.id === "off" ? "session.turnOff" : "session.turnOn")}
              </Button>
            ))}
          </div>
        ) : isAction ? (
          <Button
            size="sm"
            icon={<Play size={12} />}
            disabled={!av.ok}
            onClick={(e) => {
              e.stopPropagation();
              requestApply([tweak.id]);
            }}
          >
            {t("tweak.run")}
          </Button>
        ) : (
          <Switch checked={isOn} disabled={!av.ok} onChange={(v) => toggle(tweak.id, v)} label={tweak.name[lang]} />
        )}
      </div>
    </div>
  );
}
