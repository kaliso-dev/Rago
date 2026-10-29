// Pont vers le moteur Rust. Hors de Tauri (navigateur, démo), un simulateur prend le relais
// pour que l'interface reste utilisable sans toucher au système.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tweaks } from "./catalog";
import type { NetAction, NetLine, NetOptions, NetOutcome, NetState } from "./netopt";

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
  /** moyenne des allers-retours réussis */
  ping: number | null;
  /** absents des tests faits avant la 1.2.0 (gardés dans le navigateur) */
  median?: number | null;
  best: number | null;
  worst?: number | null;
  jitter: number | null;
  loss: number;
  lost?: number;
  samples: number;
  /** mesures nettement au-dessus de la médiane */
  spikes?: number;
  /** chaque essai dans l'ordre, null : perdu */
  series?: (number | null)[];
  method?: "mc" | "tcp" | "icmp";
  /** "dns" : serveur introuvable ; "timeout" : aucune réponse */
  error: string | null;
}

/** Un essai du test réseau, envoyé pendant la mesure. */
export interface NetSample {
  id: string;
  i: number;
  n: number;
  ms: number | null;
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
  /** pendant une partie (session.rs) : carte graphique performante, mode Performances élevées, vérifications */
  gameGpu: boolean;
  gamePower: boolean;
  gameChecks: boolean;
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
/** Pendant une partie (session.rs). */
export interface SessionCheck {
  id: "battery" | "download" | "sync" | "record";
  /** applis concernées */
  apps: string[];
}
export interface SessionState {
  playing: boolean;
  /** mode Performances élevées mis pour la partie */
  power: boolean;
  /** jeux qui ont reçu la carte graphique performante */
  gpuGames: number;
  checks: SessionCheck[];
  /** PC à deux cartes graphiques (null tant que ce n'est pas vérifié) */
  multiGpu: boolean | null;
  /** Ryzen X3D à deux CCD : le mode d'alimentation n'est jamais changé */
  x3d: boolean;
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
  /** le serveur ne répond pas au ping : mesuré jusqu'au dernier routeur avant lui */
  pingEstimate?: boolean;
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
  onNetSample(cb: (s: NetSample) => void): Promise<UnlistenFn>;
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
  /** Logos des jeux des presets installés sur ce PC (icône de leur exe, data: URL), par clé de jeu (« valorant »). */
  presetIcons(): Promise<Record<string, string>>;
  /** Network Optimizer (netopt.rs) : état, puis une action (appliquer, remettre, test) dont les lignes arrivent par onNetOptLine. */
  netOptState(): Promise<NetState>;
  netOptRun(action: NetAction, options?: NetOptions): Promise<NetOutcome>;
  onNetOptLine(cb: (l: NetLine) => void): Promise<UnlistenFn>;
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
  /** Dernière recherche de mise à jour, datée (null : pas encore faite). */
  updateStatus(): Promise<string | null>;
  /** Installe la mise à jour et rouvre l'app (l'app se ferme : ne revient qu'en cas d'échec). */
  updateInstall(): Promise<void>;
  backgroundGet(): Promise<BackgroundState>;
  /** Erreurs : "shortcut" (raccourci illisible), "autostart:…" (tâche planifiée refusée). */
  backgroundSet(prefs: BackgroundPrefs): Promise<BackgroundState>;
  sessionState(): Promise<SessionState>;
  /** Options « pendant la partie » des paramètres ; renvoie les réglages enregistrés. */
  sessionSetPrefs(gpu: boolean, power: boolean, checks: boolean): Promise<BackgroundPrefs>;
  onSession(cb: (s: SessionState) => void): Promise<UnlistenFn>;
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
  onNetSample: (cb) => listen<NetSample>("nettest:sample", (e) => cb(e.payload)),
  gamesList: (refresh) => invoke("games_list", { refresh }),
  gameArt: (id) => invoke("game_art", { id }),
  gameLaunch: (id) => invoke("game_launch", { id }),
  launchersList: (refresh) => invoke("launchers_list", { refresh }),
  launcherLaunch: (id) => invoke("launcher_launch", { id }),
  launcherIcon: (id) => invoke("launcher_icon", { id }),
  presetIcons: () => invoke("preset_icons"),
  netOptState: () => invoke("netopt_state"),
  netOptRun: (action, options) => invoke("netopt_run", { action, options: options ?? null }),
  onNetOptLine: (cb) => listen<NetLine>("netopt:line", (e) => cb(e.payload)),
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
  updateStatus: () => invoke("update_status"),
  updateInstall: () => invoke("update_install"),
  backgroundGet: () => invoke("background_get"),
  backgroundSet: (prefs) => invoke("background_set", { prefs }),
  sessionState: () => invoke("session_state"),
  sessionSetPrefs: (gpu, power, checks) => invoke("session_set_prefs", { gpu, power, checks }),
  onSession: (cb) => listen<SessionState>("games:session", (e) => cb(e.payload)),
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
  { id: "minecraft", name: "Minecraft Launcher", minecraft: true, running: false },
  { id: "lunar", name: "Lunar Client", minecraft: true, running: false },
  { id: "badlion", name: "Badlion Client", minecraft: true, running: false },
  { id: "xbox", name: "Xbox", minecraft: false, running: false },
];
let mockGames: Game[] = [
  { id: "mc:lunar", name: "Minecraft", launcher: "minecraft", client: "Lunar Client", kind: "minecraft", installDir: null, lastPlayed: Date.now() - 2 * hour, running: false },
  { id: "mc:badlion", name: "Minecraft", launcher: "minecraft", client: "Badlion Client", kind: "minecraft", installDir: null, lastPlayed: Date.now() - 50 * hour, running: false },
  { id: "mc:official", name: "Minecraft", launcher: "minecraft", client: "Minecraft Launcher", kind: "minecraft", installDir: null, lastPlayed: null, running: false },
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

let mockNet: NetState = { applied: null, backup: false, busy: false };
const MOCK_NET_LINES: Record<string, string[]> = {
  TCP: ["TCP receive window: normal", "Initial retransmission timeout, ms: 300", "TCP timestamps: disabled", ".. Minimum retransmission timeout, ms: locked by Windows on this edition, stays 300"],
  "ACK timing and Nagle (every network interface)": ["ACK every 1 packet, delayed ACK ticks 0, NoDelay 1 on 6 interfaces"],
  "Packet buffering in Windows and the network card": ["Network throttling off", "CPU reserve for background tasks: 10 %", "Ethernet: interrupt moderation = Disabled"],
  "Power saving": ["Ethernet: Energy Efficient Ethernet = Off", "Network power saving features off"],
  "Wi-Fi at full power": [".. No Wi-Fi card connected, nothing to do"],
  "Restarting the network card": ["Network card back online"],
  MTU: ["MTU 1500 on Ethernet, already right"],
  "Game traffic priority": ["Minecraft packets marked DSCP 48 (javaw, java, Minecraft.Windows)", "Big downloaders marked as background, CS1"],
  "High CPU priority for Minecraft": ["Minecraft starts with High CPU priority"],
  "Windows gaming performance": ["! No High performance plan on this PC (Modern Standby laptop?), current plan kept", "Game Mode on, Game DVR off, foreground boost, game task priority high"],
  "Windows Update sharing": ["Windows Update no longer uploads to other PCs"],
};
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
let mockBackground: BackgroundPrefs = {
  tray: true,
  autostart: true,
  overlay: true,
  shortcut: "Alt+X",
  pin: false,
  lang: "fr",
  gameGpu: true,
  gamePower: true,
  gameChecks: true,
};
/** Démo : une partie en cours avec ?playing dans l'adresse (barre en jeu : toujours). */
const mockSession = (): SessionState => {
  const playing = new URLSearchParams(location.search).has("playing") || location.pathname.includes("overlay");
  return {
    playing,
    power: playing && mockBackground.gamePower,
    gpuGames: mockBackground.gameGpu ? 2 : 0,
    checks: playing && mockBackground.gameChecks ? [{ id: "sync", apps: ["OneDrive"] }, { id: "record", apps: ["OBS Studio"] }] : [],
    multiGpu: true,
    x3d: false,
  };
};

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
    // démo : valeurs plausibles depuis Paris, essai par essai comme nettest.rs (40 en 10 s, 8 pour Minecraft)
    const base: Record<string, number> = { hypixel: 92, minemen: 21, paris: 9, frankfurt: 17, london: 14, stockholm: 33, madrid: 28, virginia: 86, internet: 7 };
    const fast = new URLSearchParams(location.search).has("fastnet");
    return Promise.all(
      ids.map(async (id) => {
        const mc = id === "hypixel" || id === "minemen";
        const n = mc ? 8 : 40;
        const series: (number | null)[] = [];
        for (let i = 0; i < n; i++) {
          await sleep(fast ? 8 : mc ? 1400 : 250);
          const b = base[id] ?? 40;
          const lost = id === "virginia" && i === 17;
          const ms = lost ? null : Math.round((b + Math.random() * 3 + (i % 13 === 7 ? b * 0.6 : 0)) * 10) / 10;
          series.push(ms);
          emit<NetSample>("nettest:sample", { id, i, n, ms });
        }
        const ok = series.filter((v): v is number => v != null);
        const sorted = [...ok].sort((a, b) => a - b);
        const avg = ok.reduce((a, b) => a + b, 0) / ok.length;
        const jitter = ok.slice(1).reduce((a, v, i) => a + Math.abs(v - ok[i]), 0) / (ok.length - 1);
        const med = sorted[Math.floor(sorted.length / 2)];
        const r = (v: number) => Math.round(v * 10) / 10;
        const m: NetMeasure = {
          id,
          ping: r(avg),
          median: med,
          best: sorted[0],
          worst: sorted[sorted.length - 1],
          jitter: r(jitter),
          loss: (n - ok.length) / n,
          lost: n - ok.length,
          samples: n,
          spikes: ok.filter((v) => v > med + Math.max(15, med / 2)).length,
          series,
          method: mc ? "mc" : id === "internet" ? "icmp" : "tcp",
          error: null,
        };
        emit("nettest:measure", m);
        return m;
      }),
    );
  },
  onNetMeasure: (cb) => on("nettest:measure", cb),
  onNetSample: (cb) => on("nettest:sample", cb),
  gamesList: async () => {
    await sleep(400);
    // ?playing : le dernier jeu joué est en cours (démo de la partie en cours)
    const playing = new URLSearchParams(location.search).has("playing");
    return [...mockGames]
      .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name))
      .map((g, i) => (playing && i === 0 ? { ...g, running: true } : g));
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
  // démo : aucun jeu installé, les glyphes servent de logos (les captures peuvent fournir des icônes, __presetIcons)
  presetIcons: async () => (window as unknown as { __presetIcons?: Record<string, string> }).__presetIcons ?? {},
  netOptState: async () => ({ ...mockNet }),
  netOptRun: async (action, options) => {
    const line = (tag: NetLine["tag"], text: string, step: number | null = null, total: number | null = null) =>
      emit<NetLine>("netopt:line", { action, tag, text, step, total });
    if (action === "apply" || action === "restore" || action === "defaults") {
      const titles = action === "apply"
        ? ["TCP", "ACK timing and Nagle (every network interface)", "Packet buffering in Windows and the network card", "Power saving", "Wi-Fi at full power", "Restarting the network card", "MTU", "Game traffic priority", "High CPU priority for Minecraft", "Windows gaming performance", "Windows Update sharing"]
        : ["Restoring the settings saved before the first apply", "Registry values", "Network card", "MTU and power plan"];
      let ok = 0;
      for (let i = 0; i < titles.length; i++) {
        line("title", titles[i]);
        await sleep(260 + Math.random() * 260);
        for (const t of MOCK_NET_LINES[titles[i]] ?? ["Done"]) {
          line(t.startsWith("!") ? "warn" : t.startsWith("..") ? "info" : "ok", t.replace(/^(!|\.\.) /, ""));
          if (!t.startsWith("..")) ok++;
          await sleep(90);
        }
        line("progress", "", i + 1, titles.length);
      }
      if (action === "apply" && options) mockNet = { applied: { options, at: Date.now(), ok, warn: 1, fail: 0 }, backup: true, busy: false };
      else mockNet = { applied: null, backup: action === "defaults" && mockNet.backup, busy: false };
      return { code: 0, ok, warn: action === "apply" ? 1 : 0, fail: 0, result: null };
    }
    if (action === "detect") return { code: 0, ok: 0, warn: 0, fail: 0, result: { kind: "detect", connected: true, wifi: false, alias: "Ethernet", desc: "Intel(R) Ethernet Controller I225-V", speed: "1 Gbps", backup: mockNet.backup ? "2026-10-22 21:40" : null } };
    const total = action === "loaded" ? 130 : action === "quality" ? 100 : 20;
    for (let i = 5; i <= total; i += 5) {
      line("progress", "", i, total);
      await sleep(action === "status" ? 20 : 70);
    }
    const result: Record<string, unknown> =
      action === "quality"
        ? { kind: "quality", ip: "172.65.230.166", min: 18, avg: 19.6, p95: 23, max: 31, jitter: 1.4, loss: 0, spikes: 0, stable: true }
        : action === "loaded"
          ? { kind: "loaded", ip: "172.65.230.166", idleMed: 19, idleJitter: 1.2, busyMed: 41, busyJitter: 6.8, busyLoss: 0, delta: 22, grade: "A" }
          : action === "mtu"
            ? { kind: "mtu", ip: "172.65.230.166", mtu: 1500, current: 1500, alias: "Ethernet" }
            : {
                kind: "status",
                rows: [
                  { s: "tcp", k: "TCP receive window", v: "Normal" },
                  { s: "tcp", k: "Congestion provider", v: "CUBIC" },
                  { s: "tcp", k: "Initial RTO, ms", v: "1000" },
                  { s: "tcp", k: "Minimum RTO, ms", v: "300" },
                  { s: "tcp", k: "Delayed ACK timeout, ms", v: "40" },
                  { s: "main", k: "Ethernet", v: "" },
                  { s: "main", k: "MTU", v: "1500" },
                  { s: "main", k: "TcpAckFrequency", v: "Windows default" },
                  { s: "power", k: "Active power plan", v: "Rago Low Latency" },
                  { s: "power", k: "Network throttling index", v: "10" },
                ],
              };
    return { code: 0, ok: 0, warn: 0, fail: 0, result };
  },
  onNetOptLine: (cb) => on("netopt:line", cb),
  gameAdd: async () => null,
  gameRemove: async (id) => {
    mockGames = mockGames.filter((g) => g.id !== id);
  },
  gamesUnhide: async () => {},
  onGamesRunning: (cb) => on("games:running", cb),
  // démo : une mise à jour attend avec ?update dans l'adresse
  updateReady: async () => (new URLSearchParams(location.search).has("update") ? { version: "1.2.1", notes: null } : null),
  onUpdateReady: (cb) => on("update:ready", cb),
  updateStatus: async () => null,
  updateInstall: async () => {
    await sleep(1200);
    location.reload();
  },
  backgroundGet: async () => ({ prefs: mockBackground, autostart: mockBackground.autostart, shortcutTaken: false, fpsAvailable: true }),
  backgroundSet: async (prefs) => {
    await sleep(250);
    if (!/^((Ctrl|Alt|Shift|Super)\+)*(F\d{1,2}|[A-Z0-9]|[A-Za-z]+)$/.test(prefs.shortcut) || /\+$/.test(prefs.shortcut)) throw "shortcut";
    // comme background_set : les options « pendant la partie » se règlent à part
    mockBackground = { ...prefs, gameGpu: mockBackground.gameGpu, gamePower: mockBackground.gamePower, gameChecks: mockBackground.gameChecks };
    return { prefs: mockBackground, autostart: prefs.autostart, shortcutTaken: false, fpsAvailable: true };
  },
  sessionState: async () => mockSession(),
  sessionSetPrefs: async (gameGpu, gamePower, gameChecks) => {
    mockBackground = { ...mockBackground, gameGpu, gamePower, gameChecks };
    emit<SessionState>("games:session", mockSession());
    return mockBackground;
  },
  onSession: (cb) => on("games:session", cb),
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
  overlayLive: async () => ({ fps: Math.round(238 + Math.random() * 14), ping: Math.round(21 + Math.random() * 4), pingEstimate: new URLSearchParams(location.search).has("estimate") }),
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
