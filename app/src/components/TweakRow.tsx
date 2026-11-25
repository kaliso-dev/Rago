// Carreau d'un réglage (.tw des maquettes v5 app-module-*.html, styles s5/pages/module.css) : tout le carreau est
// l'interrupteur ; réglage à options sur toute la largeur ; action : bouton « run » ; réglage de session : deux
// boutons ; détail ouvert par l'icône info (.inf → .pop, demande de Sofiene du 25/11 : plus de bulle au survol). Le carreau vit dans une page .pg-mod (modules, Outils, onglet Tweaks de Réseau).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { autoVariant, availability, catalog, tweakModule, type Tweak } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { SESSION_TOGGLES, useStore } from "../lib/store";
import { I } from "../s5/I";
import { clock, dayMonth } from "../s5/text";
import grass from "../assets/s5/img/game/grass-block.svg";

/** Pastille du jeu dans le sélecteur des 16 jeux (comme la maquette : V rouge pour Valorant, bloc d'herbe pour Minecraft). */
const GLYPH: Record<string, [string, string, string]> = { valorant: ["V", "#FF4655", "#0A0A0B"] };
function Glyph({ id, label }: { id: string; label: string }) {
  if (id === "minecraft" || id === "mc_bedrock" || id === "bedrock")
    return (
      <span className="pg mc">
        <img src={grass} alt="" />
      </span>
    );
  const [g, bg, fg] = GLYPH[id] ?? [label.slice(0, 1), "#3A3A42", "#F5F5F6"];
  return (
    <span className="pg" style={{ background: bg, color: fg }}>
      {g}
    </span>
  );
}

/** Notes sous le nom des réglages à options (maquettes) : une phrase sur ce que veut dire le choix. */
const VNOTE = new Set(["pri_game", "in_frames", "in_queue", "hitreg_suite", "mc_optifine"]);

export function TweakRow({
  tweak,
  mod,
  adv = false,
  label,
}: {
  tweak: Tweak;
  /** module de la page : « Also in … » pour un réglage d'un autre module */
  mod?: string;
  /** dans les avancés dépliés */
  adv?: boolean;
  /** nom court du carreau à la place du nom du catalogue (onglet des réglages de Réseau, comme la maquette) */
  label?: string;
}) {
  const { t, lang, sys, selected, toggle, variantOf, setVariant, lastRun, requestApply, focusTweak, setFocusTweak, focusSeq, isLocked, variantLocked, setUpsell, isOn: isOnFn, applied, pendingUndo, reapply } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const av = availability(tweak, sys);
  const id = tweak.id;
  const isOn = isOnFn(id);
  const last = lastRun.get(id);
  const done = applied.get(id);
  const sel = selected.has(id);
  const undoing = !!done && pendingUndo.includes(id);
  const isAction = tweak.kind === "action";
  const focused = focusTweak === id;
  // appliqué pendant Premium : on peut toujours l'éteindre (l'annulation reste ouverte sans licence)
  const locked = isLocked(id) && !done;
  // mode jeu, RBW Mod, mode jeu Windows : on les allume et on les éteint, l'état connu vient de l'historique
  const session = SESSION_TOGGLES.has(id) && !!tweak.variants?.length && av.ok;
  const sessionState = session && last?.ok && last.variant ? last.variant : null;
  const vs = tweak.variants ?? [];
  const many = vs.length > 1 && av.ok && !session;
  const cur = sel || !done ? variantOf(tweak) : (done.variant ?? variantOf(tweak));
  const auto = autoVariant(tweak, sys);
  const num = many && vs.every((v) => /^\d/.test(v.label.en));
  const pick = many && vs.length > 6 && !num;
  const unit = num ? (vs[0].label.en.split(" ")[1] ?? "") : "";

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
    const h = setTimeout(() => setFocusTweak(null), 1800);
    return () => clearTimeout(h);
  }, [focused, focusSeq, setFocusTweak]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.querySelector(".pick-wrap")?.contains(e.target as Node) && setMenu(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);

  // bulle d'info : se ferme au clic ailleurs (une autre icône info comprise) et à Échap
  useEffect(() => {
    if (!info) return;
    const close = (e: MouseEvent) => {
      const el = e.target as Node;
      if (!ref.current?.querySelector(".pop")?.contains(el) && !ref.current?.querySelector(".inf")?.contains(el)) setInfo(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setInfo(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
    };
  }, [info]);

  const openInfo = () => {
    if (!info) {
      const r = ref.current?.getBoundingClientRect();
      const box = ref.current?.closest(".main")?.getBoundingClientRect();
      setUp(!!r && !!box && r.bottom + 230 > box.bottom && r.top - 230 > box.top);
    }
    setInfo((o) => !o);
  };

  const onTile = () => {
    if (locked) return setUpsell("tweak", id);
    if (!av.ok || isAction || session) return;
    toggle(id);
  };
  const choose = (v: string) => {
    if (variantLocked(id, v)) return setUpsell("tweak", id);
    setVariant(id, v);
    // une option choisie sur un réglage éteint le prépare à être appliqué
    if (!done && !sel) toggle(id, true);
  };
  const runVariant = (v: string) => {
    if (variantLocked(id, v)) return setUpsell("tweak", id);
    setVariant(id, v);
    requestApply([id]);
  };

  // la ligne sous le nom : ce qui demande l'attention (maquette : une seule)
  let note: ReactNode = null;
  let failed = false;
  if (!av.ok && av.block) note = t(`block.${av.block}` as Key);
  else if (sessionState) note = t(sessionState === "on" ? "session.onSince" : "session.offSince", { time: clock(lang, last!.ts) });
  else if (isAction && last) {
    failed = !last.ok;
    // point de restauration : l'heure aussi (on revient à ce moment-là)
    const when = id === "rst_point" ? `${dayMonth(lang, last.ts)} ${clock(lang, last.ts)}` : dayMonth(lang, last.ts);
    note = last.ok ? t("s5.mod.lastRun", { date: when }) : <b>{t("badge.failed", { date: dayMonth(lang, last.ts) })}</b>;
  } else if (undoing) note = t("badge.pendingUndo");
  else if (done && sel) note = t("badge.pendingUpdate");
  else if (done && (done.drift || !done.ok) && !session) {
    failed = true;
    note = (
      <>
        <b>{done.drift ? t("badge.drift") : t("badge.failed", { date: dayMonth(lang, done.ts) })}</b>
        <u
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            reapply(id);
          }}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.stopPropagation(), reapply(id))}
        >
          {t("s5.mod.applyAgain")}
        </u>
      </>
    );
  }
  const home = tweakModule.get(id);
  if (!note && mod && home && home !== mod) note = t("s5.mod.alsoIn", { name: catalog.modules.find((m) => m.id === home)?.name[lang] ?? home });
  if (!note && many) {
    if (VNOTE.has(id)) note = t(`s5.mod.note.${id}` as Key);
    else if (unit === "GB") note = t("s5.mod.note.gb");
    else if (unit === "Hz") note = t("s5.mod.note.hz");
    else if (vs.some((v) => v.auto)) note = t("s5.mod.note.auto");
  }

  const applied_ = !!done && !undoing;
  const pend = sel;
  const cls = ["tw"];
  if (applied_) cls.push("on");
  if (pend) cls.push("pend");
  if (undoing) cls.push("undo");
  if (failed) cls.push("drift");
  if (!av.ok) cls.push("blk");
  if (adv) cls.push("advx");
  if (many || session) cls.push("var");
  if (session) cls.push("sess");
  if (locked) cls.push("lock");
  if (focused) cls.push("focused");
  const swCls = `sw${applied_ ? " on" : ""}${pend ? " pend" : ""}${undoing ? " undo" : ""}`;
  const zap = !tweak.reboot && !isAction && !session;
  const n = vs.find((v) => v.id === cur)?.lines ?? tweak.lines;

  let right: ReactNode;
  if (locked)
    right = (
      <button
        type="button"
        className="lk"
        onClick={(e) => {
          e.stopPropagation();
          setUpsell("tweak", id);
        }}
      >
        <I n="lock" />
        {t("free.lock")}
      </button>
    );
  else if (session) {
    const nxt = sessionState === "on" ? "off" : "on";
    right = (
      <>
        <span className={`sst${sessionState === "on" ? " is-on" : ""}`}>
          <i />
          {t(sessionState === "on" ? "s5.mod.on" : "s5.mod.off")}
        </span>
        <button
          type="button"
          className={`sb${nxt === "on" ? " go" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            runVariant(nxt);
          }}
        >
          <I n={variantLocked(id, nxt) ? "lock" : "power"} />
          {t(nxt === "on" ? "session.turnOn" : "session.turnOff")}
        </button>
      </>
    );
  } else if (isAction)
    right = (
      <button
        type="button"
        className="run"
        disabled={!av.ok}
        onClick={(e) => {
          e.stopPropagation();
          requestApply([id]);
        }}
      >
        <I n="play" />
        {t("tweak.run")}
      </button>
    );
  else
    right = (
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={tweak.name[lang]}
        disabled={!av.ok}
        className={swCls}
        onClick={(e) => {
          e.stopPropagation();
          onTile();
        }}
      />
    );

  let mid: ReactNode = null;
  if (many && pick) {
    const v = vs.find((x) => x.id === cur) ?? vs[0];
    mid = (
      <span className="pick-wrap" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pick" aria-haspopup="listbox" aria-expanded={menu} onClick={() => !locked && setMenu((m) => !m)}>
          <Glyph id={v.id} label={v.label[lang]} />
          <b>{v.label[lang]}</b>
          <small>{t("s5.mod.games", { n: vs.length })}</small>
          <I n="chev" />
        </button>
        {menu && (
          <span className="pick-menu" role="listbox" aria-label={tweak.name[lang]}>
            {vs.map((x) => (
              <button
                key={x.id}
                type="button"
                role="option"
                aria-selected={x.id === cur}
                className={x.id === cur ? "on" : undefined}
                onClick={() => {
                  setMenu(false);
                  choose(x.id);
                }}
              >
                <Glyph id={x.id} label={x.label[lang]} />
                <b>{x.label[lang]}</b>
                {variantLocked(id, x.id) && <I n="lock" />}
              </button>
            ))}
          </span>
        )}
      </span>
    );
  } else if (many)
    mid = (
      <span className="opts" onClick={(e) => e.stopPropagation()}>
        {vs.map((v) => {
          const on = v.id === cur;
          const c = `o${num ? " n" : ""}${on ? (pend ? " pend" : applied_ ? " on" : " now") : ""}${variantLocked(id, v.id) ? " lkd" : ""}`;
          return (
            <button key={v.id} type="button" className={c} aria-pressed={on} title={variantLocked(id, v.id) ? t("free.lock") : undefined} onClick={() => !locked && choose(v.id)}>
              {num ? v.label[lang].split(" ")[0] : v.label[lang]}
              {v.auto && v.id === auto && <sup>{t("s5.mod.auto")}</sup>}
            </button>
          );
        })}
      </span>
    );

  return (
    <div
      ref={ref}
      className={cls.join(" ")}
      onClick={onTile}
    >
      <span className="tx">
        <span className="nr">
          <span className="nm">{label ?? tweak.name[lang]}</span>
          {zap && <I n="zap" />}
          <button
            type="button"
            className={`inf${info ? " open" : ""}`}
            aria-label={t("s5.mod.info")}
            aria-expanded={info}
            title={t("s5.mod.info")}
            onClick={(e) => {
              e.stopPropagation();
              openInfo();
            }}
          >
            <I n="info" />
          </button>
        </span>
        {note && <span className="note">{note}</span>}
      </span>
      {mid}
      {right}
      <div className={`pop${up ? " up" : ""}${info ? " show" : ""}`} aria-hidden={!info} onClick={(e) => e.stopPropagation()}>
        <p>{tweak.desc[lang]}</p>
        {tweak.gain && (
          <div className="ft">
            <b className="g">+</b>
            {tweak.gain[lang]}
          </div>
        )}
        {tweak.cons && (
          <div className="ft">
            <b>&minus;</b>
            {tweak.cons[lang]}
          </div>
        )}
        {av.warn && (
          <div className="ft cf">
            <b>!</b>
            {t(`warn.${av.warn}` as Key)}
          </div>
        )}
        {done?.drift && !session && (
          <div className="ft cf">
            <b>!</b>
            {t("tweak.drift")}
          </div>
        )}
        <div className="meta">
          <span>
            <I n={tweak.reboot ? "rotate" : "zap"} />
            {t(tweak.reboot ? "s5.mod.restart" : "s5.mod.noRestart")}
          </span>
          {!tweak.native && <span>{t("s5.mod.commands", { n })}</span>}
          {tweak.confirm && (
            <span>
              <I n="alert" />
              {t("s5.mod.asksFirst")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
