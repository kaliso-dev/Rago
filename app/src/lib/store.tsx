import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type DoneEvent, type HistoryEntry, type ItemStatus, type LicenseStatus, type RunItem, type SystemInfo } from "./api";
import { autoVariant, availability, catalog, tweaks, type Lang, type Tweak } from "./catalog";
import { translate, type Key } from "./i18n";

export const BUILTIN_NAMES: Record<string, { fr: string; en: string }> = {
  __wmic: { fr: "Installer WMIC", en: "Install WMIC" },
};

export function itemName(id: string, lang: Lang): string {
  return tweaks.get(id)?.name[lang] ?? BUILTIN_NAMES[id]?.[lang] ?? id;
}

export interface RunRow {
  id: string;
  variant: string | null;
  status: ItemStatus;
  durationMs: number | null;
}

export interface RunState {
  runId: string | null;
  rows: RunRow[];
  logs: { id: string; line: string }[];
  startedAt: number;
  endedAt: number | null;
  done: DoneEvent | null;
  reboot: boolean;
  error: string | null;
}

export interface ConfirmState {
  ids: string[];
  /** lancé depuis un bouton « Lancer » : la sélection n'est pas touchée */
  single: boolean;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`rago.${key}`);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`rago.${key}`, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on garde l'état en mémoire */
  }
}

function usePersisted<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => load(key, fallback));
  useEffect(() => save(key, v), [key, v]);
  return [v, setV] as const;
}

const catalogOrder = new Map<string, number>();
{
  let i = 0;
  for (const m of catalog.modules) for (const s of m.sections) for (const t of s.tweaks) if (!("ref" in t)) catalogOrder.set(t.id, i++);
}

function useStoreValue() {
  const [lang, setLang] = usePersisted<Lang>("lang", "en");
  const [motion, setMotion] = usePersisted<"full" | "reduced">("motion", "full");
  const [page, setPage] = useState<string>("dashboard");
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [sysLoading, setSysLoading] = useState(true);
  const [selection, setSelection] = usePersisted<string[]>("selection", []);
  const [variants, setVariants] = usePersisted<Record<string, string>>("variants", {});
  const [mcDirOverride, setMcDir] = usePersisted<string | null>("mcDir", null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [run, setRun] = useState<RunState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusTweak, setFocusTweak] = useState<string | null>(null);
  const [pingRequest, setPingRequest] = useState(0);
  const [license, setLicense] = useState<LicenseStatus | null>(null);

  useEffect(() => {
    // Au démarrage puis une fois par jour : rafraîchit le jeton si le serveur répond.
    // Sans réseau, le jeton reste valable jusqu'à son expiration ; une révocation renvoie à la connexion.
    const refresh = (st: LicenseStatus) => {
      if (st.state !== "active" && st.state !== "expired") return;
      void api.licenseRefresh().then(setLicense, async (e) => {
        const code = (e as { code?: string })?.code;
        if (code === "invalid_token" || code === "bound_to_other_device" || code === "revoked") setLicense(await api.licenseStatus());
      });
    };
    void api.licenseStatus().then((st) => {
      setLicense(st);
      refresh(st);
    });
    const daily = setInterval(() => void api.licenseStatus().then(refresh), 24 * 3600 * 1000);
    return () => clearInterval(daily);
  }, []);

  const signOut = useCallback(async () => {
    await api.licenseSignOut();
    setLicense(await api.licenseStatus());
  }, []);

  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  const refreshSys = useCallback(async (refresh = false) => {
    setSysLoading(true);
    try {
      setSys(await api.systemInfo(refresh));
    } finally {
      setSysLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => setHistory(await api.history()), []);

  useEffect(() => {
    void refreshSys();
    void refreshHistory();
  }, [refreshSys, refreshHistory]);

  // dernier passage de chaque réglage, pour les badges « Appliqué le… »
  const lastRun = useMemo(() => {
    const m = new Map<string, HistoryEntry>();
    for (const e of history) {
      const prev = m.get(e.id);
      if (!prev || prev.ts < e.ts) m.set(e.id, e);
    }
    return m;
  }, [history]);

  const selected = useMemo(() => new Set(selection), [selection]);
  const mcDir = mcDirOverride ?? sys?.minecraftDir ?? null;

  const variantOf = useCallback(
    (tw: Tweak) => (tw.variants?.length ? variants[tw.id] ?? autoVariant(tw, sys) ?? null : null),
    [variants, sys],
  );

  const toggle = useCallback(
    (id: string, on?: boolean) =>
      setSelection((s) => {
        const has = s.includes(id);
        const want = on ?? !has;
        if (want === has) return s;
        return want ? [...s, id] : s.filter((x) => x !== id);
      }),
    [setSelection],
  );

  const setVariant = useCallback((id: string, v: string) => setVariants((m) => ({ ...m, [id]: v })), [setVariants]);

  /** Ajoute une liste "id" ou "id:variante" à la sélection (presets). */
  const selectMany = useCallback(
    (entries: string[]) => {
      const ids: string[] = [];
      const vs: Record<string, string> = {};
      for (const e of entries) {
        const [id, v] = e.split(":");
        const tw = tweaks.get(id);
        if (!tw || !availability(tw, sys).ok || tw.kind === "action") continue;
        ids.push(id);
        if (v) vs[id] = v;
      }
      setVariants((m) => ({ ...m, ...vs }));
      setSelection((s) => [...s, ...ids.filter((id) => !s.includes(id))]);
      return ids.length;
    },
    [sys, setSelection, setVariants],
  );

  const unselectMany = useCallback((ids: string[]) => setSelection((s) => s.filter((x) => !ids.includes(x))), [setSelection]);

  const requestApply = useCallback(
    (ids?: string[]) => {
      const list = ids ?? selection;
      if (!list.length) return;
      setConfirm({ ids: [...list].sort((a, b) => (catalogOrder.get(a) ?? 0) - (catalogOrder.get(b) ?? 0)), single: !!ids });
    },
    [selection],
  );

  const runRef = useRef<RunState | null>(null);
  runRef.current = run;

  useEffect(() => {
    const subs = [
      api.onItem((e) =>
        setRun((r) => {
          if (!r) return r;
          const rows = r.rows.slice();
          if (rows[e.index]) rows[e.index] = { ...rows[e.index], status: e.status, durationMs: e.durationMs };
          const logs = e.status === "error" && e.message ? [...r.logs, { id: e.id, line: `! ${e.message}` }] : r.logs;
          return { ...r, runId: e.runId, rows, logs };
        }),
      ),
      api.onLog((e) =>
        setRun((r) => (r ? { ...r, logs: r.logs.length > 600 ? [...r.logs.slice(-500), e] : [...r.logs, e] } : r)),
      ),
      api.onDone((e) => {
        setRun((r) => (r ? { ...r, done: e, endedAt: Date.now() } : r));
        void refreshHistory();
      }),
    ];
    return () => subs.forEach((p) => void p.then((un) => un()));
  }, [refreshHistory]);

  const startRun = useCallback(
    async (ids: string[], opts: { restorePoint: boolean; wmic: boolean; clearSelection: boolean }) => {
      const items: RunItem[] = [];
      if (opts.restorePoint && !ids.includes("rst_point")) items.push({ id: "rst_point" });
      if (opts.wmic) items.push({ id: "__wmic" });
      let reboot = false;
      for (const id of ids) {
        const tw = tweaks.get(id);
        if (!tw) continue;
        reboot ||= tw.reboot;
        const variant = variantOf(tw);
        const item: RunItem = { id, variant };
        if (tw.native === "minecraft_optifine") item.params = { dir: mcDir, values: tw.optifine?.[variant ?? ""] ?? {} };
        items.push(item);
      }
      setConfirm(null);
      setRun({
        runId: null,
        rows: items.map((i) => ({ id: i.id, variant: i.variant ?? null, status: "pending", durationMs: null })),
        logs: [],
        startedAt: Date.now(),
        endedAt: null,
        done: null,
        reboot,
        error: null,
      });
      try {
        const runId = await api.runTweaks(items);
        setRun((r) => (r ? { ...r, runId } : r));
        if (opts.clearSelection) unselectMany(ids);
      } catch (err) {
        setRun((r) => (r ? { ...r, error: String(err), endedAt: Date.now() } : r));
      }
    },
    [variantOf, mcDir, unselectMany],
  );

  const goTo = useCallback((p: string, tweakId?: string) => {
    setPage(p);
    setFocusTweak(tweakId ?? null);
  }, []);

  return {
    lang, setLang, motion, setMotion, t,
    page, goTo,
    sys, sysLoading, refreshSys,
    selection, selected, toggle, selectMany, unselectMany, variants, setVariant, variantOf,
    history, lastRun, refreshHistory,
    mcDir, setMcDir,
    confirm, setConfirm, requestApply,
    run, setRun, startRun,
    paletteOpen, setPaletteOpen,
    focusTweak, setFocusTweak,
    pingRequest, requestPing: () => setPingRequest((n) => n + 1),
    license, setLicense, signOut,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore hors de StoreProvider");
  return s;
}
