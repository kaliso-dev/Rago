import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Lock, Play, Power, PowerOff, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { autoVariant, availability, type Tweak } from "../lib/catalog";
import { formatDate, formatTime, type Key } from "../lib/i18n";
import { SESSION_TOGGLES, useStore } from "../lib/store";
import { Badge, Button, Segmented, Switch } from "./ui";

export function TweakRow({ tweak }: { tweak: Tweak }) {
  const { t, lang, sys, selected, toggle, variantOf, setVariant, lastRun, requestApply, focusTweak, setFocusTweak, isLocked, variantLocked, undoOnly, premium, setUpsell } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const av = availability(tweak, sys);
  const isOn = selected.has(tweak.id);
  const last = lastRun.get(tweak.id);
  const variant = variantOf(tweak);
  const auto = autoVariant(tweak, sys);
  const isAction = tweak.kind === "action";
  const focused = focusTweak === tweak.id;
  const locked = isLocked(tweak.id);
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
  }, [focused, setFocusTweak]);

  const onRowClick = () => {
    if (locked) return setUpsell("tweak", tweak.id);
    if (!av.ok) return;
    if (isAction || session) setOpen((o) => !o);
    else toggle(tweak.id);
  };

  return (
    <div
      ref={ref}
      className={`tweak${isOn ? " on" : ""}${!av.ok ? " blocked" : ""}${locked ? " locked" : ""}${focused ? " focused" : ""}`}
      onClick={onRowClick}
    >
      <div className="tweak-main">
        <div className="tweak-title">
          <span className="tweak-name">{tweak.name[lang]}</span>
          {!premium && !locked && <Badge tone="ok">{t(undoOnly(tweak.id) ? "free.undoBadge" : "free.badge")}</Badge>}
          {tweak.risk === "advanced" && <Badge tone="warn">{t("badge.advanced")}</Badge>}
          {tweak.reboot && (
            <Badge>
              <RotateCcw size={11} />
              {t("badge.reboot")}
            </Badge>
          )}
          {sessionState ? (
            <Badge tone={sessionState === "on" ? "ok" : undefined}>
              {t(sessionState === "on" ? "session.onSince" : "session.offSince", { time: formatTime(lang, last!.ts) })}
            </Badge>
          ) : (
            last && <Badge tone={last.ok ? "ok" : "red"}>{t(last.ok ? "badge.applied" : "badge.failed", { date: formatDate(lang, last.ts) })}</Badge>
          )}
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
        <p className="tweak-desc">{tweak.desc[lang]}</p>

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

        {!av.ok && av.block && <p className="tweak-note block">{t(`block.${av.block}` as Key)}</p>}
        {av.warn && (
          <p className="tweak-note warn">
            <TriangleAlert size={12} />
            {t(`warn.${av.warn}` as Key)}
          </p>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="tweak-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="muted small">
                {t("tweak.details", { n: tweak.lines })}
                {!isAction && <> {t(session ? "tweak.undoSession" : "tweak.undoRestore")}</>}
              </p>
              {tweak.confirm && (
                <p className="tweak-note warn">
                  <TriangleAlert size={12} />
                  {tweak.confirm[lang]}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
