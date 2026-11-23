// Onglet « network test » de Réseau, à l'identique de la maquette v5 app-network-test-pi.html : note de la connexion
// (ping, gigue, perte du serveur choisi), graphe « imprimé » des essais (pingchart.js de la maquette), liste des serveurs
// avec un serveur au choix (« host:… », nettest.rs), et l'écran hors ligne (app-network-offline.html).
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { api, type NetMeasure } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { BigIcon, I, Rich } from "../s5/I";
import { validTarget } from "../components/NetTools";

/** Serveurs mesurés (mêmes identifiants que nettest.rs), dans l'ordre de la maquette. */
const GROUPS: { label: Key; ids: string[] }[] = [
  { label: "s5.nt.g.mc", ids: ["minemen", "hypixel"] },
  { label: "s5.nt.g.game", ids: ["paris", "london", "frankfurt", "madrid", "stockholm", "virginia"] },
  { label: "s5.nt.g.net", ids: ["internet"] },
];
const ALL = GROUPS.flatMap((g) => g.ids);
const CUSTOM = "host:";
const isMc = (id: string) => id === "hypixel" || id === "minemen";
/** Essais par mesure et écart entre deux essais (nettest.rs) : 40 en 10 s, 8 toutes les 1,4 s pour Minecraft. */
const slotsOf = (id: string) => (isMc(id) ? 8 : 40);
const gapOf = (n: number) => (n <= 8 ? 1.4 : 0.25);

type Grade = "great" | "good" | "fair" | "bad";
function grade(m: NetMeasure | undefined): Grade | null {
  if (!m || m.error === "dns") return null;
  if (m.ping == null) return "bad";
  // un essai perdu sur 40 (2,5 %) arrive sur une bonne ligne : la note ne tombe qu'à partir de 5 %
  if (m.loss >= 0.05 || (m.jitter ?? 0) > 15) return "bad";
  if (m.ping <= 40 && (m.jitter ?? 0) <= 5 && m.loss <= 0.025) return "great";
  if (m.ping <= 80 && (m.jitter ?? 0) <= 10) return "good";
  return "fair";
}
/** Résumé des essais déjà reçus, affiché pendant la mesure (le résultat de nettest.rs le remplace à la fin). */
function partial(id: string, series: (number | null | undefined)[]): NetMeasure | undefined {
  const done = series.filter((v): v is number | null => v !== undefined);
  const ok = done.filter((v): v is number => v != null);
  if (!done.length) return undefined;
  const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  const jitter = ok.length > 1 ? ok.slice(1).reduce((a, v, i) => a + Math.abs(v - ok[i]), 0) / (ok.length - 1) : null;
  const lost = done.length - ok.length;
  return { id, ping: avg, best: ok.length ? Math.min(...ok) : null, worst: ok.length ? Math.max(...ok) : null, jitter, loss: lost / done.length, lost, samples: done.length, error: null };
}
const mmss = (s: number) => `${String(Math.floor(Math.round(s) / 60)).padStart(2, "0")}:${String(Math.round(s) % 60).padStart(2, "0")}`;

interface Saved {
  at: number;
  results: Record<string, NetMeasure>;
}
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`rago.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(`rago.${key}`, JSON.stringify(v));
  } catch {
    /* stockage indisponible : le dernier test n'est pas gardé */
  }
}

export function NetTest({ offline }: { offline: boolean }) {
  const { t, lang, goTo } = useStore();
  const [last, setLast] = useState<Saved | null>(() => load<Saved | null>("netLast", null));
  const [results, setResults] = useState<Record<string, NetMeasure>>(() => last?.results ?? {});
  const [running, setRunning] = useState<Set<string>>(new Set());
  // essais reçus pendant la mesure, avant le résultat, et leur nombre prévu
  const [samples, setSamples] = useState<Record<string, { n: number; v: (number | null)[] }>>({});
  const [pick, setPick] = useState<string>(() => load("netPick", "paris"));
  // serveur au choix : ce qui est tapé, et le dernier testé (gardé sur ce PC)
  const [mine, setMine] = useState<string | null>(() => load<string | null>("netCustom", null));
  const [typed, setTyped] = useState("");
  const live = useRef(true);
  const [, tick] = useState(0);

  useEffect(() => {
    live.current = true;
    const subs = [
      api.onNetSample((s) => {
        if (!live.current) return;
        setSamples((all) => {
          const v = [...(all[s.id]?.v ?? [])];
          v[s.i] = s.ms;
          return { ...all, [s.id]: { n: s.n, v } };
        });
      }),
      api.onNetMeasure((m) => {
        if (!live.current) return;
        setResults((r) => ({ ...r, [m.id]: m }));
        setRunning((s) => {
          const next = new Set(s);
          next.delete(m.id);
          return next;
        });
      }),
    ];
    // « testé il y a 2 min » reste juste
    const h = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => {
      live.current = false;
      window.clearInterval(h);
      for (const sub of subs) void sub.then((un) => un());
    };
  }, []);
  useEffect(() => save("netPick", pick), [pick]);

  const test = async (ids: string[]) => {
    setRunning(new Set(ids));
    setSamples((all) => {
      const next = { ...all };
      for (const id of ids) next[id] = { n: id.startsWith(CUSTOM) ? 40 : slotsOf(id), v: [] };
      return next;
    });
    try {
      const out = await api.netTest(ids);
      if (!live.current) return;
      setResults((r) => {
        const next = { ...r };
        for (const m of out) next[m.id] = m;
        const saved = { at: Date.now(), results: next };
        save("netLast", saved);
        setLast(saved);
        return next;
      });
    } catch {
      /* le moteur n'a pas répondu : les serveurs gardent leur dernier résultat */
    } finally {
      if (live.current) setRunning(new Set());
    }
  };
  // première visite : le test se lance tout seul
  useEffect(() => {
    if (!last && !offline) void test(ALL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = running.size > 0;
  const testMine = () => {
    const host = typed.trim().toLowerCase();
    if (!validTarget(host) || busy) return;
    const id = CUSTOM + host;
    setMine(id);
    save("netCustom", id);
    setPick(id);
    setTyped("");
    void test([id]);
  };

  // tout le test sans réseau (aucun serveur trouvé) : l'écran hors ligne, comme quand le ping en direct ne revient plus
  const allLost = !busy && ALL.every((id) => results[id]?.error === "dns");
  if (offline || allLost)
    return (
      <section className="empty panel">
        <span className="bgdots" />
        <BigIcon n="offline" />
        <div className="tx">
          <h2>
            {t("s5.nt.off1")}
            <br />
            {t("s5.nt.off2")}
          </h2>
          <p>
            <Rich text={t("s5.nt.offLead")} />
          </p>
          <div className="acts">
            <button type="button" className="btn red lg" disabled={busy} onClick={() => void test(ALL)}>
              <I n={busy ? "loader" : "refresh"} className={busy ? "spin" : undefined} />
              {t("s5.nt.again")}
            </button>
            <button type="button" className="btn lg" onClick={() => void api.toolsOpen("network").catch(() => {})}>
              <I n="external" />
              {t("s5.nt.openSettings")}
            </button>
          </div>
          <p className="hint">{t("s5.nt.offHint")}</p>
        </div>
      </section>
    );

  const custom = pick.startsWith(CUSTOM);
  const testing = running.has(pick);
  const sel = testing ? undefined : results[pick];
  const g = grade(sel);
  const now = samples[pick];
  // pendant la mesure : les chiffres des essais déjà reçus
  const shown = testing ? partial(pick, now?.v ?? []) : sel;
  const name = (id: string) => (id.startsWith(CUSTOM) ? id.slice(CUSTOM.length) : t(`net.${id}` as Key));
  const desc = (id: string) => {
    if (!id.startsWith(CUSTOM)) return t(`net.${id}.desc` as Key);
    const m = results[id]?.method;
    return m ? t(`s5.nt.m.${m}` as Key) : "";
  };
  const num = (v: number | null | undefined) => (v == null ? "–" : String(Math.round(v)));
  const pct = (v: number | undefined) => (v == null ? "–" : (Math.round(v * 1000) / 10).toLocaleString(lang === "fr" ? "fr-FR" : "en-US"));
  const ago = (ts: number) => {
    const min = Math.floor((Date.now() - ts) / 60_000);
    return min < 1 ? t("s5.nt.testedNow") : min < 60 ? t("s5.nt.testedMin", { n: min }) : min < 1440 ? t("s5.nt.testedH", { n: Math.floor(min / 60) }) : t("s5.nt.testedD", { n: Math.floor(min / 1440) });
  };
  // la courbe : les essais en direct pendant la mesure, sinon ceux du dernier résultat
  const series: (number | null | undefined)[] = testing ? (now?.v ?? []) : (sel?.series ?? []);
  const n = testing ? (now?.n ?? slotsOf(pick)) : series.length || (custom ? 40 : slotsOf(pick));
  const got = series.filter((v) => v !== undefined).length;
  const lost = sel ? (sel.lost ?? Math.round(sel.loss * sel.samples)) : 0;
  const tip = !!sel && sel.ping != null && (sel.loss >= 0.05 || (sel.jitter ?? 0) > 10);
  const gap = gapOf(n);

  const row = (id: string) => {
    const m = results[id];
    const run = running.has(id);
    const cur = run ? partial(id, samples[id]?.v ?? []) : m;
    // ping de 0 à 100 ms sur la barre ; au-delà de 80 ms, ou sans réponse, la ligne passe en rouge
    const far = !run && !!m && (m.ping == null || m.ping > 80);
    const w = cur?.ping ?? (m && !run ? 100 : 0);
    return (
      <button key={id} type="button" role="radio" aria-checked={pick === id} className={`sv${pick === id ? " on" : ""}${far ? " far" : ""}`} onClick={() => setPick(id)}>
        <div>
          <b>{name(id)}</b>
          <small>{desc(id)}</small>
        </div>
        <span className="pb">
          <i style={{ "--w": `${Math.min(100, Math.max(0, w))}%` } as CSSProperties} />
        </span>
        <em>
          {run && cur?.ping == null ? (
            <I n="loader" className="spin" />
          ) : cur?.ping != null ? (
            <>
              {num(cur.ping)}
              <small>ms</small>
            </>
          ) : m ? (
            <small>{m.error === "dns" ? t("s5.nt.notFound") : t("s5.nt.noAnswer")}</small>
          ) : (
            "–"
          )}
        </em>
      </button>
    );
  };
  const typedOk = validTarget(typed.trim());

  return (
    <>
      <section className="score panel">
        <div className="gr">
          <b>{testing ? t("s5.nt.testing") : g ? t(`s5.nt.grade.${g}` as Key) : "–"}</b>
          <span>{t("s5.nt.connection")}</span>
        </div>
        <div className="mets">
          <div className="met">
            <b>
              {num(shown?.ping)}
              <small>ms</small>
            </b>
            <span className="lbl">{t("s5.nt.ping")}</span>
          </div>
          <div className="met">
            <b>
              {num(shown?.jitter)}
              <small>ms</small>
            </b>
            <span className="lbl">{t("s5.nt.jitter")}</span>
          </div>
          <div className="met">
            <b>
              {pct(shown?.loss)}
              <small>%</small>
            </b>
            <span className="lbl">{t("s5.nt.loss")}</span>
          </div>
        </div>
        <div className="again">
          <button type="button" className="btn red" disabled={busy} onClick={() => void test([pick])}>
            <I n={testing ? "loader" : "refresh"} className={testing ? "spin" : undefined} />
            {results[pick] ? t("s5.nt.again") : t("s5.nt.test")}
          </button>
          <span className="sub">{testing ? t("s5.nt.progress", { done: got, n }) : last && results[pick] ? ago(last.at) : t("s5.nt.never")}</span>
        </div>
      </section>

      <div className="tg">
        <section className="chart panel">
          <div className="ch">
            <h3>{name(pick)}</h3>
            <span className="sub">{desc(pick)}</span>
            {(testing || series.length > 0) && (
              <span className="clk">
                <small>{testing ? t("s5.nt.clkLive") : t("s5.nt.clkDone")}</small>
                {mmss(Math.max(0, (testing ? got - 1 : n - 1) * gap))}
              </span>
            )}
          </div>
          <PingChart series={series} n={n} gap={gap} done={!testing && !!sel} avg={sel?.ping ?? null} />
          <div className="cs">
            {(
              [
                ["s5.nt.best", sel?.best, true],
                ["s5.nt.worst", sel?.worst, true],
                ["s5.nt.spikes", sel?.spikes, false],
                ["s5.nt.lost", sel ? lost : undefined, false],
              ] as [Key, number | null | undefined, boolean][]
            ).map(([k, v, unit], i) => (
              <div key={k} className={i === 3 && lost > 0 && !testing ? "bad" : undefined} style={testing ? { opacity: 0.45 } : undefined}>
                <span className="lbl">{t(k)}</span>
                <b>
                  {testing || v == null ? "–" : num(v)}
                  {unit && !testing && v != null && <small>ms</small>}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className="srv panel">
          <div className="sh2">
            <h3>{t("s5.nt.servers")}</h3>
            <button type="button" className="btn sm" disabled={busy} onClick={() => void test(ALL)}>
              <I n={busy && !testing ? "loader" : "play"} className={busy && !testing ? "spin" : undefined} />
              {t("s5.nt.testAll")}
            </button>
          </div>
          {GROUPS.map((grp) => (
            <div key={grp.label} role="radiogroup" aria-label={t(grp.label)}>
              <div className="g lbl">{t(grp.label)}</div>
              {grp.ids.map(row)}
            </div>
          ))}
          {mine && (
            <div role="radiogroup" aria-label={t("s5.nt.g.mine")}>
              <div className="g lbl">{t("s5.nt.g.mine")}</div>
              {row(mine)}
            </div>
          )}
          <form
            className="cust"
            onSubmit={(e) => {
              e.preventDefault();
              testMine();
            }}
          >
            <label className={`inp${typed && !typedOk ? " bad" : ""}`} title={typed && !typedOk ? t("s5.nt.customBad") : undefined}>
              <I n="search" />
              <input value={typed} spellCheck={false} maxLength={253} placeholder={t("s5.nt.custom")} aria-label={t("s5.nt.custom")} onChange={(e) => setTyped(e.target.value)} />
            </label>
            <button type="submit" className="btn sm" disabled={busy || !typed.trim() || !typedOk}>
              {t("s5.nt.test")}
            </button>
          </form>
        </section>
      </div>

      {tip && (
        <p className="note">
          <I n="alert" />
          {t("net.tip")}
          <button type="button" className="lnk" onClick={() => goTo("netopt")}>
            {t("s5.nt.tipGo")}
          </button>
        </p>
      )}
      <p className="note">
        <I n="globe" />
        {t("net.shared")}
      </p>
    </>
  );
}

/** Échelle du graphe : la première au-dessus du pire essai (avec un peu de marge), en 4 lignes. */
const NICE = [20, 40, 60, 80, 100, 120, 160, 200, 240, 300, 400, 500, 600, 800, 1000, 1500, 2000];

/** Graphe « imprimé » de la maquette (pingchart.js) : courbe papier avec la couche rouge décalée dessous, trame rouge
 * sous la courbe, repères de temps, moyenne et pic sur des bandes de papier, essai perdu hachuré. */
function PingChart({ series, n, gap, done, avg }: { series: (number | null | undefined)[]; n: number; gap: number; done: boolean; avg: number | null }) {
  const { t } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const X0 = 34;
  const X1 = W - 78;
  const Y0 = 34;
  const Y1 = H - 28;
  const V = series;
  const vals = V.filter((v): v is number => typeof v === "number");
  const top = Math.max(0, ...vals, avg ?? 0);
  const MAX = NICE.find((m) => m >= top * 1.1) ?? Math.ceil((top * 1.1) / 1000) * 1000;
  const slots = Math.max(2, n);
  const px = (i: number) => X0 + (i * (X1 - X0)) / (slots - 1);
  const py = (v: number) => Y1 - (Math.min(v, MAX) / MAX) * (Y1 - Y0);
  const f = (v: number) => v.toFixed(1);

  // tronçons de courbe, coupés par les essais perdus
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  let lastI = -1;
  V.forEach((v, i) => {
    if (v === undefined) return;
    lastI = i;
    if (v === null) {
      if (cur.length) segs.push(cur);
      cur = [];
      return;
    }
    cur.push([px(i), py(v)]);
  });
  if (cur.length) segs.push(cur);
  const lostI = V.flatMap((v, i) => (v === null ? [i] : []));
  const hiI = vals.length > 1 ? V.indexOf(Math.max(...vals)) : -1;
  const hi = hiI >= 0 ? (V[hiI] as number) : 0;
  const tail = segs.length ? segs[segs.length - 1] : null;
  const head = tail && lastI >= 0 && V[lastI] !== null ? tail[tail.length - 1] : null;

  // repères de temps : un trait toutes les 2 s (5 s, 10 s si le test est plus long), un petit tous les quarts
  const D = (slots - 1) * gap;
  const step = D <= 12 ? 2 : D <= 30 ? 5 : 10;
  const tx = (s: number) => X0 + (s / D) * (X1 - X0);
  const majors: number[] = [];
  for (let s = 0; s <= D + 1e-6; s += step) majors.push(s);
  const minors: number[] = [];
  for (let k = 1; (k * step) / 4 <= D + 1e-6; k++) if (k % 4) minors.push((k * step) / 4);

  const flt = (fid: string, freq: number, scale: number, seed: number, sa: number, sb: number, xs: "R" | "G", ys: "R" | "G") => (
    <filter id={fid} x="-5%" y="-20%" width="110%" height="140%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector={xs} yChannelSelector={ys} result="d" />
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed + 6} result="s" />
      <feColorMatrix in="s" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${sa} 0 0 0 ${sb}`} result="sm" />
      <feComposite in="d" in2="sm" operator="in" />
    </filter>
  );
  const lines = (col: string) => segs.map((s, i) => <polyline key={i} points={s.map((q) => `${f(q[0])},${f(q[1])}`).join(" ")} fill="none" stroke={col} strokeWidth={3} strokeLinejoin="miter" strokeMiterlimit={4} />);
  const area = segs
    .filter((s) => s.length > 1)
    .map((s) => `M${f(s[0][0])},${Y1}L` + s.map((q) => `${f(q[0])},${f(q[1])}`).join("L") + `L${f(s[s.length - 1][0])},${Y1}Z`)
    .join("");
  const id = (k: string) => `pc-${k}-${uid}`;

  return (
    <div className="plot" ref={ref} role="img" aria-label={t("s5.nt.chart")}>
      {W > 120 && H > 100 && (
        <>
          <svg className="pc" width={W} height={H}>
            <defs>
              {flt(id("f"), 0.5, 1.6, 5, -16, 13.2, "R", "G")}
              {flt(id("b"), 0.4, 2.2, 17, -14, 12, "G", "R")}
              <pattern id={id("hatch")} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                <rect width="2.4" height="7" fill="#FF3B30" fillOpacity=".55" />
              </pattern>
              <linearGradient id={id("fade")} x1="0" y1={Y0} x2="0" y2={Y1} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fff" stopOpacity=".85" />
                <stop offset="1" stopColor="#fff" stopOpacity=".08" />
              </linearGradient>
              <mask id={id("m")} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                <rect x="0" y="0" width={W} height={H} fill={`url(#${id("fade")})`} />
              </mask>
            </defs>
            {[1, 2, 3, 4].map((k) => {
              const v = (MAX / 4) * k;
              return (
                <g key={k}>
                  <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="#fff" strokeOpacity=".06" />
                  <text x={X0 - 10} y={py(v) + 4} textAnchor="end" fontFamily="Barlow Condensed" fontWeight="700" fontSize="12" fill="#6E6E78">
                    {Math.round(v)}
                  </text>
                </g>
              );
            })}
            <line x1={X0} x2={X1} y1={Y1} y2={Y1} stroke="#fff" strokeOpacity=".14" />
            {majors.map((s) => (
              <g key={s}>
                <line x1={tx(s)} x2={tx(s)} y1={Y1} y2={Y1 + 6} stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
                <text x={tx(s)} y={Y1 + 21} textAnchor={s ? "middle" : "start"} fontFamily="Barlow Condensed" fontWeight="800" fontStyle="italic" fontSize="13" fill="#A1A1AA" letterSpacing=".5">
                  {mmss(s)}
                </text>
              </g>
            ))}
            {minors.map((s) => (
              <line key={s} x1={tx(s)} x2={tx(s)} y1={Y1} y2={Y1 + 3} stroke="#fff" strokeOpacity=".18" />
            ))}
            {lostI.map((i) => (
              <g key={i}>
                <rect x={px(i) - 7} y={Y0 - 6} width="14" height={Y1 - Y0 + 6} fill={`url(#${id("hatch")})`} />
                <rect x={px(i) - 7} y={Y0 - 6} width="14" height="3" fill="#FF3B30" />
              </g>
            ))}
            <g mask={`url(#${id("m")})`}>
              <path d={area} fill="#FF3B30" opacity=".13" />
            </g>
            {done && avg != null && <line x1={X0} x2={X1} y1={py(avg)} y2={py(avg)} stroke="#FF3B30" strokeWidth="2" strokeDasharray="7 6" />}
            <g transform="translate(2 2.6)" filter={`url(#${id("b")})`}>
              {lines("#FF3B30")}
            </g>
            <g filter={`url(#${id("f")})`}>{lines("#ECE9E2")}</g>
            {hiI >= 0 && <line x1={px(hiI)} x2={px(hiI)} y1={py(hi) - 26} y2={py(hi) - 6} stroke="#ECE9E2" strokeWidth="2" />}
            {head && <rect x={head[0] - 5} y={head[1] - 5} width="10" height="10" fill="#FF3B30" transform={`rotate(-12 ${head[0]} ${head[1]})`} />}
          </svg>
          {done && avg != null && (
            <span className="ptag" style={{ left: X1 + 10, top: py(avg) - 11 }}>
              {t("s5.nt.avg", { n: Math.round(avg) })}
            </span>
          )}
          {hiI >= 0 && (
            <span className="ptag" style={{ left: px(hiI) - 26, top: py(hi) - 52 }}>
              {Math.round(hi)} ms
            </span>
          )}
          {lostI.length > 0 && (
            <span className="ptag r" style={{ left: px(lostI[0]) - 22, top: Y0 - 34 }}>
              {t("s5.nt.lostTag")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
