// Pont vers le moteur Rust. Hors de Tauri (navigateur, démo), un simulateur prend le relais
// pour que l'interface reste utilisable sans toucher au système.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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
}

export interface PingResult {
  host: string;
  ip: string | null;
  samples: number[];
  avg: number | null;
  min: number | null;
  max: number | null;
  jitter: number | null;
  loss: number;
  error: string | null;
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

export type ItemStatus = "pending" | "running" | "ok" | "error";

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
  cancelled: boolean;
  logFile: string;
}

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface Api {
  systemInfo(refresh?: boolean): Promise<SystemInfo>;
  runTweaks(items: RunItem[]): Promise<string>;
  cancelRun(): Promise<void>;
  isRunning(): Promise<boolean>;
  history(): Promise<HistoryEntry[]>;
  clearHistory(): Promise<void>;
  ping(host: string, port?: number, count?: number): Promise<PingResult>;
  minecraftStatus(dir?: string | null): Promise<MinecraftStatus>;
  minecraftRestore(dir?: string | null): Promise<string>;
  restartPc(): Promise<void>;
  openFolder(kind: "logs" | "resources" | "data" | string): Promise<void>;
  pickFolder(title: string): Promise<string | null>;
  openUrl(url: string): Promise<void>;
  onItem(cb: (e: ItemEvent) => void): Promise<UnlistenFn>;
  onLog(cb: (e: LogEvent) => void): Promise<UnlistenFn>;
  onDone(cb: (e: DoneEvent) => void): Promise<UnlistenFn>;
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
  ping: (host, port, count) => invoke("ping", { host, port, count }),
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
let mockCancel = false;
let mockRunning = false;
let mockTuned = 0;

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
      for (const [index, it] of items.entries()) {
        if (mockCancel) break;
        const base = { runId, index, id: it.id, variant: it.variant ?? null, code: null, durationMs: null, message: null };
        emit<ItemEvent>("run:item", { ...base, status: "running" });
        const t0 = performance.now();
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n && !mockCancel; i++) {
          await sleep(120 + Math.random() * 220);
          emit<LogEvent>("run:log", { runId, id: it.id, line: MOCK_LINES[(index + i) % MOCK_LINES.length] });
        }
        const durationMs = Math.round(performance.now() - t0);
        ok++;
        mockHistory.push({ id: it.id, variant: it.variant ?? null, ts: Date.now(), ok: true, code: 0, durationMs });
        emit<ItemEvent>("run:item", { ...base, status: "ok", code: 0, durationMs });
      }
      mockRunning = false;
      if (!mockCancel) mockTuned++;
      emit<DoneEvent>("run:done", { runId, ok, failed, cancelled: mockCancel, logFile: "C:\\Users\\demo\\AppData\\Roaming\\gg.rago.optimizer\\logs\\demo.log" });
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
  ping: async (host) => {
    const base = Math.max(9, 34 - mockTuned * 6);
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      await sleep(90);
      samples.push(+(base + Math.random() * 6 - (i === 3 ? 0 : 0)).toFixed(1));
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const diffs = samples.slice(1).map((s, i) => Math.abs(s - samples[i]));
    return {
      host,
      ip: "51.91.12.34",
      samples,
      avg: +avg.toFixed(1),
      min: Math.min(...samples),
      max: Math.max(...samples),
      jitter: +(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1),
      loss: 0,
      error: null,
    };
  },
  minecraftStatus: async () => ({ dirExists: true, optifineFile: true, backups: 1 }),
  minecraftRestore: async () => "optionsof.txt restauré (démo)",
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
      throw { code: "no_license", message: "This account doesn't have Rago Optimizer Premium yet.", buyUrl: "https://ragohub.com/#pricing" };
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
  licenseRefresh: async () => mockLicense(),
  licenseSignOut: async () => {
    demoEmail = null;
    try {
      localStorage.removeItem("rago.demoLicense");
    } catch {
      /* rien */
    }
  },
  onItem: (cb) => on("run:item", cb),
  onLog: (cb) => on("run:log", cb),
  onDone: (cb) => on("run:done", cb),
  window: { minimize() {}, toggleMaximize() {}, close() {} },
};

export const api: Api = isTauri ? tauriApi : mockApi;
