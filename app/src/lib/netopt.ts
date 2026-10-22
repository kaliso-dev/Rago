// Network Optimizer : choix de la page, profils et valeurs exactes affichées sous les curseurs. Les formules sont celles
// de netopt.rs (`compute`, testées là-bas), elles-mêmes reprises du `:compute` de network_optimizer.bat : le moteur
// reçoit les choix, jamais ces valeurs.

export interface NetExpert {
  minRto?: number | null;
  initialRto?: number | null;
  icw?: number | null;
  ackFrequency?: number | null;
  ackTimeout?: number | null;
  dscp?: number | null;
  timestamps?: boolean | null;
  ecn?: boolean | null;
  interruptModeration?: boolean | null;
}

export interface NetOptions {
  smart: boolean;
  /** 0 = latence la plus basse, 100 = Windows */
  latency: number;
  /** 0 = Windows (stable), 100 = réactif */
  responsiveness: number;
  /** 0 auto, 1 normal, 2 restricted, 3 highly restricted, 4 disabled, 5 experimental, 6 laisser */
  tuning: number;
  /** 1 fibre, 2 câble, 3 VDSL, 4 ADSL, 5 Wi-Fi, 6 4G/5G, 7 satellite */
  line: number;
  stable: boolean;
  competitive: boolean;
  /** 0 laisser, 1 automatique, 2 valeur */
  mtuMode: number;
  mtu: number;
  delay: number;
  priority: number;
  /** 0 laisser, 1 CUBIC, 2 NewReno, 3 CTCP, 4 DCTCP, 5 BBR2 */
  congestion: number;
  priorityMode: boolean;
  powerSaving: boolean;
  wifi: boolean;
  bgGuard: boolean;
  target: string;
  preset: string;
  expert: NetExpert;
}

export interface NetSaved {
  options: NetOptions;
  at: number;
  ok: number;
  warn: number;
  fail: number;
}

export interface NetState {
  applied: NetSaved | null;
  backup: boolean;
  busy: boolean;
}

export type NetAction = "apply" | "restore" | "defaults" | "quality" | "loaded" | "mtu" | "detect" | "status";

export interface NetLine {
  action: NetAction;
  tag: "ok" | "warn" | "fail" | "info" | "title" | "progress";
  text: string;
  step: number | null;
  total: number | null;
}

export interface NetOutcome {
  code: number;
  ok: number;
  warn: number;
  fail: number;
  result: Record<string, unknown> | null;
}

export const NET_DEFAULTS: NetOptions = {
  smart: true,
  latency: 50,
  responsiveness: 60,
  tuning: 0,
  line: 1,
  stable: true,
  competitive: false,
  mtuMode: 1,
  mtu: 1500,
  delay: 30,
  priority: 60,
  congestion: 0,
  priorityMode: false,
  powerSaving: true,
  wifi: false,
  bgGuard: false,
  target: "1.1.1.1",
  preset: "balanced",
  expert: {},
};

export type PresetId = "hitreg" | "knockback" | "balanced" | "wifi" | "unstable" | "classic";
export const PRESETS: PresetId[] = ["hitreg", "knockback", "balanced", "wifi", "unstable", "classic"];

/** Profils du .bat (`:preset`) : la ligne, sa stabilité et le serveur de jeu restent, les valeurs exactes s'effacent. */
export function applyPreset(o: NetOptions, id: PresetId): NetOptions {
  const base: NetOptions = { ...o, expert: {}, mtuMode: 1, congestion: 0, tuning: 0, wifi: o.line === 5, preset: id };
  const p: Record<PresetId, Partial<NetOptions>> = {
    hitreg: { smart: true, latency: 15, responsiveness: 100, competitive: true, delay: 0, priority: 90, priorityMode: true, powerSaving: true, bgGuard: true },
    knockback: { smart: true, latency: 0, responsiveness: 85, competitive: true, delay: 0, priority: 70, priorityMode: true, powerSaving: true, bgGuard: true },
    balanced: { smart: true, latency: 50, responsiveness: 60, competitive: false, delay: 30, priority: 60, priorityMode: false, powerSaving: true, bgGuard: false },
    wifi: { line: 5, wifi: true, smart: true, latency: 40, responsiveness: 70, competitive: true, delay: 0, priority: 95, priorityMode: true, powerSaving: true, bgGuard: true },
    unstable: { stable: false, smart: true, latency: 60, responsiveness: 50, competitive: true, congestion: 1, delay: 20, priority: 70, priorityMode: true, powerSaving: true, bgGuard: true },
    classic: { smart: true, latency: 0, responsiveness: 100, tuning: 4, stable: true, competitive: false, delay: 0, priority: 0, congestion: 2, priorityMode: true, powerSaving: true, bgGuard: false },
  };
  return { ...base, ...p[id] };
}

export function dscpOf(priority: number): number {
  if (priority <= 0) return 0;
  if (priority < 20) return 32;
  if (priority < 40) return 34;
  if (priority < 60) return 40;
  if (priority < 90) return 46;
  return 48;
}

export const DSCP_NAMES: Record<number, string> = { 0: "", 32: "CS4", 34: "AF41", 40: "CS5", 46: "EF", 48: "CS6" };

const AUTO_TUNE: Record<number, string> = { 2: "restricted", 3: "highlyrestricted", 4: "disabled", 6: "highlyrestricted", 7: "restricted" };
const TUNES = ["", "normal", "restricted", "highlyrestricted", "disabled", "experimental", "keep"];

/** Valeurs exactes de Windows pour ces choix (netopt.rs, `compute`). */
export function computeNet(o: NetOptions) {
  const x = o.expert;
  const agr = 100 - o.latency;
  let im = agr >= 85 ? 2 : agr >= 60 ? 1 : 0;
  if (x.interruptModeration === true) im = 0;
  if (x.interruptModeration === false) im = 2;
  const r = o.responsiveness;
  const floors: Record<number, [number, number]> = { 2: [30, 300], 3: [40, 600], 4: [60, 1000], 5: [60, 600], 6: [100, 1000], 7: [120, 1000] };
  let [floorMin, floorIrto] = floors[o.line] ?? [20, 300];
  if (!o.stable) {
    floorMin = Math.max(floorMin, 120);
    floorIrto = 1000;
  }
  const div = (a: number, b: number) => Math.trunc(a / b);
  const minRto = x.minRto ?? Math.max(div(300 - div(r * 28, 10), 10) * 10, floorMin);
  const initialRto = x.initialRto ?? Math.max(div(1000 - r * 7, 10) * 10, floorIrto);
  const autoTuning = AUTO_TUNE[o.line] ?? "normal";
  const d = o.delay;
  const dscp = x.dscp ?? dscpOf(o.priority);
  return {
    throttlingOff: agr >= 1,
    rscOff: agr >= 20,
    coalescingOff: agr >= 40,
    flowControlOff: agr >= 50,
    lsoOff: agr >= 60,
    interruptModeration: im,
    minRto,
    initialRto,
    systemResponsiveness: 20 - div(r, 10),
    floorMin,
    floorIrto,
    timestamps: x.timestamps ?? !o.stable,
    rttResiliency: !o.stable,
    ecn: x.ecn ?? false,
    autoTuning,
    tuning: o.tuning === 0 ? autoTuning : TUNES[o.tuning],
    ackFrequency: x.ackFrequency ?? (d >= 50 ? 2 : 1),
    ackTimeout: x.ackTimeout ?? div(10 + div(d * 30, 100), 10) * 10,
    delayedAckTicks: d >= 75 ? 2 : d >= 50 ? 1 : 0,
    noDelay: d < 50,
    dscp,
    dscpName: x.dscp != null ? "" : (DSCP_NAMES[dscp] ?? ""),
  };
}
export type NetValues = ReturnType<typeof computeNet>;

// Le moteur écrit en anglais (comme le .bat) : les titres d'étape et le tableau « État actuel » sont traduits ici, le
// journal détaillé reste tel quel.
const FR_EXACT: Record<string, string> = {
  "Saving your current settings (first apply only)": "Sauvegarde de tes réglages actuels (première application)",
  TCP: "TCP",
  "ACK timing and Nagle (every network interface)": "ACK et Nagle (toutes les interfaces)",
  "Latency: buffering in Windows and the network card": "Latence : tampons de Windows et de la carte réseau",
  "Power saving": "Économie d'énergie",
  "Wi-Fi Stabilizer": "Stabilisateur Wi-Fi",
  MTU: "MTU",
  "Smart Packets": "Smart Packets",
  "Priority Mode": "Mode priorité",
  "Competitive Mode": "Mode compétitif",
  "Background Traffic Guard": "Garde du trafic en fond",
  "Resetting to Windows defaults": "Retour aux valeurs de Windows",
  "Idle latency, 30 pings": "Ping au repos, 30 pings",
  "Latency while downloading, about 12 seconds": "Ping pendant un téléchargement, environ 12 secondes",
  "Receive window tuning": "Réglage de la fenêtre de réception",
  "Congestion provider": "Contrôle de congestion",
  "Initial RTO, ms": "RTO initial, ms",
  "Minimum RTO, ms": "RTO minimum, ms",
  "Delayed ACK timeout, ms": "Délai des ACK retardés, ms",
  "Delayed ACK frequency": "Fréquence des ACK retardés",
  Timestamps: "Horodatage",
  "RTT resiliency": "Résilience RTT",
  "Receive side scaling": "Répartition de la réception (RSS)",
  "Receive segment coalescing": "Regroupement des segments (RSC)",
  "Packet coalescing filter": "Filtre de regroupement des paquets",
  "Active power plan": "Mode d'alimentation actif",
  "Network throttling index": "Bridage réseau",
  "System responsiveness": "Réactivité du système",
  "Minecraft CPU priority": "Priorité CPU de Minecraft",
  "Windows default": "Valeur de Windows",
  Enabled: "Activé",
  Disabled: "Désactivé",
  high: "haute",
  normal: "normale",
};
const FR_PATTERNS: [RegExp, string][] = [
  [/^Restoring the settings saved on (.+)$/, "Remise des réglages gardés le $1"],
  [/^Connection test towards (.+): 100 pings$/, "Test de connexion vers $1 : 100 pings"],
  [/^Measuring the MTU towards (.+)$/, "Mesure du MTU vers $1"],
];
export function engineText(text: string, lang: string): string {
  if (lang !== "fr") return text;
  const exact = FR_EXACT[text];
  if (exact) return exact;
  for (const [rx, to] of FR_PATTERNS) if (rx.test(text)) return text.replace(rx, to);
  return text;
}
