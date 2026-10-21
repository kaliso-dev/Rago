// Pont vers le moteur Rust. Hors de Tauri (navigateur, démo), un simulateur prend le relais
// pour que l'interface reste utilisable sans toucher au système.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tweaks } from "./catalog";

export interface Gpu {
  name: string;
  vendor: "nvidia" | "amd" | "intel" | "other" | string;
}

export interface SystemInfo {
  osName: string;
  osBuild: number;
  isWin11: boolean;
  hostname: string;
  cpuName: string;
  cpuVendor: "intel" | "amd" | string;
  cpuCores: number;
  cpuThreads: number;
  ramGb: number;
  ramTier: number;
  gpus: Gpu[];
  adapter: string | null;
  adapterDesc: string | null;
  linkSpeed: string | null;
  isAdmin: boolean;
  hasWmic: boolean;
  minecraftDir: string | null;
  resources: string[];
}

export interface HistoryEntry {
  id: string;
  variant: string | null;
  ts: number;
  ok: boolean;
  code: number | null;
  durationMs: number;
  /** retour à l'état d'avant (réglage décoché) */
  undo?: boolean;
}

/** Réglage appliqué (applied.json du moteur). */
export interface AppliedView {
  id: string;
  variant: string | null;
  ts: number;
  ok: boolean;
  /** état d'avant sauvegardé (sinon : appliqué avant 1.1.6, retour par les valeurs de Windows) */
  backup: boolean;
  /** Windows a changé une valeur posée par ce réglage depuis */
  drift: boolean;
  /** n'a posé que les valeurs de Windows (RBW Mod « Désactivé ») : son annulation ne lance rien */
  windowsValues?: boolean;
}

/** Usage du PC en direct, en % ; null : Windows ne fournit pas cette mesure sur ce PC. */
export interface LiveStats {
  /** false jusqu'à la première mesure (une seconde après la première demande) */
  ready: boolean;
  ram: number | null;
  cpu: number | null;
  gpu: number | null;
  /** mémoire vive utilisée et totale, en octets */
  ramUsed: number | null;
  ramTotal: number | null;
}

/** « Nettoyer » sous la RAM (memory.rs) : cache de Windows vidé et, avec l'option, mémoire rendue par les applis en
 * arrière-plan, en octets. */
export interface Cleaned {
  standby: number;
  trimmed: number;
  apps: number;
}

/** Parties du rapport pour le support (page « Partage et support »). */
export interface ReportParts {
  pc: boolean;
  tweaks: boolean;
  history: boolean;
  logs: boolean;
  network: boolean;
}

/** Rapport écrit dans le dossier reports de l'app (report.rs), déjà masqué. */
export interface SupportReport {
  path: string;
  name: string;
  size: number;
  text: string;
}

/** Jeu de la bibliothèque (games.rs). */
export interface Game {
  /** "steam:730", "epic:Fortnite", "riot:valorant", "mc:lunar", "manual:1a2b3c4d"… */
  id: string;
  name: string;
  launcher: "steam" | "epic" | "riot" | "battlenet" | "ubisoft" | "xbox" | "minecraft" | "manual" | string;
  /** launcher Minecraft (Lunar Client…) */
  client: string | null;
  kind: "minecraft" | "shooter" | "other" | string;
  installDir: string | null;
  lastPlayed: number | null;
  running: boolean;
}

/** Launcher installé (games.rs) : Steam, Epic Games, Lunar Client… */
export interface Launcher {
  id: string;
  name: string;
  minecraft: boolean;
  running: boolean;
}

/** Mesure du test réseau (nettest.rs), en ms ; perte de 0 à 1. */
export interface NetMeasure {
  id: string;
  ping: number | null;
  best: number | null;
  jitter: number | null;
  loss: number;
  samples: number;
  /** "dns" : serveur introuvable ; "timeout" : aucune réponse */
  error: string | null;
}

/** Mise à jour de l'app téléchargée et vérifiée, prête à installer (update.rs). */
export interface UpdateReady {
  version: string;
  notes: string | null;
}

/** Mode arrière-plan et barre en jeu (background.rs, overlay.rs). */
export interface BackgroundPrefs {
  tray: boolean;
  /** activé d'office tant que le joueur ne l'a pas coupé (autostartChosen) */
  autostart: boolean;
  autostartChosen?: boolean;
  overlay: boolean;
  shortcut: string;
  pin: boolean;
  lang: string;
}
export interface BackgroundState {
  prefs: BackgroundPrefs;
  /** la tâche de lancement avec Windows existe */
  autostart: boolean;
  /** raccourci refusé par Windows (déjà pris par une autre app) */
  shortcutTaken: boolean;
  /** FPS mesurables (PresentMon livré avec l'app) */
  fpsAvailable: boolean;
}
export type OverlayMode = "hidden" | "panel" | "pill";
export interface OverlayInfo {
  mode: OverlayMode;
  game: string | null;
  shortcut: string;
  pin: boolean;
  fpsAvailable: boolean;
  shortcutTaken: boolean;
  /** barre ouverte sans prendre le premier plan au jeu (Minecraft) : le clavier reste au jeu */
  passive: boolean;
}
export interface OverlayLive {
  fps: number | null;
  ping: number | null;
}

/** Ce que lit le vérificateur de Ranked Bedwars (rbw.rs). */
export interface RbwCheck {
  name: string;
  kind: "service" | "setting";
  ok: boolean;
  state: "running" | "stopped" | "starting" | "stopping" | "paused" | "missing" | "on" | "off";
  start: "auto" | "manual" | "disabled" | "boot" | "system" | null;
}

/** Page Outils (tools.rs). */
export type CleanAreaId = "temp" | "windows_temp" | "update" | "crash" | "browsers" | "discord" | "shaders" | "recycle";
export interface CleanArea {
  id: CleanAreaId;
  bytes: number;
  files: number;
}
export interface CleanResult {
  bytes: number;
  files: number;
  /** fichiers en cours d'utilisation, laissés en place */
  skipped: number;
}
export interface BloatApp {
  /** nom du paquet */
  id: string;
  name: { en: string; fr: string };
}
export interface Driver {
  kind: "gpu" | "network" | "audio";
  name: string;
  version: string;
  /** AAAA-MM-JJ */
  date: string | null;
  provider: string;
}
export interface DriversInfo {
  drivers: Driver[];
  /** fabricant de la carte mère, ou du portable */
  maker: string | null;
  model: string | null;
}

export interface MinecraftStatus {
  dirExists: boolean;
  optifineFile: boolean;
  backups: number;
}

export interface RunItem {
  id: string;
  variant?: string | null;
  params?: Record<string, unknown>;
  /** décoché : remettre l'état d'avant */
  undo?: boolean;
}

export type LicenseState = "active" | "none" | "expired" | "unconfigured";

export interface LicenseStatus {
  state: LicenseState;
  email: string | null;
  plan: string | null;
  keyHint: string | null;
  expiresAt: number | null;
  needsRefresh: boolean;
  deviceName: string;
}

export type LoginResult =
  | { kind: "activationRequired"; email: string; keyHint: string | null }
  | { kind: "active"; status: LicenseStatus };

/** Erreur du contrat de licence : code stable, message anglais du serveur, lien d'achat. */
export interface LicenseError {
  code: string;
  message: string | null;
  buyUrl: string | null;
}

export function asLicenseError(err: unknown): LicenseError {
  const e = (err ?? {}) as Partial<LicenseError>;
  return { code: e.code ?? "server_error", message: e.message ?? null, buyUrl: e.buyUrl ?? null };
}

export type ItemStatus = "pending" | "running" | "ok" | "error" | "skipped";

export interface ItemEvent {
  runId: string;
  index: number;
  id: string;
  variant: string | null;
  status: Exclude<ItemStatus, "pending">;
  code: number | null;
  durationMs: number | null;
  message: string | null;
}
export interface LogEvent {
  runId: string;
  id: string;
  line: string;
}
export interface DoneEvent {
  runId: string;
  ok: number;
  failed: number;
  /** pas lancés : le point de restauration n'a pas pu être créé */
  skipped: number;
  restoreFailed: boolean;
  cancelled: boolean;
  logFile: string;
}
/** Remise à zéro faite par le moteur, sans fenêtre (fin de Premium, déconnexion). */
export interface ResetDone {
  ok: number;
  failed: number;
}

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Presse-papiers de WebView2 ; à défaut (page sans focus), l'ancienne méthode du champ caché. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* on essaie l'autre méthode */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("clipboard");
}

export interface Api {
  systemInfo(refresh?: boolean): Promise<SystemInfo>;
  runTweaks(items: RunItem[]): Promise<string>;
  cancelRun(): Promise<void>;
  isRunning(): Promise<boolean>;
  history(): Promise<HistoryEntry[]>;
  clearHistory(): Promise<void>;
  applied(): Promise<AppliedView[]>;
  /** « Tout annuler » : réglages appliqués sur ce PC, dans l'ordre de la remise à zéro (le dernier appliqué en premier). */
  undoAllPlan(): Promise<string[]>;
  /** Déconnexion : réglages que le moteur remettra en arrière-plan (tous ceux qu'il sait remettre, gratuits compris). */
  signOutPlan(): Promise<string[]>;
  /** Vrai une seule fois, au lancement où la réparation du moteur a supprimé une valeur (RAG-67) : il faut redémarrer. */
  takeRepairNotice(): Promise<boolean>;
  liveStats(): Promise<LiveStats>;
  openTaskManager(): Promise<void>;
  /** Vide le cache mémoire de Windows ; `trim` : réduit aussi les applis en arrière-plan (option des paramètres). */
  cleanRam(trim: boolean): Promise<Cleaned>;
  minecraftStatus(dir?: string | null): Promise<MinecraftStatus>;
  rbwStatus(): Promise<RbwCheck[]>;
  toolsScan(): Promise<CleanArea[]>;
  toolsClean(areas: CleanAreaId[]): Promise<CleanResult>;
  toolsApps(): Promise<BloatApp[]>;
  /** Premium ; renvoie les applis encore installées */
  toolsRemoveApps(ids: string[]): Promise<BloatApp[]>;
  toolsDrivers(): Promise<DriversInfo>;
  /** Paramètres Windows, mises à jour facultatives (pilotes) */
  toolsWindowsUpdate(): Promise<void>;
  minecraftRestore(dir?: string | null): Promise<string>;
  restartPc(): Promise<void>;
  openFolder(kind: "logs" | "resources" | "data"): Promise<void>;
  pickFolder(title: string): Promise<string | null>;
  /** Rapport pour le support : écrit sur ce PC, rien n'est envoyé. */
  supportReport(parts: ReportParts): Promise<SupportReport>;
  /** Montre le rapport dans l'Explorateur (fichier sélectionné). */
  showReport(name: string): Promise<void>;
  /** Enregistre un code de preset dans un fichier .rago choisi par le joueur ; false : fenêtre fermée sans choisir. */
  savePresetFile(code: string, fileName: string, title: string): Promise<boolean>;
  /** Lit un fichier .rago choisi par le joueur ; null : fenêtre fermée sans choisir. */
  openPresetFile(title: string): Promise<string | null>;
  copyText(text: string): Promise<void>;
  /** Test réseau vers les serveurs donnés (identifiants de nettest.rs). */
  netTest(ids: string[]): Promise<NetMeasure[]>;
  onNetMeasure(cb: (m: NetMeasure) => void): Promise<UnlistenFn>;
  /** Jeux installés (launchers et ajoutés à la main) ; `refresh` : nouvelle recherche sur le PC. */
  gamesList(refresh: boolean): Promise<Game[]>;
  /** Image officielle du jeu (data: URL), null s'il n'y en a pas. */
  gameArt(id: string): Promise<string | null>;
  /** Lance le jeu par son launcher, sans droits d'administrateur. */
  gameLaunch(id: string): Promise<void>;
  /** Launchers installés ; `refresh` : nouvelle recherche sur le PC. */
  launchersList(refresh: boolean): Promise<Launcher[]>;
  /** Ouvre le launcher, sans droits d'administrateur. */
  launcherLaunch(id: string): Promise<void>;
  /** Icône de l'exe du launcher (data: URL PNG), null s'il n'en a pas. */
  launcherIcon(id: string): Promise<string | null>;
  /** Ajoute un jeu à la main (choix d'un .exe) ; id du jeu, null si la fenêtre est fermée sans choisir. */
  gameAdd(title: string): Promise<string | null>;
  /** Retire un jeu de la bibliothèque (rien n'est désinstallé). */
  gameRemove(id: string): Promise<void>;
  gamesUnhide(): Promise<void>;
  /** Jeux lancés en ce moment (id), à chaque changement. */
  onGamesRunning(cb: (ids: string[]) => void): Promise<UnlistenFn>;
  /** Mise à jour prête (null : rien en attente). */
  updateReady(): Promise<UpdateReady | null>;
  onUpdateReady(cb: (u: UpdateReady) => void): Promise<UnlistenFn>;
  /** Installe la mise à jour et rouvre l'app (l'app se ferme : ne revient qu'en cas d'échec). */
  updateInstall(): Promise<void>;
  backgroundGet(): Promise<BackgroundState>;
  /** Erreurs : "shortcut" (raccourci illisible), "autostart:…" (tâche planifiée refusée). */
  backgroundSet(prefs: BackgroundPrefs): Promise<BackgroundState>;
  /** Barre en jeu (fenêtre « overlay ») */
  overlayInfo(): Promise<OverlayInfo>;
  overlayLive(): Promise<OverlayLive>;
  overlayClose(): Promise<void>;
  overlaySetPin(pin: boolean): Promise<void>;
  /** Ferme la barre et ouvre l'app (page : id de page, ou "premium" pour l'offre). */
  overlayOpenApp(page?: string): Promise<void>;
  onOverlayMode(cb: (mode: OverlayMode) => void): Promise<UnlistenFn>;
  /** Fenêtre principale : page demandée depuis la barre en jeu. */
  onGoto(cb: (page: string) => void): Promise<UnlistenFn>;
  openUrl(url: string): Promise<void>;
  onItem(cb: (e: ItemEvent) => void): Promise<UnlistenFn>;
  onLog(cb: (e: LogEvent) => void): Promise<UnlistenFn>;
  onDone(cb: (e: DoneEvent) => void): Promise<UnlistenFn>;
  onReset(cb: (e: ResetDone) => void): Promise<UnlistenFn>;
  licenseStatus(): Promise<LicenseStatus>;
  licenseLogin(email: string, password: string): Promise<LoginResult>;
  licenseActivate(): Promise<LicenseStatus>;
  licenseRefresh(): Promise<LicenseStatus>;
  licenseSignOut(): Promise<void>;
  window: { minimize(): void; toggleMaximize(): void; close(): void };
}

const tauriApi: Api = {
  systemInfo: (refresh) => invoke("get_system_info", { refresh: refresh ?? false }),
  runTweaks: (items) => invoke("run_tweaks", { items }),
  cancelRun: () => invoke("cancel_run"),
  isRunning: () => invoke("is_running"),
  history: () => invoke("get_history"),
  clearHistory: () => invoke("clear_history"),
  applied: () => invoke("get_applied"),
  undoAllPlan: () => invoke("undo_all_plan"),
  signOutPlan: () => invoke("sign_out_plan"),
  takeRepairNotice: () => invoke("take_repair_notice"),
  liveStats: () => invoke("live_stats"),
  openTaskManager: () => invoke("open_task_manager"),
  cleanRam: (trim) => invoke("clean_ram", { trim }),
  minecraftStatus: (dir) => invoke("minecraft_status", { dir: dir ?? null }),
  rbwStatus: () => invoke("rbw_status"),
  toolsScan: () => invoke("tools_scan"),
  toolsClean: (areas) => invoke("tools_clean", { areas }),
  toolsApps: () => invoke("tools_apps"),
  toolsRemoveApps: (ids) => invoke("tools_remove_apps", { ids }),
  toolsDrivers: () => invoke("tools_drivers"),
  toolsWindowsUpdate: () => invoke("tools_windows_update"),
  minecraftRestore: (dir) => invoke("minecraft_restore", { dir: dir ?? null }),
  restartPc: () => invoke("restart_pc"),
  openFolder: (kind) => invoke("open_folder", { kind }),
  pickFolder: async (title) => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const r = await open({ directory: true, title });
    return typeof r === "string" ? r : null;
  },
  openUrl: async (url) => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  },
  supportReport: (parts) => invoke("support_report", { parts }),
  showReport: (name) => invoke("show_report", { name }),
  savePresetFile: async (code, fileName, title) => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ title, defaultPath: fileName, filters: [{ name: "Rago preset", extensions: ["rago"] }] });
    if (!path) return false;
    await invoke("save_preset_file", { path: /\.rago$/i.test(path) ? path : `${path}.rago`, code });
    return true;
  },
  openPresetFile: async (title) => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ title, multiple: false, directory: false, filters: [{ name: "Rago preset", extensions: ["rago"] }] });
    return typeof path === "string" ? invoke<string>("read_preset_file", { path }) : null;
  },
  copyText,
  netTest: (ids) => invoke("net_test", { ids }),
  onNetMeasure: (cb) => listen<NetMeasure>("nettest:measure", (e) => cb(e.payload)),
  gamesList: (refresh) => invoke("games_list", { refresh }),
  gameArt: (id) => invoke("game_art", { id }),
  gameLaunch: (id) => invoke("game_launch", { id }),
  launchersList: (refresh) => invoke("launchers_list", { refresh }),
  launcherLaunch: (id) => invoke("launcher_launch", { id }),
  launcherIcon: (id) => invoke("launcher_icon", { id }),
  gameAdd: async (title) => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ title, multiple: false, directory: false, filters: [{ name: "Program", extensions: ["exe"] }] });
    return typeof path === "string" ? invoke<string>("game_add", { path }) : null;
  },
  gameRemove: (id) => invoke("game_remove", { id }),
  gamesUnhide: () => invoke("games_unhide"),
  onGamesRunning: (cb) => listen<string[]>("games:running", (e) => cb(e.payload)),
  updateReady: () => invoke("update_ready"),
  onUpdateReady: (cb) => listen<UpdateReady>("update:ready", (e) => cb(e.payload)),
  updateInstall: () => invoke("update_install"),
  backgroundGet: () => invoke("background_get"),
  backgroundSet: (prefs) => invoke("background_set", { prefs }),
  overlayInfo: () => invoke("overlay_info"),
  overlayLive: () => invoke("overlay_live"),
  overlayClose: () => invoke("overlay_close"),
  overlaySetPin: (pin) => invoke("overlay_set_pin", { pin }),
  overlayOpenApp: (page) => invoke("overlay_open_app", { page: page ?? null }),
  onOverlayMode: (cb) => listen<OverlayMode>("overlay:mode", (e) => cb(e.payload)),
  onGoto: (cb) => listen<string>("app:goto", (e) => cb(e.payload)),
  licenseStatus: () => invoke("license_status"),
  licenseLogin: (email, password) => invoke("license_login", { email, password }),
  licenseActivate: () => invoke("license_activate"),
  licenseRefresh: () => invoke("license_refresh"),
  licenseSignOut: () => invoke("license_sign_out"),
  onItem: (cb) => listen<ItemEvent>("run:item", (e) => cb(e.payload)),
  onLog: (cb) => listen<LogEvent>("run:log", (e) => cb(e.payload)),
  onDone: (cb) => listen<DoneEvent>("run:done", (e) => cb(e.payload)),
  onReset: (cb) => listen<ResetDone>("reset:done", (e) => cb(e.payload)),
  window: {
    minimize: () => void import("@tauri-apps/api/window").then((w) => w.getCurrentWindow().minimize()),
    toggleMaximize: () => void import("@tauri-apps/api/window").then((w) => w.getCurrentWindow().toggleMaximize()),
    close: () => void import("@tauri-apps/api/window").then((w) => w.getCurrentWindow().close()),
  },
};

// ---------------------------------------------------------------- simulateur

const bus = new EventTarget();
const on = <T,>(name: string, cb: (e: T) => void): Promise<UnlistenFn> => {
  const h = (e: Event) => cb((e as CustomEvent<T>).detail);
  bus.addEventListener(name, h);
  return Promise.resolve(() => bus.removeEventListener(name, h));
};
const emit = <T,>(name: string, detail: T) => bus.dispatchEvent(new CustomEvent(name, { detail }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MB = 1024 ** 2;
const mockAreas: CleanArea[] = [
  { id: "temp", bytes: 1840 * MB, files: 6214 },
  { id: "windows_temp", bytes: 412 * MB, files: 893 },
  { id: "update", bytes: 2630 * MB, files: 148 },
  { id: "crash", bytes: 96 * MB, files: 23 },
  { id: "browsers", bytes: 1210 * MB, files: 9431 },
  { id: "discord", bytes: 388 * MB, files: 1290 },
  { id: "shaders", bytes: 742 * MB, files: 2051 },
  { id: "recycle", bytes: 205 * MB, files: 31 },
];
let mockBloat: BloatApp[] = [
  { id: "Microsoft.BingNews", name: { en: "News", fr: "Actualités" } },
  { id: "Microsoft.BingWeather", name: { en: "Weather", fr: "Météo" } },
  { id: "Microsoft.GetHelp", name: { en: "Get Help", fr: "Obtenir de l'aide" } },
  { id: "Microsoft.Getstarted", name: { en: "Tips", fr: "Astuces" } },
  { id: "Microsoft.MicrosoftSolitaireCollection", name: { en: "Solitaire Collection", fr: "Solitaire Collection" } },
  { id: "Microsoft.WindowsFeedbackHub", name: { en: "Feedback Hub", fr: "Hub de commentaires" } },
  { id: "Clipchamp.Clipchamp", name: { en: "Clipchamp", fr: "Clipchamp" } },
  { id: "MSTeams", name: { en: "Teams (personal)", fr: "Teams (personnel)" } },
  { id: "Microsoft.OutlookForWindows", name: { en: "Outlook (new)", fr: "Outlook (nouveau)" } },
  { id: "king.com.CandyCrushSaga", name: { en: "Candy Crush Saga", fr: "Candy Crush Saga" } },
  { id: "SpotifyAB.SpotifyMusic", name: { en: "Spotify", fr: "Spotify" } },
  { id: "BytedancePte.Ltd.TikTok", name: { en: "TikTok", fr: "TikTok" } },
];

const mockHistory: HistoryEntry[] = [];
const hour = 3_600_000;
// démo : bibliothèque type d'un joueur de PvP Minecraft ; les images restent des tuiles au nom du jeu
let mockLaunchers: Launcher[] = [
  { id: "steam", name: "Steam", minecraft: false, running: true },
  { id: "epic", name: "Epic Games", minecraft: false, running: false },
  { id: "riot", name: "Riot Client", minecraft: false, running: false },
  { id: "battlenet", name: "Battle.net", minecraft: false, running: false },
  { id: "lunar", name: "Lunar Client", minecraft: true, running: false },
  { id: "minecraft", name: "Minecraft Launcher", minecraft: true, running: false },
  { id: "xbox", name: "Xbox", minecraft: false, running: false },
];
let mockGames: Game[] = [
  { id: "mc:lunar", name: "Minecraft", launcher: "minecraft", client: "Lunar Client", kind: "minecraft", installDir: null, lastPlayed: Date.now() - 2 * hour, running: false },
  { id: "mc:badlion", name: "Minecraft", launcher: "minecraft", client: "Badlion Client", kind: "minecraft", installDir: null, lastPlayed: Date.now() - 50 * hour, running: false },
  { id: "riot:valorant", name: "VALORANT", launcher: "riot", client: null, kind: "shooter", installDir: null, lastPlayed: Date.now() - 26 * hour, running: false },
  { id: "steam:730", name: "Counter-Strike 2", launcher: "steam", client: null, kind: "shooter", installDir: null, lastPlayed: null, running: false },
  { id: "epic:Fortnite", name: "Fortnite", launcher: "epic", client: null, kind: "shooter", installDir: null, lastPlayed: null, running: false },
  { id: "epic:Sugar", name: "Rocket League", launcher: "epic", client: null, kind: "other", installDir: null, lastPlayed: null, running: false },
];
let mockStatsStart = 0;
const mockLoad = { ram: 47, cpu: 14, gpu: 9 };
// démo : les réglages appliqués survivent au rechargement de la page, comme applied.json dans l'app
const mockApplied = new Map<string, AppliedView>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem("rago.demoApplied") ?? "[]") as [string, AppliedView][];
    } catch {
      return [];
    }
  })(),
);
const saveMockApplied = () => {
  try {
    localStorage.setItem("rago.demoApplied", JSON.stringify([...mockApplied]));
  } catch {
    /* démo sans stockage */
  }
};
let mockCancel = false;
let mockRunning = false;

const MOCK_LINES = [
  "Opération réussie.",
  'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f',
  "L'opération a réussi.",
  "Ok.",
  'powercfg -setacvalueindex scheme_current sub_processor PERFINCTHRESHOLD 10',
  "SUCCÈS : la tâche planifiée a été modifiée.",
];

let demoEmail: string | null = (() => {
  try {
    return localStorage.getItem("rago.demoLicense");
  } catch {
    return null;
  }
})();

function mockLicense(): LicenseStatus {
  return {
    state: demoEmail ? "active" : "none",
    email: demoEmail,
    plan: demoEmail ? "premium" : null,
    keyHint: demoEmail ? "RAGO-9EGJN-•••••-•••••-VKXDS" : null,
    expiresAt: demoEmail ? Date.now() + 30 * 86_400_000 : null,
    needsRefresh: false,
    deviceName: "PC-DEMO",
  };
}

let demoPending: string | null = null;
let mockBackground: BackgroundPrefs = { tray: true, autostart: true, overlay: true, shortcut: "Ctrl+Shift+R", pin: false, lang: "fr" };

/** Démo : la remise du moteur à la fin de la licence (tous les réglages remis en arrière-plan). */
function mockReset() {
  const ids = [...mockApplied.keys()];
  if (!ids.length) return;
  setTimeout(() => {
    for (const id of ids) mockApplied.delete(id);
    saveMockApplied();
    emit<ResetDone>("reset:done", { ok: ids.length, failed: 0 });
  }, 1500);
}

const mockApi: Api = {
  systemInfo: async () => {
    await sleep(500);
    return {
      osName: "Windows 11 Pro 24H2",
      osBuild: 26100,
      isWin11: true,
      hostname: "PC-DEMO",
      cpuName: "AMD Ryzen 7 7800X3D 8-Core Processor",
      cpuVendor: "amd",
      cpuCores: 8,
      cpuThreads: 16,
      ramGb: 32,
      ramTier: 32,
      gpus: [{ name: "NVIDIA GeForce RTX 4070", vendor: "nvidia" }],
      adapter: "Ethernet",
      adapterDesc: "Realtek PCIe 2.5GbE Family Controller",
      linkSpeed: "1 Gbps",
      isAdmin: true,
      hasWmic: false,
      minecraftDir: "C:\\Users\\demo\\AppData\\Roaming\\.minecraft",
      resources: ["nvidiaProfileInspector.exe", "extremelatencylow.nip"],
    };
  },
  runTweaks: async (items) => {
    const runId = `demo-${Date.now()}`;
    mockCancel = false;
    mockRunning = true;
    void (async () => {
      let ok = 0;
      let failed = 0;
      let skipped = 0;
      let restoreFailed = false;
      // démo : localStorage « rago.demoRestoreFail » = 1 simule un point de restauration impossible
      const failRestore = (() => {
        try {
          return localStorage.getItem("rago.demoRestoreFail") === "1";
        } catch {
          return false;
        }
      })();
      for (const [index, it] of items.entries()) {
        if (mockCancel) break;
        const base = { runId, index, id: it.id, variant: it.variant ?? null, code: null, durationMs: null, message: null };
        if (restoreFailed && !it.undo && !["rst_open", "app_settings"].includes(it.id)) {
          skipped++;
          emit<ItemEvent>("run:item", { ...base, status: "skipped" });
          continue;
        }
        emit<ItemEvent>("run:item", { ...base, status: "running" });
        if (it.id === "rst_point" && failRestore) {
          await sleep(400);
          failed++;
          restoreFailed = true;
          emit<LogEvent>("run:log", { runId, id: it.id, line: "Checkpoint-Computer : System Restore is turned off for this drive." });
          emit<ItemEvent>("run:item", { ...base, status: "error", code: 1 });
          continue;
        }
        const t0 = performance.now();
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n && !mockCancel; i++) {
          await sleep(120 + Math.random() * 220);
          emit<LogEvent>("run:log", { runId, id: it.id, line: MOCK_LINES[(index + i) % MOCK_LINES.length] });
        }
        const durationMs = Math.round(performance.now() - t0);
        ok++;
        const tw = tweaks.get(it.id);
        const revert = !!tw?.variants?.find((v) => v.id === it.variant)?.revert;
        // comme le moteur (runner.rs) : la variante de retour arrière d'un réglage appliqué est notée comme une
        // annulation, sauf celle du RBW Mod, qui lance « Activé » en entier
        const undo = !!it.undo || (revert && mockApplied.has(it.id) && it.id !== "rbw_mode");
        mockHistory.push({ id: it.id, variant: it.variant ?? null, ts: Date.now(), ok: true, code: 0, durationMs, undo });
        if (it.undo || (revert && mockApplied.has(it.id))) mockApplied.delete(it.id);
        else if (tw?.kind === "tweak" && !revert)
          // RBW Mod « Désactivé » : valeurs de Windows, sans sauvegarde (moteur : runner.rs)
          mockApplied.set(it.id, { id: it.id, variant: it.variant ?? null, ts: Date.now(), ok: true, backup: it.id !== "rbw_mode", drift: false, windowsValues: it.id === "rbw_mode" });
        saveMockApplied();
        emit<ItemEvent>("run:item", { ...base, status: "ok", code: 0, durationMs });
      }
      mockRunning = false;
      emit<DoneEvent>("run:done", { runId, ok, failed, skipped, restoreFailed, cancelled: mockCancel, logFile: "C:\\Users\\demo\\AppData\\Roaming\\gg.rago.optimizer\\logs\\demo.log" });
    })();
    return runId;
  },
  cancelRun: async () => {
    mockCancel = true;
  },
  isRunning: async () => mockRunning,
  history: async () => [...mockHistory],
  clearHistory: async () => {
    mockHistory.length = 0;
  },
  applied: async () => [...mockApplied.values()],
  undoAllPlan: async () => [...mockApplied.values()].sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id)).map((a) => a.id),
  signOutPlan: async () => [...mockApplied.values()].sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id)).map((a) => a.id),
  // démo : localStorage « rago.demoRepair » = 1 simule une réparation au lancement
  takeRepairNotice: async () => {
    try {
      return localStorage.getItem("rago.demoRepair") === "1";
    } catch {
      return false;
    }
  },
  liveStats: async () => {
    // démo : valeurs simulées ; localStorage « rago.demoNoGpu » = 1 simule un PC sans compteur de carte graphique
    mockStatsStart ||= Date.now();
    if (Date.now() - mockStatsStart < 1000) return { ready: false, ram: null, cpu: null, gpu: null, ramUsed: null, ramTotal: null };
    const drift = (v: number, step: number, min: number, max: number) => Math.min(max, Math.max(min, v + (Math.random() - 0.5) * step));
    mockLoad.ram = drift(mockLoad.ram, 1.5, 38, 64);
    mockLoad.cpu = drift(mockLoad.cpu, 10, 3, 60);
    mockLoad.gpu = drift(mockLoad.gpu, 14, 0, 75);
    let noGpu = false;
    try {
      noGpu = localStorage.getItem("rago.demoNoGpu") === "1";
    } catch {
      /* rien */
    }
    const ramTotal = 32 * 1024 ** 3;
    return { ready: true, ram: mockLoad.ram, cpu: mockLoad.cpu, gpu: noGpu ? null : mockLoad.gpu, ramUsed: (mockLoad.ram / 100) * ramTotal, ramTotal };
  },
  openTaskManager: async () => {
    console.info("[démo] Gestionnaire des tâches");
  },
  cleanRam: async (trim) => {
    await sleep(900);
    const gb = 1024 ** 3;
    return { standby: (1.2 + Math.random() * 1.6) * gb, trimmed: trim ? 0.4 * gb : 0, apps: trim ? 7 : 0 };
  },
  minecraftStatus: async () => ({ dirExists: true, optifineFile: true, backups: 1 }),
  // démo : SysMain et PcaSvc arrêtés, Prefetch coupé (ce que le RBW Mod « Activé » corrige)
  rbwStatus: async () => {
    const svc = (name: string, state: RbwCheck["state"], start: RbwCheck["start"]): RbwCheck => ({ name, kind: "service", ok: state === "running", state, start });
    const set = (name: string, ok: boolean): RbwCheck => ({ name, kind: "setting", ok, state: ok ? "on" : "off", start: null });
    const fixed = mockApplied.get("rbw_mode")?.variant === "on";
    return [
      svc("SysMain", fixed ? "running" : "stopped", fixed ? "auto" : "disabled"),
      svc("PcaSvc", fixed ? "running" : "stopped", fixed ? "auto" : "manual"),
      ...["DPS", "BAM", "EventLog", "WSearch", "DusmSvc", "BFE", "AppInfo", "DCOMLaunch", "PlugPlay", "CDPUserSvc_4f1a2"].map((n) =>
        svc(n, "running", n === "BAM" ? "system" : n === "AppInfo" || n === "PlugPlay" ? "manual" : "auto"),
      ),
      set("CMD", true),
      set("PowerShell Scriptblock Logging", true),
      set("Activities Cache", true),
      set("Prefetch", fixed),
      set("Jump Lists", true),
      set("PCA Logging", true),
    ];
  },
  toolsScan: async () => {
    await sleep(900);
    return mockAreas.map((a) => ({ ...a }));
  },
  toolsClean: async (areas) => {
    await sleep(1400);
    let bytes = 0;
    let files = 0;
    for (const a of mockAreas) {
      if (!areas.includes(a.id)) continue;
      // démo : un peu reste en place (navigateur ouvert)
      const kept = a.id === "browsers" ? 0.08 : 0;
      bytes += a.bytes * (1 - kept);
      files += Math.round(a.files * (1 - kept));
      a.bytes *= kept;
      a.files = Math.round(a.files * kept);
    }
    return { bytes, files, skipped: areas.includes("browsers") ? 37 : 0 };
  },
  toolsApps: async () => {
    await sleep(700);
    return [...mockBloat];
  },
  toolsRemoveApps: async (ids) => {
    await sleep(1600);
    mockBloat = mockBloat.filter((a) => !ids.includes(a.id));
    return [...mockBloat];
  },
  toolsDrivers: async () => {
    await sleep(1100);
    return {
      drivers: [
        { kind: "gpu", name: "NVIDIA GeForce RTX 4070", version: "32.0.15.6094", date: "2024-08-14", provider: "NVIDIA" },
        { kind: "network", name: "Realtek PCIe 2.5GbE Family Controller", version: "10.68.1003.2023", date: "2023-10-03", provider: "Realtek" },
        { kind: "audio", name: "Realtek High Definition Audio", version: "6.0.9235.1", date: "2021-09-10", provider: "Realtek Semiconductor Corp." },
      ],
      maker: "ASUSTeK COMPUTER INC.",
      model: "ROG STRIX B650-A GAMING WIFI",
    };
  },
  toolsWindowsUpdate: async () => {},
  minecraftRestore: async () => "optionsof.txt restored (demo)",
  restartPc: async () => {},
  openFolder: async () => {},
  pickFolder: async () => "C:\\Users\\demo\\AppData\\Roaming\\.minecraft",
  openUrl: async (url) => {
    window.open(url, "_blank", "noopener");
  },
  supportReport: async (parts) => {
    await sleep(700);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
    const sections = [
      "Rago Optimizer support report (demo)",
      parts.pc ? "\n== PC ==\nWindows: Windows 11 Pro 24H2 (build 26100, Windows 11)" : "",
      parts.network ? "\n== Network adapter ==\nModel: Realtek PCIe 2.5GbE Family Controller" : "",
      parts.tweaks ? `\n== Tweaks applied (${mockApplied.size}) ==\n${[...mockApplied.keys()].join("\n")}` : "",
      parts.history ? `\n== Last 50 changes ==\n${mockHistory.length} in this demo` : "",
      parts.logs ? "\n== Last 3 optimization logs ==\nNo optimization yet" : "",
    ].filter(Boolean);
    const text = sections.join("\n");
    return { path: `C:\\Users\\<user>\\AppData\\Roaming\\gg.rago.optimizer\\reports\\rago-report-${stamp}.txt`, name: `rago-report-${stamp}.txt`, size: text.length + 9_000, text };
  },
  showReport: async (name) => {
    console.info(`[démo] rapport ${name}`);
  },
  savePresetFile: async (code, fileName) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return true;
  },
  openPresetFile: () =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".rago";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        void f.text().then((s) => resolve(s.trim()));
      };
      input.click();
    }),
  copyText,
  netTest: async (ids) => {
    // démo : valeurs plausibles depuis Paris, chaque serveur fini à son rythme
    const base: Record<string, number> = { hypixel: 92, minemen: 21, paris: 9, frankfurt: 17, london: 14, stockholm: 33, madrid: 28, virginia: 86, internet: 7 };
    return Promise.all(
      ids.map(async (id) => {
        await sleep(900 + Math.random() * 1400);
        const ping = Math.round(((base[id] ?? 40) + Math.random() * 4) * 10) / 10;
        const m: NetMeasure = { id, ping, best: Math.round((ping - 1.5) * 10) / 10, jitter: Math.round((0.6 + Math.random() * 2.4) * 10) / 10, loss: 0, samples: id === "hypixel" || id === "minemen" ? 5 : 10, error: null };
        emit("nettest:measure", m);
        return m;
      }),
    );
  },
  onNetMeasure: (cb) => on("nettest:measure", cb),
  gamesList: async () => {
    await sleep(400);
    return [...mockGames].sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name));
  },
  gameArt: async () => null,
  gameLaunch: async (id) => {
    await sleep(500);
    mockGames = mockGames.map((g) => (g.id === id ? { ...g, lastPlayed: Date.now() } : g));
  },
  launchersList: async () => {
    await sleep(300);
    return mockLaunchers;
  },
  launcherLaunch: async (id) => {
    await sleep(400);
    mockLaunchers = mockLaunchers.map((l) => (l.id === id ? { ...l, running: true } : l));
  },
  // démo : pas d'exe à lire ; les captures peuvent fournir des icônes (window.__launcherIcons)
  launcherIcon: async (id) => (window as unknown as { __launcherIcons?: Record<string, string> }).__launcherIcons?.[id] ?? null,
  gameAdd: async () => null,
  gameRemove: async (id) => {
    mockGames = mockGames.filter((g) => g.id !== id);
  },
  gamesUnhide: async () => {},
  onGamesRunning: (cb) => on("games:running", cb),
  // démo : une mise à jour attend avec ?update dans l'adresse
  updateReady: async () => (new URLSearchParams(location.search).has("update") ? { version: "1.2.1", notes: null } : null),
  onUpdateReady: (cb) => on("update:ready", cb),
  updateInstall: async () => {
    await sleep(1200);
    location.reload();
  },
  backgroundGet: async () => ({ prefs: mockBackground, autostart: mockBackground.autostart, shortcutTaken: false, fpsAvailable: true }),
  backgroundSet: async (prefs) => {
    await sleep(250);
    if (!/^((Ctrl|Alt|Shift|Super)\+)*(F\d{1,2}|[A-Z0-9]|[A-Za-z]+)$/.test(prefs.shortcut) || /\+$/.test(prefs.shortcut)) throw "shortcut";
    mockBackground = { ...prefs };
    return { prefs: mockBackground, autostart: prefs.autostart, shortcutTaken: false, fpsAvailable: true };
  },
  // démo de la barre : overlay.html?pill pour la pastille
  overlayInfo: async () => ({
    mode: new URLSearchParams(location.search).has("pill") ? "pill" : "panel",
    game: "Minecraft",
    shortcut: mockBackground.shortcut,
    pin: mockBackground.pin,
    fpsAvailable: true,
    shortcutTaken: false,
    passive: new URLSearchParams(location.search).has("passive"),
  }),
  overlayLive: async () => ({ fps: Math.round(238 + Math.random() * 14), ping: Math.round(21 + Math.random() * 4) }),
  overlayClose: async () => {},
  overlaySetPin: async (pin) => {
    mockBackground = { ...mockBackground, pin };
  },
  overlayOpenApp: async () => {},
  onOverlayMode: (cb) => on("overlay:mode", cb),
  onGoto: (cb) => on("app:goto", cb),
  licenseStatus: async () => {
    await sleep(300);
    return mockLicense();
  },
  licenseLogin: async (email, password) => {
    await sleep(800);
    if (!email.includes("@") || password.length < 4)
      throw { code: "invalid_credentials", message: "That email and password don't match. Try again or reset your password.", buyUrl: null };
    if (email.toLowerCase().startsWith("other"))
      throw {
        code: "bound_to_other_device",
        message: "This license is already active on another PC. Rago Optimizer works on one device per license. Contact support on Discord if you changed PCs.",
        buyUrl: null,
      };
    if (email.toLowerCase().startsWith("free"))
      throw { code: "no_license", message: "This account doesn't have Rago Optimizer Premium yet.", buyUrl: `${import.meta.env.VITE_SITE_URL || location.origin}/#pricing` };
    demoPending = email;
    return { kind: "activationRequired", email, keyHint: "RAGO-9EGJN-•••••-•••••-VKXDS" };
  },
  licenseActivate: async () => {
    await sleep(900);
    if (!demoPending) throw { code: "invalid_token", message: null, buyUrl: null };
    demoEmail = demoPending;
    demoPending = null;
    try {
      localStorage.setItem("rago.demoLicense", demoEmail);
    } catch {
      /* démo sans stockage */
    }
    return mockLicense();
  },
  licenseRefresh: async () => {
    // démo : localStorage « rago.demoSim » = "revoked" simule un abonnement terminé au rafraîchissement
    let sim: string | null = null;
    try {
      sim = localStorage.getItem("rago.demoSim");
    } catch {
      /* rien */
    }
    if (sim === "revoked" && demoEmail) {
      demoEmail = null;
      mockReset();
      throw {
        code: "revoked",
        message: "Your Rago Optimizer Premium subscription ended. Renew it on the website, then sign in again.",
        buyUrl: `${import.meta.env.VITE_SITE_URL || location.origin}/#pricing`,
      };
    }
    return mockLicense();
  },
  licenseSignOut: async () => {
    demoEmail = null;
    try {
      localStorage.removeItem("rago.demoLicense");
    } catch {
      /* rien */
    }
    mockReset();
  },
  onItem: (cb) => on("run:item", cb),
  onLog: (cb) => on("run:log", cb),
  onDone: (cb) => on("run:done", cb),
  onReset: (cb) => on("reset:done", cb),
  window: { minimize() {}, toggleMaximize() {}, close() {} },
};

export const api: Api = isTauri ? tauriApi : mockApi;
