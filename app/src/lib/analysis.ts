// « Analyze my PC » et l'avant/après mesuré (1.3.0). L'analyse mesure ce qui ralentit le PC en jeu, puis dit pour
// chaque point ce qui le règle : le plan gratuit (avec les tweaks à appliquer), Premium (et quel module), ou le
// joueur lui-même. Pas de note de santé : un PC bien réglé voit « things are fine ».
// Les mesures restent sur ce PC (stockage du navigateur de l'app) : la première sert d'« avant », la dernière d'« après ».
// Normes du réseau propres à chaque joueur (Sofiene, 10/11 : « personnalisé en fonction de chaque utilisateur ») : elles
// suivent la distance au serveur (le ping) et ce que ce PC mesure d'habitude, pour qu'un joueur loin des serveurs ne voie
// pas tout « au-dessus de la normale ». Les autres normes viennent de la maquette de l'app.
import { api, type AnalysisFacts, type DriversInfo, type NetMeasure } from "./api";

/** Mesures d'une analyse. null : pas mesuré sur ce PC. */
export interface Values {
  at: number;
  /** serveur du ping au jeu */
  server: string | null;
  ping: number | null;
  jitter: number | null;
  /** 0 à 1 */
  loss: number | null;
  spikes: number | null;
  wired: boolean | null;
  refresh: number | null;
  refreshMax: number | null;
  fps: number | null;
  low1: number | null;
  stutters: number | null;
  /** processeur, % sans jeu ouvert */
  cpuIdle: number | null;
  processes: number | null;
  memSpeed: number | null;
  memRated: number | null;
  gameDvr: boolean | null;
  notifications: boolean | null;
  /** mode d'alimentation : économie ou utilisation normale de Windows */
  powerSaving: boolean | null;
  background: string[];
  /** âge du pilote graphique, en jours */
  driverDays: number | null;
}

export type Group = "network" | "fps" | "system" | "windows";
export type Fix = { kind: "free"; tweaks: string[] } | { kind: "premium"; module: "netopt" | "latency" } | { kind: "diy"; how: string } | { kind: "none" };

export interface Finding {
  id: keyof Values;
  group: Group;
  /** valeur affichée */
  value: string;
  /** clé de traduction de la norme */
  norm: string;
  /** valeurs de la norme pour ce joueur (seuil, habitude), insérées dans son texte */
  vars?: Record<string, string | number>;
  issue: boolean;
  fix: Fix;
}

export const STEPS = ["hardware", "windows", "drivers", "network", "system", "match"] as const;
export type Step = (typeof STEPS)[number];

const BALANCED = "381b4222-f694-41f0-9685-ff5bb260df2e";
const SAVER = "a1841308-3541-4fab-bc81-f71556f20b4a";
const round = (v: number | null | undefined, d = 1) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Lance toute l'analyse (une vingtaine de secondes) ; `onStep` suit l'avancement. */
export async function analyze(onStep: (s: Step) => void): Promise<Values> {
  onStep("hardware");
  const facts: AnalysisFacts | null = await api.analysisFacts().catch(() => null);
  onStep("windows");
  await new Promise((r) => setTimeout(r, 300));
  onStep("drivers");
  const drivers: DriversInfo | null = await api.toolsDrivers().catch(() => null);
  onStep("network");
  const net: NetMeasure[] = await api.netTest(["hypixel", "internet"]).catch(() => []);
  onStep("system");
  // processeur sans jeu ouvert : la moyenne de 10 secondes
  const cpu: number[] = [];
  for (let i = 0; i < 10; i++) {
    const s = await api.liveStats().catch(() => null);
    if (s?.ready && s.cpu != null) cpu.push(s.cpu);
    await new Promise((r) => setTimeout(r, 1000));
  }
  onStep("match");
  const game = net.find((m) => m.id === "hypixel" && m.ping != null) ?? null;
  const line = net.find((m) => m.id === "internet" && m.ping != null) ?? game;
  const gpu = drivers?.drivers.find((d) => d.kind === "gpu" && d.date);
  const m = facts?.lastMatch ?? null;
  return {
    at: Date.now(),
    server: game ? "Hypixel" : null,
    ping: round(game?.ping ?? null, 0),
    jitter: round(line?.jitter ?? null),
    loss: line ? line.loss : null,
    spikes: line?.spikes ?? null,
    wired: facts?.wired ?? null,
    refresh: facts?.refresh ?? null,
    refreshMax: facts?.refreshMax ?? null,
    fps: m?.fps ?? null,
    low1: m?.low1 ?? null,
    stutters: m?.stuttersPerMin ?? null,
    cpuIdle: cpu.length ? round(cpu.reduce((a, b) => a + b, 0) / cpu.length) : null,
    processes: facts?.processes ?? null,
    memSpeed: facts?.memSpeed ?? null,
    memRated: facts?.memRated ?? null,
    gameDvr: facts?.gameDvr ?? null,
    notifications: facts?.notifications ?? null,
    powerSaving: facts?.powerScheme ? facts.powerScheme === BALANCED || facts.powerScheme === SAVER : null,
    background: (facts?.background ?? []).filter((c) => c.id !== "battery").flatMap((c) => c.apps),
    driverDays: gpu?.date ? Math.floor((Date.now() - Date.parse(gpu.date)) / 86400000) : null,
  };
}

/** Mesures réseau d'une analyse passée, gardées sur ce PC pour connaître l'habitude du joueur. */
export interface Past {
  at: number;
  ping: number | null;
  jitter: number | null;
  loss: number | null;
  spikes: number | null;
}
const HISTORY = 10;
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
};

/** Seuils réseau de ce joueur. Sans habitude (moins de 2 analyses avant celle-ci) : d'après son ping seul.
 *  - gigue : 5 ms, ou 10 % du ping si plus (130 ms de ping : 13 ms) ; avec une habitude, jusqu'à 1,5 fois sa gigue habituelle ;
 *  - perte : aucune sous 100 ms de ping, 0,5 % au-delà ; avec une habitude, sa perte habituelle + 0,5 % ;
 *  - pics : 1, ou 2 à partir de 100 ms de ping ; avec une habitude, ses pics habituels + 1.
 *  Les seuils ne descendent jamais sous ceux d'un joueur proche des serveurs. */
export function netNorms(v: Pick<Values, "at" | "ping">, past: Past[] = history()) {
  const before = past.filter((p) => p.at < v.at).slice(-HISTORY);
  const far = (v.ping ?? 0) >= 100;
  const usual = (k: "jitter" | "loss" | "spikes") => (before.length >= 2 ? median(before.flatMap((p) => (p[k] == null ? [] : [p[k] as number]))) : null);
  const uJ = usual("jitter"), uL = usual("loss"), uS = usual("spikes");
  const jitter = Math.max(5, Math.round((v.ping ?? 0) * 0.1), uJ != null ? round(uJ * 1.5)! : 0);
  const lossPct = Math.max(far ? 0.5 : 0, uL != null ? round(uL * 100 + 0.5)! : 0);
  const spikes = Math.max(far ? 2 : 1, uS != null ? Math.round(uS) + 1 : 0);
  return { jitter, lossPct, spikes, usual: { jitter: uJ != null ? round(uJ) : null, lossPct: uL != null ? round(uL * 100) : null, spikes: uS != null ? Math.round(uS) : null } };
}

/** Ce que l'analyse a trouvé : un point par valeur mesurée, dans l'ordre des groupes. */
export function findings(v: Values): Finding[] {
  const n = netNorms(v);
  const out: Finding[] = [];
  const add = (f: Finding) => out.push(f);
  const packets: Fix = { kind: "premium", module: "netopt" };
  const latency: Fix = { kind: "premium", module: "latency" };
  // la norme dit d'où vient le seuil : l'habitude de ce PC, sinon le ping, sinon la norme d'un joueur proche des serveurs
  const why = (u: number | null, unit: string): Record<string, string | number> => (u != null ? { why: "pa.norm.usual", usual: `${u}${unit}` } : (v.ping ?? 0) >= 50 ? { why: "pa.norm.atPing", ping: v.ping! } : { why: "" });
  if (v.jitter != null)
    add({ id: "jitter", group: "network", value: `${v.jitter} ms`, norm: "pa.norm.jitter", vars: { n: n.jitter, ...why(n.usual.jitter, " ms") }, issue: v.jitter > n.jitter, fix: packets });
  if (v.loss != null)
    add({ id: "loss", group: "network", value: `${round(v.loss * 100)} %`, norm: n.lossPct > 0 ? "pa.norm.lossUpTo" : "pa.norm.loss", vars: { n: n.lossPct, ...why(n.usual.lossPct, " %") }, issue: (round(v.loss * 100) ?? 0) > n.lossPct, fix: packets });
  if (v.spikes != null)
    add({ id: "spikes", group: "network", value: `${v.spikes}`, norm: "pa.norm.spikes", vars: { n: n.spikes, ...why(n.usual.spikes, "") }, issue: v.spikes > n.spikes, fix: packets });
  if (v.wired != null) add({ id: "wired", group: "network", value: v.wired ? "pa.v.cable" : "pa.v.wifi", norm: "pa.norm.wired", issue: !v.wired, fix: { kind: "diy", how: "pa.diy.cable" } });
  if (v.ping != null) add({ id: "ping", group: "network", value: `${v.ping} ms`, norm: "pa.norm.ping", issue: false, fix: { kind: "none" } });
  if (v.refresh != null && v.refreshMax != null)
    add({ id: "refresh", group: "fps", value: `${v.refresh} Hz`, norm: "pa.norm.refresh", issue: v.refresh < v.refreshMax, fix: { kind: "diy", how: "pa.diy.refresh" } });
  if (v.low1 != null && v.fps != null) add({ id: "low1", group: "fps", value: `${v.low1} FPS`, norm: "pa.norm.low1", issue: v.low1 < v.fps / 2, fix: latency });
  if (v.stutters != null) add({ id: "stutters", group: "fps", value: `${v.stutters}/min`, norm: "pa.norm.stutters", issue: v.stutters >= 2, fix: latency });
  if (v.fps != null) add({ id: "fps", group: "fps", value: `${v.fps} FPS`, norm: "pa.norm.fps", issue: false, fix: { kind: "none" } });
  if (v.cpuIdle != null) add({ id: "cpuIdle", group: "system", value: `${v.cpuIdle} %`, norm: "pa.norm.cpuIdle", issue: v.cpuIdle > 5, fix: { kind: "free", tweaks: ["win_background", "win_services"] } });
  if (v.processes != null) add({ id: "processes", group: "system", value: `${v.processes}`, norm: "pa.norm.processes", issue: v.processes > 160, fix: { kind: "free", tweaks: ["win_services", "win_background"] } });
  if (v.memSpeed != null && v.memRated != null)
    add({ id: "memSpeed", group: "system", value: `${v.memSpeed} MT/s`, norm: "pa.norm.memSpeed", issue: v.memSpeed < v.memRated, fix: { kind: "diy", how: "pa.diy.expo" } });
  if (v.gameDvr != null) add({ id: "gameDvr", group: "windows", value: v.gameDvr ? "pa.v.on" : "pa.v.off", norm: "pa.norm.offPlaying", issue: v.gameDvr, fix: { kind: "free", tweaks: ["win_gamedvr"] } });
  if (v.powerSaving != null) add({ id: "powerSaving", group: "windows", value: v.powerSaving ? "pa.v.balanced" : "pa.v.high", norm: "pa.norm.power", issue: v.powerSaving, fix: latency });
  if (v.notifications != null)
    add({ id: "notifications", group: "windows", value: v.notifications ? "pa.v.on" : "pa.v.off", norm: "pa.norm.offPlaying", issue: v.notifications, fix: { kind: "free", tweaks: ["win_notifications"] } });
  add({ id: "background", group: "windows", value: v.background.length ? v.background.join(", ") : "pa.v.none", norm: "pa.norm.background", issue: v.background.length > 0, fix: { kind: "diy", how: "pa.diy.background" } });
  if (v.driverDays != null) add({ id: "driverDays", group: "windows", value: `${v.driverDays} d`, norm: "pa.norm.driver", issue: v.driverDays > 180, fix: { kind: "diy", how: "pa.diy.driver" } });
  return out;
}

// ------------------------------------------------------------------ avant / après, gardés sur ce PC

const KEY = "rago.analysis";
interface Saved {
  before: Values | null;
  after: Values | null;
  /** mesures réseau des dernières analyses (10 au plus) : l'habitude du joueur ; gardées même après « Start over » */
  history?: Past[];
  /** des tweaks ont été appliqués depuis la dernière mesure : l'avant/après attend une nouvelle mesure */
  changed: boolean;
}

export function saved(): Saved {
  try {
    return { before: null, after: null, changed: false, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { before: null, after: null, changed: false };
  }
}
function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sans stockage : l'analyse reste affichée jusqu'à la fermeture */
  }
}

/** L'habitude réseau du joueur sur ce PC (analyses passées). */
export function history(): Past[] {
  return saved().history ?? [];
}

/** Range une analyse : la première devient l'« avant » ; celles faites après des tweaks, l'« après ». */
export function record(v: Values) {
  const s = saved();
  const history = [...(s.history ?? []), { at: v.at, ping: v.ping, jitter: v.jitter, loss: v.loss, spikes: v.spikes }].slice(-HISTORY);
  if (!s.before) save({ before: v, after: null, changed: false, history });
  else if (s.changed || s.after) save({ ...s, after: v, changed: false, history });
  else save({ before: v, after: null, changed: false, history });
}

/** Des tweaks viennent d'être appliqués (fin d'une application réussie). */
export function markChanged() {
  const s = saved();
  if (s.before) save({ ...s, changed: true });
}

/** Repartir de zéro : la prochaine analyse devient l'« avant ». */
export function resetBaseline() {
  save({ before: null, after: null, changed: false, history: saved().history });
}

export interface Delta {
  id: keyof Values;
  before: number;
  after: number;
  /** vrai si l'après est meilleur */
  better: boolean;
  unit: string;
}

const COMPARED: { id: keyof Values; unit: string; lowerIsBetter: boolean }[] = [
  { id: "jitter", unit: "ms", lowerIsBetter: true },
  { id: "spikes", unit: "", lowerIsBetter: true },
  { id: "loss", unit: "%", lowerIsBetter: true },
  { id: "processes", unit: "", lowerIsBetter: true },
  { id: "cpuIdle", unit: "%", lowerIsBetter: true },
  { id: "fps", unit: "FPS", lowerIsBetter: false },
  { id: "low1", unit: "FPS", lowerIsBetter: false },
  { id: "stutters", unit: "/min", lowerIsBetter: true },
];

/** Avant / après, valeur par valeur ; les FPS seulement si une partie a été jouée entre les deux mesures. */
export function deltas(before: Values, after: Values): Delta[] {
  const out: Delta[] = [];
  for (const c of COMPARED) {
    let b = before[c.id] as number | null;
    let a = after[c.id] as number | null;
    if (b == null || a == null) continue;
    if ((c.id === "fps" || c.id === "low1" || c.id === "stutters") && a === b) continue; // même partie : rien de neuf
    if (c.id === "loss") {
      b = round(b * 100) ?? 0;
      a = round(a * 100) ?? 0;
    }
    if (a === b) continue;
    out.push({ id: c.id, before: b, after: a, better: c.lowerIsBetter ? a < b : a > b, unit: c.unit });
  }
  return out;
}

/** Le meilleur gain mesuré sur ce PC, en une ligne (écran de résiliation). null : pas encore d'avant/après. */
export function lastGain(label: (id: keyof Values) => string): string | null {
  const s = saved();
  if (!s.before || !s.after) return null;
  const good = deltas(s.before, s.after).filter((d) => d.better);
  if (!good.length) return null;
  return good
    .slice(0, 2)
    .map((d) => `${label(d.id)} ${d.before}${d.unit && d.unit !== "/min" ? ` ${d.unit}` : d.unit} → ${d.after}${d.unit && d.unit !== "/min" ? ` ${d.unit}` : d.unit}`)
    .join(", ");
}
