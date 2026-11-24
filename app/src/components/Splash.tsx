import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { LogoR } from "../s5/I";
import { LOGO_R } from "../s5/iconData";

/** Fin de l'animation (« Ready » à 100 %), puis l'aplat rouge entre ; l'app apparaît à `SHOW_MS`. Durées fixes, comptées
 * depuis la première image : elles ne dépendent pas de la vitesse d'ouverture de l'app, qui se charge dessous
 * (Sofiene, 23/11 : « au moins 1,5 à 2 sec fixe »). */
const READY_MS = 1800;
const WIPE_MS = 2000;
const SHOW_MS = 2300;
const SEGS = 28;
/** Attente des polices au plus (le logo est un texte en Barlow Condensed) avant de lancer l'animation. */
const FONTS_MS = 400;

// courbes de la maquette (rendus-v5/src/seq.js)
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const k = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const bez = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx,
    cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const Y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (X(t) - x) / d);
    }
    return Y(t);
  };
};
const out = bez(0.16, 1, 0.3, 1);
const outQ = bez(0.25, 0.8, 0.35, 1);
const inOut = bez(0.45, 0, 0.2, 1);
const slam = bez(0.55, 0, 0.9, 0.45);
const shake = (t: number, a: number, dur: number, amp: number) => {
  const x = (t - a) / dur;
  return x < 0 || x > 1 ? 0 : Math.sin(x * Math.PI * 5) * amp * (1 - x);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** Centre du R (point fixe du coup de tampon). */
const RC = [38.7, 42.5];
/** Messages : de la maquette (0, 1500, 2150, 2700 ms sur une jauge de 1000 à 2700 ms), ramenés à la jauge de 1000 à 1800. */
const MSG_AT = [0, 1250, 1550, READY_MS];

const wipeEase = [0.65, 0, 0.35, 1] as const;

/** Écran de démarrage, maquette v5 `rendus-v5/perso/src/splash.html` (vidéo `anim-demarrage.mp4`) : le R tombe comme un
 * tampon, « AGO » glisse derrière une découpe, la bande « optimizer » se déroule, puis le statut et la jauge à segments
 * jusqu'à « Ready ». La carte de la maquette (600 × 360 sur une scène de 720 × 460) est agrandie à la fenêtre : × 2 à
 * 1440 × 900. Ensuite un aplat rouge penché passe (le R y est noir, décision du 22/11) et découvre l'app.
 * En mouvement réduit (réglage de l'app ou de Windows) : pas de tampon ni d'aplat, des fondus. */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t, motion: motionPref } = useStore();
  const reduced = useReducedMotion() || motionPref === "reduced";
  const clip = `spc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [scale, setScale] = useState(() => fit());
  const [msg, setMsg] = useState(0);
  const [wipe, setWipe] = useState(false);
  // l'aplat couvre toute la fenêtre : la carte s'efface dessous, l'aplat repart en découvrant l'app
  const [covered, setCovered] = useState(false);
  const rg = useRef<SVGGElement>(null);
  const rf = useRef<SVGGElement>(null);
  const acr = useRef<SVGRectElement>(null);
  const af = useRef<SVGTextElement>(null);
  const tape = useRef<HTMLSpanElement>(null);
  const st = useRef<HTMLDivElement>(null);
  const pc = useRef<HTMLElement>(null);
  const seg = useRef<HTMLDivElement>(null);
  const msgs = [t("splash.windows"), t("splash.games"), t("splash.network"), t("splash.ready")];

  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** État de l'animation à l'instant `ms` (comme `__seq.seek` de la maquette). */
  const seek = (ms: number) => {
    const segs = seg.current ? [...seg.current.children] : [];
    if (reduced) {
      const a = k(ms, 0, 200);
      for (const el of [rf.current, af.current, tape.current, st.current]) if (el) el.style.opacity = String(a);
    } else {
      // 1. le R tombe comme un tampon
      const sc = lerp(1.7, 1, slam(k(ms, 120, 340)));
      const sh = shake(ms, 340, 260, 3.2);
      rg.current?.setAttribute("transform", `translate(${6 + sh} 14) translate(${RC[0]} ${RC[1]}) scale(${sc}) translate(${-RC[0]} ${-RC[1]})`);
      if (rf.current) rf.current.style.opacity = String(k(ms, 120, 200));
      // 2. AGO glisse derrière une découpe
      const c = out(k(ms, 430, 760));
      acr.current?.setAttribute("x", String(84 - 6 * c));
      acr.current?.setAttribute("width", String(300 * c));
      af.current?.setAttribute("x", String(83 - 10 * (1 - c)));
      // 3. la bande OPTIMIZER se déroule
      if (tape.current) tape.current.style.clipPath = `inset(-6px ${(1 - outQ(k(ms, 700, 960))) * 100}% -6px -6px)`;
      // 4. statut et jauge
      if (st.current) {
        st.current.style.opacity = String(k(ms, 820, 1000));
        st.current.style.transform = `translateY(${8 * (1 - out(k(ms, 820, 1100)))}px)`;
      }
    }
    const p = inOut(k(ms, 1000, READY_MS));
    if (pc.current) pc.current.textContent = String(Math.round(p * 100));
    const n = Math.round(p * SEGS);
    segs.forEach((s, i) => (s.className = i < n ? "f" : ""));
    let m = 0;
    MSG_AT.forEach((at, i) => ms >= at && (m = i));
    setMsg(m);
  };

  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    let alive = true;
    const timers: number[] = [];
    const frame = (now: number) => {
      if (!alive) return;
      t0 ||= now;
      seek(now - t0);
      if (now - t0 < READY_MS + 50) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!reduced) {
        timers.push(window.setTimeout(() => setWipe(true), WIPE_MS));
        timers.push(window.setTimeout(() => setCovered(true), SHOW_MS - 20));
      }
      timers.push(window.setTimeout(onDone, SHOW_MS));
    };
    // les polices du logo et du statut d'abord (fichiers locaux : quelques millisecondes), sans attendre plus de 400 ms
    const fonts = document.fonts
      ? Promise.all([document.fonts.load('italic 900 120px "Barlow Condensed"'), document.fonts.load('500 15px "Barlow"')])
      : Promise.resolve();
    void Promise.race([fonts.catch(() => {}), new Promise((r) => window.setTimeout(r, FONTS_MS))]).then(start);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach((x) => window.clearTimeout(x));
    };
    // une seule fois : l'animation ne repart pas si la langue change
  }, []);

  const w = window.innerWidth / scale;
  const h = window.innerHeight / scale;

  return (
    <motion.div
      className={`spl5${covered ? " off" : ""}`}
      aria-hidden="true"
      // sans l'aplat (mouvement réduit) : fondu ; avec : la fenêtre reste le temps que l'aplat reparte
      exit={reduced ? { opacity: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } : { opacity: 1, transition: { duration: 0.45 } }}
    >
      <div className="stage" style={{ width: w, height: h, transform: `scale(${scale})` }}>
        <div className="sp">
          <div className="grain" />
          <svg className="logo" width="360" height="110" viewBox="0 0 360 110" overflow="visible">
            <g ref={rg} transform="translate(6 14)">
              <g ref={rf} style={{ opacity: 0 }}>
                <path d={LOGO_R} fill="#FF3B30" transform="scale(0.4722)" />
              </g>
            </g>
            <clipPath id={clip}>
              <rect ref={acr} x={reduced ? 78 : 84} y="0" width={reduced ? 300 : 0} height="110" />
            </clipPath>
            <g clipPath={`url(#${clip})`}>
              <text ref={af} x="73" y="99" fill="#FFFFFF" fontFamily="Barlow Condensed" fontWeight="900" fontStyle="italic" fontSize="120" letterSpacing="0.6" style={reduced ? { opacity: 0 } : undefined}>
                AGO
              </text>
            </g>
          </svg>
          <span className="spt" ref={tape} style={reduced ? { opacity: 0 } : { clipPath: "inset(-6px 100% -6px -6px)" }}>
            optimizer
          </span>
          <div className="st" ref={st} style={{ opacity: 0 }}>
            <div className="row">
              <span className={`msg${msg === MSG_AT.length - 1 ? " rd" : ""}`}>{msgs[msg]}</span>
              <span className="pc">
                <b ref={pc}>0</b>
                <small>%</small>
              </span>
            </div>
            <div className="seg" ref={seg}>
              {Array.from({ length: SEGS }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* transition en aplat rouge penché : le R y est noir (décision du 22/11) */}
      {!reduced && (
        <motion.div
          className="spl5-wipe"
          style={{ skewX: -12 }}
          initial={{ x: "-130%" }}
          animate={{ x: wipe ? "0%" : "-130%" }}
          exit={{ x: "130%", transition: { duration: 0.45, ease: wipeEase } }}
          transition={{ duration: 0.3, ease: wipeEase }}
        >
          <div>
            <LogoR />
            <b>ago</b>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/** Échelle de la scène de la maquette (720 × 460, carte de 600 × 360) dans la fenêtre : × 2 à 1440 × 900. */
function fit() {
  return Math.min(window.innerWidth / 720, window.innerHeight / 450);
}
