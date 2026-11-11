// Page Souris : vraie fréquence, doubles clics d'un bouton usé, logiciels entre la souris et le jeu, calcul de la
// sensibilité. Rien ne touche au jeu : la fréquence et les clics sont lus dans la fenêtre de Rago (pointerrawupdate et
// getCoalescedEvents de Chromium, comme les sites de test de souris), les logiciels sont seulement listés (mouse.rs),
// la sensibilité n'est qu'un calcul. Le réglage « Souris 1:1 » reste celui de Latence (`kbm_1to1`).
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "motion/react";
import { Activity, ArrowRight, Calculator, Check, MousePointer2, MousePointerClick, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { api, type MouseApp } from "../lib/api";
import { useStore } from "../lib/store";
import { Badge, Button } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

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

export function Mouse() {
  const { lang } = useStore();
  const L: Tr = (en, fr) => (lang === "fr" ? fr : en);
  return (
    <motion.div className="page tools mouse" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{L("Mouse", "Souris")}</div>
        <h1>{L("Check your mouse", "Vérifie ta souris")}</h1>
        <p className="lead">
          {L(
            "Real polling rate, worn clicks and software that gets between your mouse and the game. Measured in this window only: nothing touches your game.",
            "Vraie fréquence, clics usés et logiciels qui se glissent entre ta souris et le jeu. Mesuré dans cette fenêtre seulement : rien ne touche à ton jeu.",
          )}
        </p>
      </motion.header>
      <div className="mouse-grid">
        <PollingTest L={L} />
        <ClickTest L={L} />
      </div>
      <div className="mouse-grid">
        <Apps L={L} />
        <Sensitivity L={L} />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------------- fréquence

interface Rate {
  hz: number;
  /** part des rapports à moins de 25 % de l'écart médian, en % */
  steady: number;
  /** plus long écart hors pauses, en ms */
  worst: number;
  /** derniers écarts, pour la courbe */
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
  return { hz: Math.round(1000 / avg), steady, worst: sorted[sorted.length - 1], last: g.slice(-80) };
}

function PollingTest({ L }: { L: Tr }) {
  const zone = useRef<HTMLDivElement>(null);
  const [rate, setRate] = useState<Rate | null>(null);
  const [count, setCount] = useState(0);
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
          if (r) setRate(r);
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

  const verdict = !rate
    ? null
    : rate.hz < 200
      ? {
          tone: "warn" as const,
          tag: L("Low", "Basse"),
          text: L(
            `Only ${rate.hz} Hz: your mouse reports 8 times less often than a gaming mouse. Set 1000 Hz in its software, plug it straight into the PC (not a hub or the screen), and put the wireless dongle close to the mouse.`,
            `Seulement ${rate.hz} Hz : ta souris envoie 8 fois moins de rapports qu'une souris gaming. Règle 1000 Hz dans son logiciel, branche-la directement sur le PC (pas un hub ni l'écran), et rapproche le dongle sans fil.`,
          ),
        }
      : rate.hz < 700
        ? {
            tone: "info" as const,
            tag: L("Fine", "Correcte"),
            text: L(
              `About ${rate.hz} Hz. Fine to play; 1000 Hz in your mouse software makes each move reach the PC a little sooner.`,
              `Environ ${rate.hz} Hz. Ça suffit pour jouer ; 1000 Hz dans le logiciel de ta souris font arriver chaque mouvement un peu plus tôt.`,
            ),
          }
        : rate.hz < 1600
          ? {
              tone: "ok" as const,
              tag: L("Good", "Bonne"),
              text: L(
                `About ${rate.hz} Hz: the sweet spot. 4000 or 8000 Hz cost CPU time and can cause stutters in some games.`,
                `Environ ${rate.hz} Hz : le bon réglage. 4000 ou 8000 Hz prennent du processeur et font saccader certains jeux.`,
              ),
            }
          : {
              tone: "info" as const,
              tag: L("Very high", "Très haute"),
              text: L(
                `About ${rate.hz} Hz. If your game stutters or your FPS drops, try 1000 Hz in your mouse software.`,
                `Environ ${rate.hz} Hz. Si ton jeu saccade ou perd des FPS, essaie 1000 Hz dans le logiciel de ta souris.`,
              ),
            };
  const max = rate ? Math.max(...rate.last) : 1;

  return (
    <motion.section variants={rise} className="card tools-tile">
      <header className="tools-tile-head">
        <span className="tools-tile-icon">
          <Activity size={16} />
        </span>
        <h3>{L("Polling rate", "Fréquence de la souris")}</h3>
        {verdict && <Badge tone={verdict.tone}>{verdict.tag}</Badge>}
      </header>
      <div ref={zone} className="mouse-zone">
        {rate ? (
          <>
            <div className="mouse-metrics">
              <div>
                <div className="rg-metric mouse-big">
                  {rate.hz}
                  <small> Hz</small>
                </div>
                <div className="muted small">{L("average", "en moyenne")}</div>
              </div>
              <div>
                <div className="rg-metric mouse-mid">{rate.steady} %</div>
                <div className="muted small">{L("regularity", "régularité")}</div>
              </div>
              <div>
                <div className="rg-metric mouse-mid">{rate.worst.toFixed(2)} ms</div>
                <div className="muted small">{L("longest gap", "plus long écart")}</div>
              </div>
            </div>
            <svg className="mouse-spark" viewBox="0 0 320 48" preserveAspectRatio="none" aria-hidden>
              <polyline
                fill="none"
                strokeWidth="1.5"
                points={rate.last.map((v, i) => `${(i / Math.max(1, rate.last.length - 1)) * 320},${46 - (v / max) * 42}`).join(" ")}
              />
            </svg>
          </>
        ) : (
          <div className="mouse-wait">
            <div className="mouse-progress">
              <span style={{ width: `${Math.min(100, (count / MIN_SAMPLES) * 100)}%` }} />
            </div>
          </div>
        )}
        <p className="mouse-hint small">
          <MousePointer2 size={13} /> {L("Move your mouse in fast circles here", "Fais des cercles rapides avec ta souris ici")}
        </p>
      </div>
      {verdict && <p className="small mouse-verdict">{verdict.text}</p>}
    </motion.section>
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
  // une case par clic voulu ; elle passe en jaune si ce clic a rebondi
  const dots: string[] = [];
  presses.forEach((bounce) => {
    if (!bounce) dots.push("on");
    else if (dots.length) dots[dots.length - 1] = "bad";
  });
  while (dots.length < CLICKS) dots.push("");

  return (
    <motion.section variants={rise} className="card tools-tile">
      <header className="tools-tile-head">
        <span className="tools-tile-icon">
          <MousePointerClick size={16} />
        </span>
        <h3>{L("Double-click check", "Test de double clic")}</h3>
        {done && (
          <Badge tone={bounces ? "warn" : "ok"}>
            {bounces
              ? L(`${bounces} double click${bounces > 1 ? "s" : ""}`, `${bounces} double${bounces > 1 ? "s" : ""} clic${bounces > 1 ? "s" : ""}`)
              : L("No double click", "Aucun double clic")}
          </Badge>
        )}
      </header>
      <p className="muted small tools-tile-desc">
        {L(`Click ${CLICKS} times, slowly, with the left button.`, `Clique ${CLICKS} fois, lentement, avec le bouton gauche.`)}
      </p>
      <button type="button" className="mouse-pad" onPointerDown={down} onContextMenu={(e) => e.preventDefault()}>
        <span className="rg-metric mouse-big">
          {Math.min(clicks, CLICKS)}
          <small>/{CLICKS}</small>
        </span>
        <span className="mouse-dots">
          {dots.slice(0, CLICKS).map((c, i) => (
            <i key={i} className={c} />
          ))}
        </span>
      </button>
      {done && bounces > 0 && (
        <div className="mouse-alert">
          <TriangleAlert size={15} />
          <div className="small">
            <b>{L(`${bounces} click${bounces > 1 ? "s were" : " was"} counted twice`, `${bounces} clic${bounces > 1 ? "s comptés" : " compté"} deux fois`)}</b> (
            {gaps.join(", ")} ms).{" "}
            {L(
              "Your left switch is starting to wear out. Raise the debounce time a little in your mouse software (Logitech G HUB, Razer Synapse…), or change the switch.",
              "Le bouton gauche commence à s'user. Monte un peu le « debounce » dans le logiciel de ta souris (Logitech G HUB, Razer Synapse…), ou change le switch.",
            )}
          </div>
        </div>
      )}
      {done && bounces === 0 && (
        <p className="small tools-tile-status ok">
          <Check size={13} /> {L("Every click counted once: your left button is fine.", "Chaque clic compté une fois : ton bouton gauche va bien.")}
        </p>
      )}
      {presses.length > 0 && (
        <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={reset} className="mouse-again">
          {L("Start again", "Recommencer")}
        </Button>
      )}
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------------- logiciels

function Apps({ L }: { L: Tr }) {
  const { goTo, isOn } = useStore();
  const [apps, setApps] = useState<MouseApp[] | null>(null);
  const load = useCallback(() => {
    api
      .mouseApps()
      .then(setApps)
      .catch(() => setApps([]));
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
    <motion.section variants={rise} className="card tools-tile">
      <header className="tools-tile-head">
        <span className="tools-tile-icon">
          <ShieldAlert size={16} />
        </span>
        <h3>{L("Between your mouse and the game", "Entre ta souris et le jeu")}</h3>
        <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={load} aria-label={L("Check again", "Revérifier")} className="mouse-refresh" />
      </header>
      {apps && apps.length === 0 && (
        <p className="small tools-tile-status ok">
          <Check size={13} /> {L("No remapping, macro or auto-click software running.", "Aucun logiciel de remappage, de macro ou de clic automatique lancé.")}
        </p>
      )}
      {apps && apps.length > 0 && (
        <ul className="mouse-list">
          {apps.map((a) => (
            <li key={a.name}>
              <div className="mouse-list-head">
                <b>{a.name}</b>
                <Badge tone={a.kind === "vendor" ? "ok" : "warn"}>{a.kind === "vendor" ? L("Fine", "OK") : L("Risky in ranked", "Risqué en classé")}</Badge>
              </div>
              <p className="muted small">{about(a)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mouse-row">
        <div>
          <b className="small">{L("1:1 mouse", "Souris 1:1")}</b>
          <p className="muted small">
            {L(
              "Windows acceleration off, pointer speed 6/11: the same hand move always gives the same distance. Matters in games without raw input, like Minecraft.",
              "Accélération de Windows coupée, vitesse 6/11 : le même geste donne toujours la même distance. Compte dans les jeux sans raw input, comme Minecraft.",
            )}
          </p>
        </div>
        {oneToOne ? (
          <Badge tone="ok">{L("On", "Activé")}</Badge>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => goTo("latency", "kbm_1to1")}>
            {L("Open", "Ouvrir")}
          </Button>
        )}
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------------- sensibilité

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
  const games = Object.entries(YAW);

  return (
    <motion.section variants={rise} className="card tools-tile">
      <header className="tools-tile-head">
        <span className="tools-tile-icon">
          <Calculator size={16} />
        </span>
        <h3>{L("Sensitivity", "Sensibilité")}</h3>
      </header>
      <div className="mouse-form">
        <label>
          <span className="muted small">DPI</span>
          <input className="input" type="number" min={1} value={dpi || ""} onChange={(e) => setDpi(+e.target.value || 0)} />
        </label>
        <label>
          <span className="muted small">{L("In-game sens", "Sensi en jeu")}</span>
          <input className="input" type="number" min={0} step="0.01" value={sens || ""} onChange={(e) => setSens(+e.target.value || 0)} />
        </label>
        <label>
          <span className="muted small">{L("Game", "Jeu")}</span>
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {games.map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mouse-metrics">
        <div>
          <div className="rg-metric mouse-mid">{ok ? num(dpi * sens, 0) : "–"}</div>
          <div className="muted small">eDPI</div>
        </div>
        <div>
          <div className="rg-metric mouse-mid">{ok ? `${num(cm, 1)} cm` : "–"}</div>
          <div className="muted small">{L("for a 360° turn", "pour un tour complet")}</div>
        </div>
      </div>
      <div className="mouse-row">
        <span className="small">
          {L("Same feel in", "Même sensation dans")} <ArrowRight size={12} />
          <select className="input input-inline" value={to} onChange={(e) => setTo(e.target.value)}>
            {games.map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </span>
        <span className="rg-metric mouse-mid">{ok ? num(converted, 3) : "–"}</span>
      </div>
    </motion.section>
  );
}
