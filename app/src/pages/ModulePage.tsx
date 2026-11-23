// Pages module (Latence, Carte graphique, Windows, Hitreg, Minecraft, RBW Mod, Mode jeu, Mode expert, Restauration),
// à l'identique des maquettes v5 app-module-*.html (générées depuis le catalogue par rendus-v5/outils/gen.py).
// Styles : s5/pages/module.css (porté de rendus-v5/src/module.css), retouches dans s5/app.css.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api, type MinecraftStatus, type RbwCheck } from "../lib/api";
import { availability, catalog, sectionTweaks, tweaks, type Section, type Tweak } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { itemName, useStore } from "../lib/store";
import { TweakRow } from "../components/TweakRow";
import { I } from "../s5/I";
import { clock, dayMonth, dayTime } from "../s5/text";
import grass from "../assets/s5/img/game/grass-block.svg";

/** Taille du titre des maquettes (gen.py) : 150 px jusqu'à 8 lettres, puis plus petit pour tenir sur une ligne. */
const titleSize = (name: string) => (name.length <= 8 ? 150 : Math.floor((150 * 8.4) / name.length));
const isSwitch = (tw: Tweak) => tw.kind === "tweak";

function Sig({ value, unit, small, ticks, sess }: { value: string | number; unit: React.ReactNode; small?: string; ticks: string[][]; sess?: boolean }) {
  return (
    <div className={`ping sig${sess ? " sess" : ""}`}>
      <div className="pv">
        <b>{value}</b>
        <span>
          {unit}
          {small && <small>{small}</small>}
        </span>
      </div>
      <div className="ticks">
        {ticks.map((g, i) => (
          <span key={i} className="g" style={{ "--n": g.length } as CSSProperties}>
            {g.map((c, j) => (
              <i key={j} className={c || undefined} />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Minecraft : le dossier du jeu */
function MinecraftFolder() {
  const { t, mcDir, setMcDir } = useStore();
  const [status, setStatus] = useState<MinecraftStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStatus(await api.minecraftStatus(mcDir));
    } catch {
      setStatus(null);
    }
  }, [mcDir]);
  useEffect(() => void refresh(), [refresh]);
  const dir = status?.dir ?? mcDir ?? "";
  const cut = Math.max(dir.lastIndexOf("\\"), dir.lastIndexOf("/")) + 1;

  return (
    <section className="msec mcf">
      <div className="sh">
        <h2 className="h2 tape">{t("mc.folder")}</h2>
      </div>
      <div className="panel folder">
        <span className="fi mc">
          <img src={grass} alt="" />
        </span>
        <div className="fp">
          <span className="lbl">{t("s5.mod.folder")}</span>
          <b>
            {dir ? (
              <>
                {dir.slice(0, cut)}
                <em>{dir.slice(cut)}</em>
              </>
            ) : (
              t("mc.noDir")
            )}
          </b>
        </div>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const d = await api.pickFolder(t("mc.pick"));
            if (d) setMcDir(d);
          }}
        >
          <I n="file" />
          {t("s5.mod.changeFolder")}
        </button>
        <div className="fs">
          {status && (
            <span className={`st${status.dirExists && status.optifineFile ? " ok" : ""}`}>
              <i className={`d${status.dirExists && status.optifineFile ? "" : " no"}`} />
              {status.dirExists ? t(status.optifineFile ? "mc.optifineOk" : "mc.optifineNo") : t("mc.noDir")}
            </span>
          )}
          {status && status.backups > 0 && (
            <>
              <span className="st">
                <b>{status.backups}</b> {t("mc.backups", { n: status.backups }).replace(/^\d+\s/, "")}
              </span>
              <button
                type="button"
                className="lnk"
                onClick={async () => {
                  // le moteur répond en anglais : on affiche nos textes, l'erreur système (dans la langue de Windows) en détail
                  try {
                    await api.minecraftRestore(mcDir);
                    setMsg(t("mc.restored"));
                  } catch (e) {
                    setMsg(String(e) === "No Rago backup found" ? t("mc.noBackup") : t("mc.restoreFailed", { error: String(e) }));
                  }
                  void refresh();
                }}
              >
                <I n="undo" />
                {t("mc.restore").toLowerCase()}
              </button>
            </>
          )}
          {msg && <span className="msg">{msg}</span>}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- RBW Mod : ce que lit le vérificateur */
const RBW_STATE: Record<RbwCheck["state"], Key> = {
  running: "rbw.state.running",
  stopped: "rbw.state.stopped",
  starting: "rbw.state.starting",
  stopping: "rbw.state.stopping",
  paused: "rbw.state.paused",
  missing: "rbw.state.missing",
  on: "rbw.state.on",
  off: "rbw.state.off",
};
const RBW_START: Record<NonNullable<RbwCheck["start"]>, Key> = {
  auto: "rbw.start.auto",
  manual: "rbw.start.manual",
  disabled: "rbw.start.disabled",
  boot: "rbw.start.system",
  system: "rbw.start.system",
};

function RbwPanel({ checks, loading, refresh }: ReturnType<typeof useRbw>) {
  const { t, lang, run, lastRun, requestApplyEntries, setVariant, requestApply, setUpsell, variantLocked } = useStore();
  const services = checks?.filter((c) => c.kind === "service") ?? [];
  const settings = checks?.filter((c) => c.kind === "setting") ?? [];
  const red = checks?.filter((c) => !c.ok).length ?? 0;
  const last = lastRun.get("rbw_mode");
  const state = last?.ok && last.variant ? last.variant : null;
  const on = state === "on" && checks != null && red === 0;
  const cell = (c: RbwCheck) => (
    <div key={c.name} className={`ck${c.ok ? "" : " bad"}`}>
      {/* service par utilisateur (CDPUserSvc_4f1a2) : le nom sans son suffixe */}
      <b>{c.name.replace(/_[0-9a-f]{4,}$/i, "")}</b>
      <span>{t(RBW_STATE[c.state])}</span>
      {c.start && <small>{t(RBW_START[c.start])}</small>}
    </div>
  );
  return (
    <section className="msec rbw first">
      <div className="panel verdict">
        <div className="vt">
          <span className="lbl">
            {t("rbw.title")}
            {state && last && (
              <>
                {" "}
                <b>//</b> {t(state === "on" ? "s5.rbw.onSince" : "s5.rbw.offSince", { time: clock(lang, last.ts) })}
              </>
            )}
          </span>
          <h3>{checks == null ? t("rbw.reading") : red ? t("rbw.red", { n: red }) : t("rbw.ready")}</h3>
          <p>{t(red || checks == null ? "s5.rbw.lead" : "rbw.readyLead")}</p>
        </div>
        <div className="va">
          <button type="button" className="ic" aria-label={t("rbw.refresh")} title={t("rbw.refresh")} onClick={() => void refresh()}>
            <I n="refresh" className={loading ? "spin" : undefined} />
          </button>
          {on ? (
            <button
              type="button"
              className="btn lg"
              disabled={!!run}
              onClick={() => {
                if (variantLocked("rbw_mode", "off")) return setUpsell("tweak", "rbw_mode");
                setVariant("rbw_mode", "off");
                requestApply(["rbw_mode"]);
              }}
            >
              <I n="power" />
              {t("s5.rbw.turnOff")}
            </button>
          ) : (
            <button
              type="button"
              className="btn red lg"
              disabled={!!run}
              // relancé même s'il est déjà « Activé » : Windows ou un autre programme a pu recouper un service depuis
              onClick={() => !requestApplyEntries(["rbw_mode:on"], { title: t("rbw.fixTitle"), lead: t("rbw.fixLead") }, true) && setUpsell("tweak", "rbw_mode")}
            >
              <I n="power" />
              {t("s5.rbw.turnOn")}
            </button>
          )}
        </div>
      </div>
      {services.length > 0 && (
        <>
          <div className="sh">
            <h2 className="h2 tape">{t("s5.rbw.services")}</h2>
            <span className="cnt">
              {services.filter((c) => c.ok).length}
              <small> / {t("s5.rbw.running", { n: services.length })}</small>
            </span>
          </div>
          <div className="ckgrid">{services.map(cell)}</div>
        </>
      )}
      {settings.length > 0 && (
        <>
          <div className="sh s2">
            <h2 className="h2 tape">{t("s5.rbw.settings")}</h2>
            <span className="cnt">
              {settings.filter((c) => c.ok).length}
              <small> / {t("s5.rbw.on", { n: settings.length })}</small>
            </span>
          </div>
          <div className="ckgrid c3">{settings.map(cell)}</div>
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Mode jeu : ce qui est coupé pendant la partie */
/** Ce que fait « Activé » (game_mode dans le catalogue) ; `paused` : seulement jusqu'au prochain redémarrage. */
const GM_LIST: { k: Key; paused?: boolean }[] = [
  { k: "s5.gm.l1" },
  { k: "s5.gm.l2", paused: true },
  { k: "s5.gm.l3", paused: true },
  { k: "s5.gm.l4" },
  { k: "s5.gm.l5" },
  { k: "s5.gm.l6" },
  { k: "s5.gm.l7" },
];

function GameModePanel() {
  const { t, lang, run, lastRun, setVariant, requestApply, variantLocked, setUpsell } = useStore();
  const last = lastRun.get("game_mode");
  const on = !!last?.ok && last.variant === "on";
  const go = (v: "on" | "off") => {
    if (variantLocked("game_mode", v)) return setUpsell("tweak", "game_mode");
    setVariant("game_mode", v);
    requestApply(["game_mode"]);
  };
  return (
    <section className="msec gm">
      <div className="panel gmp">
        <div className="gl1">
          <span className="lbl">{t("s5.gm.now")}</span>
          <h3>{t(on ? "s5.gm.isOn" : "s5.gm.isOff")}</h3>
          <p>{on ? t("s5.gm.leadOn", { time: clock(lang, last!.ts) }) : t("s5.gm.leadOff")}</p>
          <div className="gst">
            <div>
              <b>{on ? GM_LIST.length : 0}</b>
              <span className="lbl">{t("s5.gm.changesOn")}</span>
            </div>
            <div>
              <b>{GM_LIST.filter((x) => x.paused).length}</b>
              <span className="lbl">{t("s5.gm.paused")}</span>
            </div>
          </div>
          <div className="gb">
            {on ? (
              <button type="button" className="btn lg" disabled={!!run} onClick={() => go("off")}>
                <I n="power" />
                {t("session.turnOff")}
              </button>
            ) : (
              <button type="button" className="btn red lg" disabled={!!run} onClick={() => go("on")}>
                <I n={variantLocked("game_mode", "on") ? "lock" : "power"} />
                {t("session.turnOn")}
              </button>
            )}
            <span className="sub">{t(on ? "s5.gm.orRestart" : "s5.gm.noRestart")}</span>
          </div>
        </div>
        <ul className="gl2">
          {GM_LIST.map((x) => (
            <li key={x.k}>
              <I n="check" />
              {t(x.k)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Restauration : l'historique */
function History() {
  const { t, lang, history, refreshHistory } = useStore();
  const items = useMemo(() => [...history].sort((a, b) => b.ts - a.ts).slice(0, 80), [history]);
  const today = t("s5.today");
  const yesterday = t("s5.yesterday");
  return (
    <section className="msec hist">
      <div className="sh">
        <h2 className="h2 tape">{t("restore.history")}</h2>
        <span className="cnt">
          {history.length}
          <small> {t("s5.rst.changes", { n: history.length }).replace(/^\d+\s/, "")}</small>
        </span>
        {history.length > 0 && (
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              await api.clearHistory();
              void refreshHistory();
            }}
          >
            <I n="trash" />
            {t("restore.clear")}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="panel hl hemp">
          <span className="hic">
            <I n="undo" />
          </span>
          <p>{t("restore.historyEmpty")}</p>
        </div>
      ) : (
        <ul className="panel hl">
          {items.map((h, i) => {
            const tw = tweaks.get(h.id);
            // annulation : « Annuler · Nom », sans la variante (celle qu'on a défaite se lirait comme celle appliquée)
            const v = h.undo ? undefined : tw?.variants?.find((x) => x.id === h.variant)?.label[lang];
            return (
              <li key={`${h.ts}-${i}`} className={h.ok ? undefined : "bad"}>
                <i className="d" />
                <b>{h.undo ? t("run.undoName", { name: itemName(h.id, lang) }) : itemName(h.id, lang)}</b>
                {v && <em>{v}</em>}
                {!h.ok && <span className="fl">{t("s5.rst.failed")}</span>}
                <time>{dayTime(lang, h.ts, today, yesterday)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- une section de réglages */
function ModSection({
  s,
  mod,
  single,
  folded,
  onFold,
  advOpen,
  onAdv,
  blocked,
}: {
  s: Section;
  mod: string;
  single: boolean;
  folded: boolean;
  onFold: () => void;
  advOpen: boolean;
  onAdv: (open: boolean) => void;
  blocked: string | null;
}) {
  const { t, lang, applied, pendingUndo } = useStore();
  const list = sectionTweaks(s);
  const sw = list.filter(isSwitch);
  const nOn = sw.filter((tw) => applied.has(tw.id) && !pendingUndo.includes(tw.id)).length;
  const adv = list.filter((tw) => tw.risk === "advanced");
  const reg = list.filter((tw) => tw.risk !== "advanced");
  const name = lang === "en" ? s.name.en.replace(/ and /g, " & ") : s.name[lang];
  return (
    <section className={`msec${folded ? " folded" : ""}`} id={`sec-${s.id}`}>
      <div className="sh">
        <h2 className="h2 tape">{name}</h2>
        {sw.length > 0 && sw.length * 2 > list.length && (
          <span className="cnt">
            {nOn}
            <small> / {sw.length}</small>
          </span>
        )}
        {blocked && (
          <span className="tg">
            <I n="info" />
            {blocked}
          </span>
        )}
        {!single && (
          <button type="button" className="fold" aria-expanded={!folded} onClick={onFold}>
            {t(folded ? "module.show" : "module.hide")}
            <I n="chev" />
          </button>
        )}
      </div>
      {!folded && (
        <div className="tgrid">
          {reg.map((tw) => (
            <TweakRow key={tw.id} tweak={tw} mod={mod} />
          ))}
          {adv.length > 0 &&
            (advOpen ? (
              <>
                <div className="advh">
                  {t("s5.mod.advanced")}
                  <em>{adv.length}</em>
                  <small>{t("s5.mod.advLead")}</small>
                  <i className="ln" />
                  <button type="button" className="hd" onClick={() => onAdv(false)}>
                    {t("module.hide")}
                    <I n="chev" />
                  </button>
                </div>
                {adv.map((tw) => (
                  <TweakRow key={tw.id} tweak={tw} mod={mod} adv />
                ))}
              </>
            ) : (
              <button type="button" className="tw adv" aria-expanded={false} onClick={() => onAdv(true)}>
                <span className="nm">{t("s5.mod.advanced")}</span>
                <em>{adv.length}</em>
                <I n="chev" className="chev" />
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

/** Section sans objet sur ce PC (pas de carte AMD…) : le texte du blocage, sinon null. */
function sectionBlock(s: Section, sys: ReturnType<typeof useStore>["sys"], t: ReturnType<typeof useStore>["t"]): string | null {
  if (!s.requires) return null;
  const av = availability({ requires: [s.requires] } as Tweak, sys);
  return av.ok || !av.block ? null : t(`block.${av.block}` as Key);
}

/** `embedded` : dans un onglet (Réseau), sous le titre de la page qui l'accueille. */
export function ModulePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { t, lang, sys, selected, selectMany, isLocked, undoOnly, premium, setUpsell, focusTweak, focusSeq, isOn, applied, pendingUndo, lastRun, history } = useStore();
  const mod = catalog.modules.find((m) => m.id === id)!;
  const secs = mod.sections.filter((s) => sectionTweaks(s).length > 0);
  const single = secs.length === 1;
  const own = secs.flatMap((s) => sectionTweaks(s)).filter(isSwitch);
  const onNow = (tw: Tweak) => applied.has(tw.id) && !pendingUndo.includes(tw.id);
  const safe = own.filter((tw) => tw.risk === "safe" && availability(tw, sys).ok && !tw.confirm && !isLocked(tw.id) && !undoOnly(tw.id)).map((tw) => tw.id);
  const blocks = useMemo(() => new Map(secs.map((s) => [s.id, sectionBlock(s, sys, t)])), [secs, sys, t]);

  // sections repliées (sans objet sur ce PC : repliées d'office), avancés dépliés
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const [advOpen, setAdvOpen] = useState<Set<string>>(() => new Set());
  const [cur, setCur] = useState<string | null>(null);
  useEffect(() => {
    setFolded(new Set(secs.filter((s) => blocks.get(s.id)).map((s) => s.id)));
    setAdvOpen(new Set());
    setCur(secs[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sys]);
  const setIn = (set: React.Dispatch<React.SetStateAction<Set<string>>>, sid: string, inside: boolean) =>
    set((f) => {
      if (f.has(sid) === inside) return f;
      const n = new Set(f);
      if (inside) n.add(sid);
      else n.delete(sid);
      return n;
    });

  // recherche (Ctrl+K) vers un réglage d'une section repliée ou des avancés : on les ouvre pour que le carreau se montre
  useEffect(() => {
    if (!focusTweak) return;
    const sec = secs.find((s) => sectionTweaks(s).some((tw) => tw.id === focusTweak));
    if (!sec) return;
    setIn(setFolded, sec.id, false);
    if (tweaks.get(focusTweak)?.risk === "advanced") setIn(setAdvOpen, sec.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTweak, focusSeq, id]);

  // sommaire : suit la section à l'écran
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = root.current?.closest(".main");
    if (!main || single) return;
    let raf = 0;
    const spy = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = main.getBoundingClientRect().top + 140;
        let at = secs[0]?.id ?? null;
        for (const s of secs) {
          const el = document.getElementById(`sec-${s.id}`);
          if (el && el.getBoundingClientRect().top <= top) at = s.id;
        }
        // en bas de la page : la dernière section, même courte
        if (main.scrollTop > 0 && main.scrollTop + main.clientHeight >= main.scrollHeight - 4) at = secs[secs.length - 1]?.id ?? at;
        setCur(at);
      });
    };
    main.addEventListener("scroll", spy, { passive: true });
    return () => {
      main.removeEventListener("scroll", spy);
      cancelAnimationFrame(raf);
    };
  }, [id, single, secs]);
  const jump = (sid: string) => {
    setIn(setFolded, sid, false);
    setCur(sid);
    requestAnimationFrame(() => document.getElementById(`sec-${sid}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const rbw = id === "rbw";
  const rbwState = useRbw(rbw);
  const name = mod.name[lang].toLowerCase();
  const tag = mod.tagline[lang].replace(/\.$/, "").toLowerCase();

  // bloc signature : un trait par réglage, groupé par section (RBW : un par élément lu ; Mode jeu : un par changement ;
  // Restauration : les derniers passages)
  let sig: React.ReactNode;
  if (rbw) {
    const c = rbwState.checks ?? [];
    sig = <Sig value={c.filter((x) => !x.ok).length} unit={t("s5.rbw.red")} small={t("s5.rbw.atSs")} ticks={[c.length ? c.map((x) => (x.ok ? "on" : "")) : Array(18).fill("")]} />;
  } else if (id === "gamemode") {
    const last = lastRun.get("game_mode");
    const on = !!last?.ok && last.variant === "on";
    sig = (
      <Sig
        sess
        value={t(on ? "s5.mod.on" : "s5.mod.off")}
        unit={
          last?.ok ? (
            <>
              {t("s5.gm.since")}
              <br />
              {clock(lang, last.ts)}
            </>
          ) : (
            t("s5.gm.never")
          )
        }
        ticks={[GM_LIST.map(() => (on ? "on" : ""))]}
      />
    );
  } else if (id === "restore") {
    const pt = history.reduce<number | null>((m, e) => (e.id === "rst_point" && e.ok && !e.undo && (m == null || e.ts > m) ? e.ts : m), null);
    const recent = [...history].sort((a, b) => b.ts - a.ts).slice(0, 9);
    const ticks = [Array.from({ length: 9 }, (_, i) => (recent[i]?.ok ? "on" : ""))];
    if (pt != null) {
      const [d, ...m] = dayMonth(lang, pt).split(" ");
      sig = <Sig value={d} unit={m.join(" ").replace(/\.$/, "")} small={t("s5.rst.lastPoint")} ticks={ticks} />;
    } else
      sig = (
        <Sig
          value={history.length}
          unit={t("s5.rst.changes", { n: history.length }).replace(/^\d+\s/, "")}
          small={t(history.length ? "s5.rst.inHistory" : "s5.rst.nothing")}
          ticks={ticks}
        />
      );
  } else {
    sig = (
      <Sig
        value={own.filter(onNow).length}
        unit={`/ ${own.length}`}
        small={t("module.on")}
        ticks={secs.map((s) => sectionTweaks(s).filter(isSwitch).map((tw) => (onNow(tw) ? "on" : selected.has(tw.id) ? "pd" : ""))).filter((g) => g.length)}
      />
    );
  }

  const noSections = rbw || id === "gamemode";
  const allSafeOn = safe.every((x) => isOn(x));

  return (
    <div ref={root} className={`pg-mod${embedded ? " embed" : " is-page"}`} data-mod={id}>
      {!embedded && (
        <section className="head">
          <div>
            <p className="kick">
              {name} <b>//</b> {tag}
            </p>
            <h1 className="title" data-t={name} style={{ fontSize: titleSize(name) }}>
              {name}
            </h1>
          </div>
          {sig}
        </section>
      )}

      {single || noSections ? (
        <div className="nobar" />
      ) : (
        <div className="bar">
          <div className="tabs idx" role="tablist" aria-label={t("module.sections")}>
            {secs.map((s) => {
              const list = sectionTweaks(s);
              const sw = list.filter(isSwitch);
              const k = sw.filter(onNow).length;
              const off = !!blocks.get(s.id);
              const go = () => jump(s.id);
              return (
                <span
                  key={s.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={cur === s.id}
                  className={cur === s.id ? "on" : off ? "off" : undefined}
                  onClick={go}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go())}
                >
                  {lang === "en" ? s.name.en.replace(/ and /g, " & ") : s.name[lang]}{" "}
                  <em>
                    {sw.length ? (
                      <>
                        <b>{k}</b>/{sw.length}
                      </>
                    ) : (
                      list.length
                    )}
                  </em>
                </span>
              );
            })}
          </div>
          {!premium && safe.length === 0 ? (
            <button type="button" className="btn sm" onClick={() => setUpsell("plan")}>
              <I n="lock" />
              {t("free.lock")}
            </button>
          ) : (
            <button type="button" className="btn sm" disabled={allSafeOn} onClick={() => selectMany(safe)}>
              <I n="check" />
              {t("s5.mod.selectSafe")}
            </button>
          )}
        </div>
      )}

      {id === "minecraft" && <MinecraftFolder />}
      {rbw && <RbwPanel {...rbwState} />}
      {id === "gamemode" && <GameModePanel />}

      {!noSections &&
        secs.map((s) => (
          <ModSection
            key={s.id}
            s={s}
            mod={id}
            single={single}
            folded={folded.has(s.id)}
            onFold={() => setIn(setFolded, s.id, !folded.has(s.id))}
            advOpen={advOpen.has(s.id)}
            onAdv={(open) => setIn(setAdvOpen, s.id, open)}
            blocked={blocks.get(s.id) ?? null}
          />
        ))}

      {id === "restore" && <History />}
    </div>
  );
}

/** Ce que lit le vérificateur RBW, relu toutes les 5 secondes et après chaque lot ; seulement sur la page RBW Mod (le
 * hook reste appelé sur chaque page module, dans le même ordre). */
function useRbw(on: boolean) {
  const [checks, setChecks] = useState<RbwCheck[] | null>(null);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setChecks(await api.rbwStatus());
    } catch {
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!on) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    const sub = api.onDone(() => void refresh());
    return () => {
      window.clearInterval(timer);
      void sub.then((un) => un());
    };
  }, [on, refresh]);
  return { checks: on ? checks : null, loading, refresh };
}
