// Pont vers le moteur Rust. Hors de Tauri (navigateur, démo), un simulateur prend le relais
// pour que l'interface reste utilisable sans toucher au système.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tweaks } from "./catalog";
import free from "../data/free.json";

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
  /** Vrai une seule fois, au lancement où la réparation du moteur a supprimé une valeur (RAG-67) : il faut redémarrer. */
  takeRepairNotice(): Promise<boolean>;
  liveStats(): Promise<LiveStats>;
  openTaskManager(): Promise<void>;
  minecraftStatus(dir?: string | null): Promise<MinecraftStatus>;
  minecraftRestore(dir?: string | null): Promise<string>;
  restartPc(): Promise<void>;
  openFolder(kind: "logs" | "resources" | "data" | string): Promise<void>;
  pickFolder(title: string): Promise<string | null>;
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
  takeRepairNotice: () => invoke("take_repair_notice"),
  liveStats: () => invoke("live_stats"),
  openTaskManager: () => invoke("open_task_manager"),
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

const mockHistory: HistoryEntry[] = [];
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

/** Démo : la remise à zéro du moteur à la fin de Premium (réglages Premium remis en arrière-plan). */
function mockReset() {
  const ids = [...mockApplied.keys()].filter((id) => !free.tweaks.includes(id));
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
        mockHistory.push({ id: it.id, variant: it.variant ?? null, ts: Date.now(), ok: true, code: 0, durationMs, undo: !!it.undo });
        const tw = tweaks.get(it.id);
        const revert = !!tw?.variants?.find((v) => v.id === it.variant)?.revert;
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
  minecraftStatus: async () => ({ dirExists: true, optifineFile: true, backups: 1 }),
  minecraftRestore: async () => "optionsof.txt restored (demo)",
  restartPc: async () => {},
  openFolder: async () => {},
  pickFolder: async () => "C:\\Users\\demo\\AppData\\Roaming\\.minecraft",
  openUrl: async (url) => {
    window.open(url, "_blank", "noopener");
  },
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
