// Page Souris, à l'identique de la maquette v5 app-mouse.html : vraie fréquence, doubles clics d'un bouton usé,
// logiciels entre la souris et le jeu, calcul de la sensibilité. Rien ne touche au jeu : la fréquence et les clics sont
// lus dans la fenêtre de Rago (pointerrawupdate et getCoalescedEvents de Chromium, comme les sites de test de souris),
// les logiciels sont seulement listés (mouse.rs), la sensibilité n'est qu'un calcul. Le réglage « Souris 1:1 » reste
// celui de Latence (`kbm_1to1`). Styles : s5/pages/module.css (socle) et s5/pages/pages.css (porté de
// rendus-v5/src/pages.css, commun à Souris, Paramètres et Partage), retouches dans s5/app.css.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { api, type MouseApp } from "../lib/api";
import { useStore } from "../lib/store";
import { I } from "../s5/I";

type Tr = (en: string, fr: string) => string;

/** Degrés tournés par point de souris à la sensibilité 1 (valeurs publiques des moteurs des jeux). */
const YAW: Record<string, { label: string; yaw: number }> = {
  valorant: { label: "Valorant", yaw: 0.07 },
  cs2: { label: "CS2", yaw: 0.022 },
  apex: { label: "Apex Legends", yaw: 0.022 },
  ow2: { label: "Overwatch 2", yaw: 0.0066 },
  r6: { label: "Rainbow Six Siege", yaw: 0.00572958 },
};

/** Écarts gardés pour la mesure, et nombre minimum avant d'afficher un résultat. */
const KEEP = 1000;
const MIN_SAMPLES = 300;
/** Un écart plus long est une pause de la main, pas un rapport de la souris (125 Hz = 8 ms). */
const PAUSE_MS = 12;
/** Deux appuis plus proches que ça, pendant des clics lents, viennent d'un bouton qui rebondit. */
const BOUNCE_MS = 40;
const CLICKS = 20;
/** Barres de la zone de mesure et coches de l'en-tête, comme la maquette. */
const BARS = 64;
const TICKS = 40;

const titleSize = (name: string) => (name.length <= 8 ? 150 : Math.floor((150 * 8.4) / name.length));

export function Mouse() {
  const { lang } = useStore();
  const L: Tr = (en, fr) => (lang === "fr" ? fr : en);
  const [rate, setRate] = useState<Rate | null>(null);
  const v = rate ? verdictOf(rate, L) : null;
  const title = L("mouse", "souris");

  // en-tête : les 40 derniers écarts, hauts quand l'écart sort du rythme (maquette : 42 % au rythme, 100 % au pic)
  const ticks = rate ? rate.last.slice(-TICKS).map((g) => Math.max(20, Math.min(100, Math.round((g / rate.median) * 42)))) : null;
  return (
    <div className="pg-mod pg-pages pg-mouse is-page">
      <section className="head">
        <div>
          <p className="kick">
            {L("check your mouse", "vérifie ta souris")} <b>//</b> {L("measured in this window only, nothing touches your game", "mesuré dans cette fenêtre seulement, rien ne touche à ton jeu")}
          </p>
          <h1 className="title" data-t={title} style={{ fontSize: titleSize(title) }}>
            {title}
          </h1>
        </div>
        <div className="ping sig">
          <div className="pv">
            <b>{rate ? rate.hz : "–"}</b>
            <span>
              hz<small>{v ? `${L("polling rate", "fréquence")}, ${v.tag}` : L("polling rate", "fréquence")}</small>
            </span>
          </div>
          <div className="ticks">
            <span className="g" style={{ "--n": TICKS } as CSSProperties}>
              {(ticks ?? Array<number>(TICKS).fill(0)).map((h, i) => (
                <i key={i} className={ticks ? "on" : undefined} style={ticks ? { height: `${h}%` } : undefined} />
              ))}
            </span>
          </div>
        </div>
      </section>
      <div className="nobar" />

      <div className="mgrid">
        <PollingTest L={L} rate={rate} onRate={setRate} />
        <ClickTest L={L} />
        <Apps L={L} />
        <Sensitivity L={L} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- fréquence

interface Rate {
  hz: number;
  /** part des rapports à moins de 25 % de l'écart médian, en % */
  steady: number;
  /** plus long écart hors pauses, en ms */
  worst: number;
  median: number;
  /** derniers écarts, pour les barres */
  last: number[];
}

/** Mesure à partir des écarts entre rapports de la souris (en ms), pauses de la main retirées. */
function rateOf(gaps: number[]): Rate | null {
  const g = gaps.filter((x) => x > 0 && x < PAUSE_MS);
  if (g.length < MIN_SAMPLES) return null;
  const sorted = [...g].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = g.reduce((a, b) => a + b, 0) / g.length;
  const steady = Math.round((g.filter((x) => Math.abs(x - median) <= median * 0.25).length / g.length) * 100);
  return { hz: Math.round(1000 / avg), steady, worst: sorted[sorted.length - 1], median, last: g.slice(-BARS) };
}

/** Verdict de la fréquence : étiquette (« good »), mauvais ou non, et le conseil. */
function verdictOf(rate: Rate, L: Tr) {
  if (rate.hz < 200)
    return {
      bad: true,
      tag: L("low", "basse"),
      text: L(
        `Only ${rate.hz} Hz: your mouse reports 8 times less often than a gaming mouse. Set 1000 Hz in its software, plug it straight into the PC (not a hub or the screen), and put the wireless dongle close to the mouse.`,
        `Seulement ${rate.hz} Hz : ta souris envoie 8 fois moins de rapports qu'une souris gaming. Règle 1000 Hz dans son logiciel, branche-la directement sur le PC (pas un hub ni l'écran), et rapproche le dongle sans fil.`,
      ),
    };
  if (rate.hz < 700)
    return {
      bad: false,
      tag: L("fine", "correcte"),
      text: L(
        `About ${rate.hz} Hz. Fine to play; 1000 Hz in your mouse software makes each move reach the PC a little sooner.`,
        `Environ ${rate.hz} Hz. Ça suffit pour jouer ; 1000 Hz dans le logiciel de ta souris font arriver chaque mouvement un peu plus tôt.`,
      ),
    };
  if (rate.hz < 1600)
    return {
      bad: false,
      tag: L("good", "bonne"),
      text: L(
        `About ${rate.hz} Hz: the sweet spot. 4000 or 8000 Hz cost CPU time and can cause stutters in some games.`,
        `Environ ${rate.hz} Hz : le bon réglage. 4000 ou 8000 Hz prennent du processeur et font saccader certains jeux.`,
      ),
    };
  return {
    bad: false,
    tag: L("very high", "très haute"),
    text: L(
      `About ${rate.hz} Hz. If your game stutters or your FPS drops, try 1000 Hz in your mouse software.`,
      `Environ ${rate.hz} Hz. Si ton jeu saccade ou perd des FPS, essaie 1000 Hz dans le logiciel de ta souris.`,
    ),
  };
}

function PollingTest({ L, rate, onRate }: { L: Tr; rate: Rate | null; onRate: (r: Rate) => void }) {
  const { lang } = useStore();
  const zone = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const set = useRef(onRate);
  set.current = onRate;
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    let last = 0;
    const gaps: number[] = [];
    let frame = 0;
    const on = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType !== "mouse") return;
      const list = pe.getCoalescedEvents?.() ?? [];
      for (const c of list.length ? list : [pe]) {
        if (last) gaps.push(c.timeStamp - last);
        last = c.timeStamp;
      }
      if (gaps.length > KEEP) gaps.splice(0, gaps.length - KEEP);
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          setCount(gaps.filter((x) => x > 0 && x < PAUSE_MS).length);
          const r = rateOf(gaps);
          if (r) set.current(r);
        });
    };
    const leave = () => (last = 0);
    // pointerrawupdate : chaque rapport de la souris ; pointermove (une fois par image) si le moteur ne le connaît pas
    const type = "onpointerrawupdate" in el ? "pointerrawupdate" : "pointermove";
    el.addEventListener(type, on);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener(type, on);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  const v = rate ? verdictOf(rate, L) : null;
  const num = (n: number, d: number) => n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  // avant le résultat, les barres se remplissent avec la mesure
  const filled = Math.round(Math.min(1, count / MIN_SAMPLES) * BARS);
  const bars = rate
    ? rate.last.map((g) => ({ h: Math.min(1, (g / rate.median) * 0.7), pk: g > rate.median * 1.15 }))
    : Array.from({ length: BARS }, (_, i) => ({ h: i < filled ? 0.7 : 0.12, pk: false }));

  return (
    <section>
      <div className="sh">
        <h2 className="h2 tape">{L("polling rate", "fréquence")}</h2>
        {v && <span className={`vt2 ${v.bad ? "bad" : "ok"}`}>{v.tag}</span>}
      </div>
      <div ref={zone} className="panel zone">
        <div className="zm">
          <div className="big">
            {rate ? rate.hz : "–"}
            <small>hz</small>
            <span>{L("average", "en moyenne")}</span>
          </div>
          <div className="mid">
            {rate ? rate.steady : "–"}
            <small>%</small>
            <span>{L("regularity", "régularité")}</span>
          </div>
          <div className="mid">
            {rate ? num(rate.worst, 2) : "–"}
            <small>ms</small>
            <span>{L("longest gap", "plus long écart")}</span>
          </div>
        </div>
        {/* le verdict reste dans la carte : les deux cartes de la rangée gardent la même hauteur (25/11) */}
        {v && <p className="verdict2 inner">{v.text}</p>}
        <div className="zs">
          {bars.map((b, i) => (
            <i key={i} className={b.pk ? "pk" : undefined} style={{ "--h": b.h.toFixed(2) } as CSSProperties} />
          ))}
        </div>
        <p className="zh">
          <I n="mouse" />
          {L("Move your mouse in fast circles here", "Fais des cercles rapides avec ta souris ici")}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- doubles clics

function ClickTest({ L }: { L: Tr }) {
  // chaque appui gardé : true si c'est un rebond (trop près du précédent)
  const [presses, setPresses] = useState<boolean[]>([]);
  const [gaps, setGaps] = useState<number[]>([]);
  const lastDown = useRef(0);
  const clicks = presses.filter((b) => !b).length;
  const bounces = gaps.length;
  const done = clicks >= CLICKS;

  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0 || done) return;
    const gap = e.timeStamp - lastDown.current;
    lastDown.current = e.timeStamp;
    const bounce = lastDown.current > 0 && gap > 0 && gap < BOUNCE_MS && presses.length > 0;
    setPresses((p) => [...p, bounce]);
    if (bounce) setGaps((g) => [...g, Math.round(gap)]);
  };
  const reset = () => {
    setPresses([]);
    setGaps([]);
    lastDown.current = 0;
  };
  // une case par clic voulu (« c ») ; elle passe en rouge (« b ») si ce clic a rebondi
  const dots: string[] = [];
  presses.forEach((bounce) => {
    if (!bounce) dots.push("c");
    else if (dots.length) dots[dots.length - 1] = "b";
  });
  while (dots.length < CLICKS) dots.push("");
  const again = (
    <button type="button" className="btn" onClick={reset}>
      <I n="rotate" />
      {L("start again", "recommencer")}
    </button>
  );

  return (
    <section>
      <div className="sh">
        <h2 className="h2 tape">{L("double-click check", "test de double clic")}</h2>
        {done && (
          <span className={`vt2 ${bounces ? "bad" : "ok"}`}>
            {bounces
              ? L(`${bounces} double click${bounces > 1 ? "s" : ""}`, `${bounces} double${bounces > 1 ? "s" : ""} clic${bounces > 1 ? "s" : ""}`)
              : L("no double click", "aucun double clic")}
          </span>
        )}
        {!done && presses.length > 0 && (
          <button type="button" className="lnk" onClick={reset}>
            {L("start again", "recommencer")}
            <I n="rotate" />
          </button>
        )}
      </div>
      <button type="button" className="panel pad" onPointerDown={down} onContextMenu={(e) => e.preventDefault()}>
        <span className="pc2">
          <b>{Math.min(clicks, CLICKS)}</b>
          <small>/{CLICKS}</small>
        </span>
        <span className="dots">
          {dots.slice(0, CLICKS).map((c, i) => (
            <i key={i} className={c || undefined} />
          ))}
        </span>
        <span className="zh">{L(`Click ${CLICKS} times, slowly, with the left button.`, `Clique ${CLICKS} fois, lentement, avec le bouton gauche.`)}</span>
      </button>
      {done && bounces > 0 && (
        <div className="alert2">
          <I n="alert" />
          <p>
            <b>{L(`${bounces} click${bounces > 1 ? "s were" : " was"} counted twice`, `${bounces} clic${bounces > 1 ? "s comptés" : " compté"} deux fois`)}</b> (
            {gaps.join(", ")} ms).{" "}
            {L(
              "Your left switch is starting to wear out. Raise the debounce time a little in your mouse software (Logitech G HUB, Razer Synapse…), or change the switch.",
              "Le bouton gauche commence à s'user. Monte un peu le « debounce » dans le logiciel de ta souris (Logitech G HUB, Razer Synapse…), ou change le switch.",
            )}
          </p>
          {again}
        </div>
      )}
      {done && bounces === 0 && (
        <div className="alert2 ok">
          <I n="check" />
          <p>{L("Every click counted once: your left button is fine.", "Chaque clic compté une fois : ton bouton gauche va bien.")}</p>
          {again}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- logiciels

function Apps({ L }: { L: Tr }) {
  const { goTo, isOn } = useStore();
  const [apps, setApps] = useState<MouseApp[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setBusy(true);
    api
      .mouseApps()
      .then(setApps)
      .catch(() => setApps([]))
      .finally(() => setBusy(false));
  }, []);
  useEffect(load, [load]);
  const oneToOne = ["kbm_1to1", "kbm_accel", "kbm_panel", "in_mouse"].some(isOn);

  const about = (a: MouseApp) =>
    a.kind === "remap"
      ? L(
          "Catches every move and click across Windows to remap buttons. Its repeated or simulated keys count as macros (Riot, Hypixel). Close it before ranked games.",
          "Intercepte chaque mouvement et clic de Windows pour remapper les boutons. Ses touches répétées ou simulées comptent comme des macros (Riot, Hypixel). Ferme-le avant une partie classée.",
        )
      : a.kind === "script"
        ? L("A script is running. Scripts that press keys for you can get you banned.", "Un script tourne. Un script qui appuie à ta place peut te faire bannir.")
        : a.kind === "autoclick"
          ? L("Clicks for you: banned in competitive games.", "Clique à ta place : interdit dans les jeux compétitifs.")
          : L(
              "Your mouse's own software. Keep it: your DPI, polling rate and debounce live in it.",
              "Le logiciel de ta souris. Garde-le : ton DPI, ta fréquence et ton anti-rebond y sont réglés.",
            );

  return (
    <section>
      <div className="sh">
        <h2 className="h2 tape">{L("mouse software", "logiciels de la souris")}</h2>
        <button type="button" className="btn" disabled={busy} onClick={load}>
          <I n={busy ? "loader" : "refresh"} className={busy ? "spin" : undefined} />
          {L("check again", "revérifier")}
        </button>
      </div>
      <div className="panel lst2">
        {apps && apps.length === 0 && (
          <div className="li2">
            <div className="l">
              <b>{L("all clear", "rien à signaler")}</b>
              <span>{L("No remapping, macro or auto-click software running.", "Aucun logiciel de remappage, de macro ou de clic automatique lancé.")}</span>
            </div>
            <span className="vt2 ok">{L("fine", "ok")}</span>
          </div>
        )}
        {(apps ?? []).map((a) => (
          <div key={a.name} className={`li2${a.kind === "vendor" ? "" : " risk"}`}>
            <div className="l">
              <b>{a.name}</b>
              <span>{about(a)}</span>
            </div>
            <span className={`vt2 ${a.kind === "vendor" ? "ok" : "bad"}`}>{a.kind === "vendor" ? L("fine", "ok") : L("risky in ranked", "risqué en classé")}</span>
          </div>
        ))}
        <div className="li2 one">
          <div className="l">
            <b>{L("1:1 mouse", "souris 1:1")}</b>
            <span>
              {L(
                "Windows acceleration off, pointer speed 6/11: the same hand move always gives the same distance. Matters in games without raw input, like Minecraft.",
                "Accélération de Windows coupée, vitesse 6/11 : le même geste donne toujours la même distance. Compte dans les jeux sans raw input, comme Minecraft.",
              )}
            </span>
          </div>
          <span className={`sst${oneToOne ? " is-on" : ""}`}>
            <i />
            {oneToOne ? L("on", "activée") : L("off", "coupée")}
          </span>
          <button type="button" className="lnk" onClick={() => goTo("latency", "kbm_1to1")}>
            {L("latency", "latence")}
            <I n="right" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- sensibilité

function GameSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <span className="in sel">
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(YAW).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </select>
      <I n="chev" />
    </span>
  );
}

function Sensitivity({ L }: { L: Tr }) {
  const { lang } = useStore();
  const [dpi, setDpi] = useState(800);
  const [sens, setSens] = useState(0.35);
  const [from, setFrom] = useState("valorant");
  const [to, setTo] = useState("cs2");
  const ok = dpi > 0 && sens > 0;
  const num = (v: number, d: number) => v.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const cm = ok ? (360 / (dpi * sens * YAW[from].yaw)) * 2.54 : 0;
  const converted = (sens * YAW[from].yaw) / YAW[to].yaw;

  return (
    <section>
      <div className="sh">
        <h2 className="h2 tape">{L("sensitivity", "sensibilité")}</h2>
      </div>
      <div className="panel sens">
        <div className="inp">
          <label>
            dpi
            <span className="in">
              <input type="number" min={1} value={dpi || ""} onChange={(e) => setDpi(+e.target.value || 0)} />
            </span>
          </label>
          <label>
            {L("in-game sens", "sensi en jeu")}
            <span className="in">
              <input type="number" min={0} step="0.01" value={sens || ""} onChange={(e) => setSens(+e.target.value || 0)} />
            </span>
          </label>
          <label>
            {L("game", "jeu")}
            <GameSelect value={from} onChange={setFrom} label={L("game", "jeu")} />
          </label>
        </div>
        <div className="out">
          <div className="big">
            {ok ? num(dpi * sens, 0) : "–"}
            <span>edpi</span>
          </div>
          <div className="big">
            {ok ? num(cm, 1) : "–"}
            <small>cm</small>
            <span>{L("for a 360° turn", "pour un tour complet")}</span>
          </div>
        </div>
        <div className="conv">
          <span>{L("same feel in", "même sensation dans")}</span>
          <GameSelect value={to} onChange={setTo} label={L("same feel in", "même sensation dans")} />
          <b>{ok ? num(converted, 3) : "–"}</b>
        </div>
        <p className="verdict2 inner">{L("Just a calculation: nothing is changed in your games.", "Un simple calcul : rien n'est changé dans tes jeux.")}</p>
      </div>
    </section>
  );
}
