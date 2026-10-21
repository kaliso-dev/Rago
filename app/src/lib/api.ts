// Pont vers le moteur Rust. Hors de Tauri (navigateur, démo), un simulateur prend le relais
// pour que l'interface reste utilisable sans toucher au système.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tweaks } from "./catalog";
import { featureDefaults, osCatalog, osTweaks } from "./os";

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
  autostart: boolean;
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
}
export interface OverlayLive {
  fps: number | null;
  ping: number | null;
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

/** Rago OS (os/mod.rs) : état d'un réglage du catalogue os.json sur ce PC. */
export interface OsTweakView {
  id: string;
  /** appliqué par Rago OS (noté dans applied.json) */
  applied: boolean;
  /** tout ce qu'il pose est en place en ce moment */
  inPlace: boolean;
}
export interface OsFailure {
  id: string;
  error: string;
}
/** Application du Store retirée par Rago OS que Windows n'a pas pu réinscrire. */
export interface OsAppx {
  name: string;
  fullName: string;
  family: string;
  location?: string | null;
}
export interface OsOverview {
  /** build de Windows (26100 : 24H2) */
  build: number;
  active: boolean;
  /** profil choisi ; null : sélection personnalisée */
  profile: string | null;
  selection: string[];
  features: Record<string, boolean>;
  activatedAt: number | null;
  tweaks: OsTweakView[];
  /** appliqués mais plus en place (Windows ou une mise à jour les a remis) */
  drift: string[];
  windowsUpdated: boolean;
  failed: OsFailure[];
  /** activation ou restauration coupée (PC éteint, app fermée) */
  interrupted: { kind: "apply" | "restore"; done: number; total: number } | null;
  running: boolean;
  restartPending: boolean;
  /** rago-shell.exe livré avec l'app */
  shellInstalled: boolean;
  translucenttb: { installed: boolean; applied: boolean; stoppedAt: number | null };
  appsToReinstall: OsAppx[];
  restorePoint: number | null;
}
/** Vérification avant activation (os/preflight.rs). */
export interface OsCheck {
  id: "windows" | "edition" | "activation" | "disk" | "reboot" | "admin" | "battery" | "busy" | string;
  level: "ok" | "warn" | "block";
  detail?: string;
}
export interface OsRequest {
  profile: string | null;
  selection: string[];
  features?: Record<string, boolean>;
  /** « Continuer sans » après un point de restauration raté */
  skipRestorePoint?: boolean;
  /** réapplique aussi ce qui est noté comme appliqué (réglages remis par Windows) */
  force?: boolean;
}
export interface OsProgress {
  kind: "apply" | "restore";
  phase: "restore_point" | "tweak" | "features" | "explorer" | string;
  index: number;
  total: number;
  id?: string;
  status: "running" | "ok" | "skipped" | "failed";
  message?: string;
}
export interface OsDone {
  kind: "apply" | "restore";
  ok: number;
  failed: number;
  cancelled: boolean;
  restart: boolean;
  restoreFailed: boolean;
  error?: string;
}
/** Consommation de Rago Shell mesurée par l'app : CPU en % d'un PC entier, mémoire privée en Mo. */
export interface OsUsage {
  running: boolean;
  cpu: number | null;
  ramMb: number | null;
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
  osOverview(): Promise<OsOverview>;
  osPreflight(selection: string[]): Promise<OsCheck[]>;
  /** Activation (ou nouvelle sélection) : suivie par onOsProgress puis onOsDone. Premium. */
  osApply(request: OsRequest): Promise<void>;
  /** « Désactiver et tout restaurer » : possible sans licence. */
  osRestore(): Promise<void>;
  osCancel(): Promise<void>;
  osSetFeature(id: string, on: boolean): Promise<void>;
  /** Joue l'animation de démarrage par-dessus le bureau (aussi en plan gratuit). */
  osPreview(): Promise<void>;
  /** Minuteur de la Dynamic Island, en secondes (0 : arrêté). */
  osTimer(seconds: number): Promise<void>;
  osUsage(): Promise<OsUsage>;
  osForgetJob(): Promise<void>;
  osClearRestart(): Promise<void>;
  /** Page du Store : TranslucentTB (sans famille) ou une application à réinstaller. */
  osOpenStore(family?: string): Promise<void>;
  onOsProgress(cb: (p: OsProgress) => void): Promise<UnlistenFn>;
  onOsDone(cb: (d: OsDone) => void): Promise<UnlistenFn>;
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
  osOverview: () => invoke("os_overview"),
  osPreflight: (selection) => invoke("os_preflight", { selection }),
  osApply: (request) => invoke("os_apply", { request }),
  osRestore: () => invoke("os_restore"),
  osCancel: () => invoke("os_cancel"),
  osSetFeature: (id, on) => invoke("os_set_feature", { id, on }),
  osPreview: () => invoke("os_preview"),
  osTimer: (seconds) => invoke("os_timer", { seconds }),
  osUsage: () => invoke("os_usage"),
  osForgetJob: () => invoke("os_forget_job"),
  osClearRestart: () => invoke("os_clear_restart"),
  osOpenStore: (family) => invoke("os_open_store", { family: family ?? null }),
  onOsProgress: (cb) => listen<OsProgress>("os:progress", (e) => cb(e.payload)),
  onOsDone: (cb) => listen<OsDone>("os:done", (e) => cb(e.payload)),
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

const mockHistory: HistoryEntry[] = [];
const hour = 3_600_000;
// démo : bibliothèque type d'un joueur de PvP Minecraft ; les images restent des tuiles au nom du jeu
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
let mockBackground: BackgroundPrefs = { tray: false, autostart: false, overlay: true, shortcut: "Ctrl+Shift+R", pin: false, lang: "fr" };

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

// démo de Rago OS : état gardé dans le navigateur ; ?osdrift simule des réglages remis par Windows, ?osjob une
// activation coupée, ?osttb TranslucentTB installé
interface MockOs {
  active: boolean;
  profile: string | null;
  selection: string[];
  features: Record<string, boolean>;
  activatedAt: number | null;
  applied: string[];
  restartPending: boolean;
  restorePoint: number | null;
}
const demoFlag = (k: string) => typeof location !== "undefined" && new URLSearchParams(location.search).has(k);
let mockOs: MockOs = (() => {
  const empty: MockOs = { active: false, profile: null, selection: [], features: featureDefaults(), activatedAt: null, applied: [], restartPending: false, restorePoint: null };
  try {
    const raw = localStorage.getItem("rago.demoOs");
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<MockOs>) } : empty;
  } catch {
    return empty;
  }
})();
let mockOsRunning = false;
let mockOsCancel = false;
let mockOsJob = demoFlag("osjob");
let mockTimer = 0;
function saveMockOs() {
  try {
    localStorage.setItem("rago.demoOs", JSON.stringify(mockOs));
  } catch {
    /* démo sans stockage */
  }
}
function mockOsRun(kind: "apply" | "restore", steps: { id: string; apply: boolean }[], skipRestorePoint: boolean) {
  mockOsRunning = true;
  mockOsCancel = false;
  void (async () => {
    const done: OsDone = { kind, ok: 0, failed: 0, cancelled: false, restart: false, restoreFailed: false };
    const progress = (p: Omit<OsProgress, "kind">) => emit<OsProgress>("os:progress", { kind, ...p });
    if (kind === "apply" && !mockOs.restorePoint && !skipRestorePoint) {
      progress({ phase: "restore_point", index: 0, total: 0, status: "running" });
      await sleep(1600);
      // démo : ?osrp fait échouer le point de restauration
      if (demoFlag("osrp")) {
        mockOsRunning = false;
        emit<OsDone>("os:done", { ...done, restoreFailed: true, error: "System Protection is off" });
        return;
      }
      mockOs.restorePoint = Date.now();
    }
    if (kind === "restore") {
      progress({ phase: "features", index: 0, total: 0, status: "running" });
      await sleep(500);
    }
    let explorer = false;
    for (const [i, st] of steps.entries()) {
      if (mockOsCancel) {
        done.cancelled = true;
        break;
      }
      progress({ phase: "tweak", index: i, total: steps.length, id: st.id, status: "running" });
      await sleep(70 + Math.random() * 110);
      const t = osTweaks.get(st.id);
      if (t?.reboot === "restart") done.restart = true;
      if (t?.reboot === "explorer") explorer = true;
      mockOs.applied = st.apply ? [...new Set([...mockOs.applied, st.id])] : mockOs.applied.filter((x) => x !== st.id);
      done.ok++;
      progress({ phase: "tweak", index: i, total: steps.length, id: st.id, status: "ok" });
    }
    if (!done.cancelled) {
      if (kind === "apply") {
        progress({ phase: "features", index: steps.length, total: steps.length, status: "running" });
        await sleep(400);
        mockOs.active = true;
        mockOs.activatedAt ??= Date.now();
      } else {
        mockOs.active = false;
        mockOs.activatedAt = null;
        mockOs.applied = [];
      }
      if (explorer) {
        progress({ phase: "explorer", index: steps.length, total: steps.length, status: "running" });
        await sleep(900);
      }
      mockOs.restartPending = done.restart;
      mockOsJob = false;
    }
    saveMockOs();
    mockOsRunning = false;
    emit<OsDone>("os:done", done);
  })();
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
        const m: NetMeasure = { id, ping, best: Math.round((ping - 1.5) * 10) / 10, jitter: Math.round((0.6 + Math.random() * 2.4) * 10) / 10, loss: 0, samples: 10, error: null };
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
  osOverview: async () => {
    await sleep(180);
    const drift = demoFlag("osdrift") && mockOs.active ? mockOs.applied.slice(0, 3) : [];
    return {
      build: 26100,
      active: mockOs.active,
      profile: mockOs.profile,
      selection: mockOs.selection,
      features: mockOs.features,
      activatedAt: mockOs.activatedAt,
      tweaks: osCatalog.tweaks.map((t) => {
        const applied = mockOs.applied.includes(t.id);
        return { id: t.id, applied, inPlace: applied && !drift.includes(t.id) };
      }),
      drift,
      windowsUpdated: drift.length > 0,
      failed: [],
      interrupted: mockOsJob && !mockOsRunning ? { kind: "apply", done: 23, total: 51 } : null,
      running: mockOsRunning,
      restartPending: mockOs.restartPending,
      shellInstalled: true,
      translucenttb: { installed: demoFlag("osttb"), applied: demoFlag("osttb") && !!mockOs.features.translucenttb, stoppedAt: null },
      appsToReinstall: [],
      restorePoint: mockOs.restorePoint,
    };
  },
  osPreflight: async () => {
    await sleep(350);
    return [
      { id: "windows", level: "ok", detail: "Windows 11 24H2 (26100)" },
      { id: "edition", level: "ok", detail: "Professional" },
      { id: "activation", level: "ok" },
      { id: "disk", level: "ok", detail: "212.4" },
      { id: "reboot", level: "ok" },
      { id: "admin", level: "ok" },
      { id: "busy", level: mockOsRunning ? "block" : "ok" },
    ];
  },
  osApply: async (request) => {
    if (!demoEmail) throw "premium_required";
    if (mockOsRunning) throw "os_running";
    const wanted = request.selection.filter((id) => osTweaks.has(id));
    const revert = mockOs.applied.filter((id) => !wanted.includes(id));
    const apply = request.force ? wanted : wanted.filter((id) => !mockOs.applied.includes(id) || !mockOs.active);
    mockOs = { ...mockOs, profile: request.profile, selection: request.selection, features: { ...mockOs.features, ...request.features } };
    mockOsRun("apply", [...revert.map((id) => ({ id, apply: false })), ...apply.map((id) => ({ id, apply: true }))], !!request.skipRestorePoint);
  },
  osRestore: async () => {
    if (mockOsRunning) throw "os_running";
    mockOsRun("restore", [...mockOs.applied].reverse().map((id) => ({ id, apply: false })), true);
  },
  osCancel: async () => {
    mockOsCancel = true;
  },
  osSetFeature: async (id, on) => {
    await sleep(200);
    if (on && !demoEmail) throw "premium_required";
    if (id === "translucenttb" && on && !demoFlag("osttb")) throw "translucenttb_missing";
    mockOs = { ...mockOs, features: { ...mockOs.features, [id]: on } };
    saveMockOs();
  },
  osPreview: async () => {
    // démo : l'animation de Rago Shell ne se joue que sous Windows
  },
  osTimer: async (seconds) => {
    mockTimer = seconds;
  },
  osUsage: async () => {
    const on = mockOs.active && (mockOs.features.island || mockTimer > 0);
    return on ? { running: true, cpu: Math.round(Math.random() * 6) / 100, ramMb: Math.round((11.2 + Math.random() * 0.6) * 10) / 10 } : { running: false, cpu: null, ramMb: null };
  },
  osForgetJob: async () => {
    mockOsJob = false;
  },
  osClearRestart: async () => {
    mockOs.restartPending = false;
    saveMockOs();
  },
  osOpenStore: async () => {},
  onOsProgress: (cb) => on("os:progress", cb),
  onOsDone: (cb) => on("os:done", cb),
  onItem: (cb) => on("run:item", cb),
  onLog: (cb) => on("run:log", cb),
  onDone: (cb) => on("run:done", cb),
  onReset: (cb) => on("reset:done", cb),
  window: { minimize() {}, toggleMaximize() {}, close() {} },
};

export const api: Api = isTauri ? tauriApi : mockApi;
