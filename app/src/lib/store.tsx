import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, asLicenseError, type DoneEvent, type HistoryEntry, type ItemStatus, type LicenseError, type LicenseStatus, type RunItem, type SystemInfo } from "./api";
import { autoVariant, availability, catalog, tweaks, type Lang, type Tweak, needsReboot } from "./catalog";
import { translate, type Key } from "./i18n";
import free from "../data/free.json";

/** Réglages ouverts sans licence. Le moteur Rust applique la même liste. */
export const FREE = new Set<string>(free.tweaks);
/** Variante « retour arrière » de chaque réglage qui en a une : ouverte en gratuit, pour remettre Windows comme avant. */
export const REVERTS = new Map<string, string>();
for (const tw of tweaks.values()) {
  const v = tw.variants?.find((x) => x.revert);
  if (v) REVERTS.set(tw.id, v.id);
}
/** Modes qu'on allume avant de jouer et qu'on éteint après : deux boutons au lieu d'un interrupteur. */
export const SESSION_TOGGLES = new Set(["game_mode", "rbw_mode", "win_gamemode"]);
/** « plan » : la carte Free plan ou le bouton Premium d'un module, sans réglage précis. */
export type Upsell = "tweak" | "plan" | "preset" | "signin" | null;

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
  // chaque recherche compte, même vers le réglage déjà visé (sa ligne a pu disparaître dans une section repliée)
  const [focusSeq, setFocusSeq] = useState(0);
  const [pingRequest, setPingRequest] = useState(0);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [upsell, setUpsellKind] = useState<Upsell>(null);
  const [upsellTweak, setUpsellTweak] = useState<string | null>(null);
  const setUpsell = useCallback((u: Upsell, tweakId?: string) => {
    setUpsellKind(u);
    if (u !== "signin") setUpsellTweak(tweakId ?? null);
  }, []);
  /** Licence perdue au rafraîchissement (abonnement terminé, remboursement…) ou plus vérifiable hors ligne. */
  const [licenseNotice, setLicenseNotice] = useState<LicenseError | null>(null);
  const [activatedAt, setActivatedAt] = usePersisted<number | null>("activatedAt", null);
  const premium = license?.state === "active";
  /** Verrouillé en gratuit : tout sauf la liste gratuite et les réglages qui ont une variante de retour arrière. */
  const isLocked = useCallback((id: string) => !premium && !FREE.has(id) && !REVERTS.has(id), [premium]);
  /** En gratuit, seule la variante de retour arrière d'un réglage Premium est ouverte. */
  const variantLocked = useCallback((id: string, v: string) => !premium && !FREE.has(id) && REVERTS.get(id) !== v, [premium]);
  const openInFree = useCallback((id: string) => premium || FREE.has(id) || REVERTS.has(id), [premium]);
  /** Réglage Premium dont seul le retour arrière est gratuit : ni badge « Free », ni « Select safe tweaks ». */
  const undoOnly = useCallback((id: string) => !premium && !FREE.has(id) && REVERTS.has(id), [premium]);

  // Plan gratuit : une sélection faite avant la déconnexion ne garde que les réglages ouverts.
  useEffect(() => {
    if (license && !premium) setSelection((s) => (s.every(openInFree) ? s : s.filter(openInFree)));
  }, [license, premium, setSelection, openInFree]);

  useEffect(() => {
    // Au démarrage puis une fois par jour : rafraîchit le jeton si le serveur répond.
    // Sans réseau, le jeton reste valable jusqu'à son expiration ; une révocation renvoie à la connexion.
    const refresh = (st: LicenseStatus) => {
      if (st.state !== "active" && st.state !== "expired") return;
      void api.licenseRefresh().then(
        (next) => {
          setLicense(next);
          setLicenseNotice(next.state === "expired" ? { code: "expired", message: null, buyUrl: null } : null);
        },
        async (e) => {
          const err = asLicenseError(e);
          if (err.code === "invalid_token" || err.code === "bound_to_other_device" || err.code === "revoked") {
            setLicenseNotice(err);
            setLicense(await api.licenseStatus());
          } else if (st.state === "expired") {
            // pas de réseau : le joueur paie peut-être encore, on le lui dit au lieu d'afficher le plan gratuit
            setLicenseNotice({ code: "expired", message: null, buyUrl: null });
          }
        },
      );
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
    setLicenseNotice(null);
    setActivatedAt(null);
    setLicense(await api.licenseStatus());
  }, [setActivatedAt]);

  /** Licence activée dans l'app (connexion ou Activate). */
  const activated = useCallback(
    (st: LicenseStatus, fresh: boolean) => {
      setLicense(st);
      setLicenseNotice(null);
      if (fresh || activatedAt == null) setActivatedAt(Date.now());
    },
    [activatedAt, setActivatedAt],
  );

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
    (tw: Tweak) => {
      if (!tw.variants?.length) return null;
      if (!premium && !FREE.has(tw.id) && REVERTS.has(tw.id)) return REVERTS.get(tw.id)!;
      return variants[tw.id] ?? autoVariant(tw, sys) ?? null;
    },
    [variants, sys, premium],
  );

  const toggle = useCallback(
    (id: string, on?: boolean) => {
      if (isLocked(id)) {
        setUpsell("tweak", id);
        return;
      }
      setSelection((s) => {
        const has = s.includes(id);
        const want = on ?? !has;
        if (want === has) return s;
        return want ? [...s, id] : s.filter((x) => x !== id);
      });
    },
    [setSelection, isLocked],
  );

  const setVariant = useCallback(
    (id: string, v: string) => {
      if (variantLocked(id, v)) return setUpsell("tweak", id);
      setVariants((m) => ({ ...m, [id]: v }));
    },
    [setVariants, variantLocked, setUpsell],
  );

  /** Ajoute une liste "id" ou "id:variante" à la sélection (presets). */
  const selectMany = useCallback(
    (entries: string[]) => {
      const ids: string[] = [];
      const vs: Record<string, string> = {};
      for (const e of entries) {
        const [id, v] = e.split(":");
        const tw = tweaks.get(id);
        if (!tw || !availability(tw, sys).ok || tw.kind === "action" || isLocked(id) || (v && variantLocked(id, v))) continue;
        ids.push(id);
        if (v) vs[id] = v;
      }
      setVariants((m) => ({ ...m, ...vs }));
      setSelection((s) => [...s, ...ids.filter((id) => !s.includes(id))]);
      return ids.length;
    },
    [sys, setSelection, setVariants, isLocked, variantLocked],
  );

  const unselectMany = useCallback((ids: string[]) => setSelection((s) => s.filter((x) => !ids.includes(x))), [setSelection]);

  const requestApply = useCallback(
    (ids?: string[]) => {
      const list = (ids ?? selection).filter((id) => !isLocked(id));
      if (!list.length) {
        if ((ids ?? selection).length) setUpsell("tweak", (ids ?? selection)[0]);
        return;
      }
      setConfirm({ ids: [...list].sort((a, b) => (catalogOrder.get(a) ?? 0) - (catalogOrder.get(b) ?? 0)), single: !!ids });
    },
    [selection, isLocked, setUpsell],
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
        const variant = variantOf(tw);
        reboot ||= needsReboot(tw, variant);
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
        const msg = String(err);
        const error = msg.startsWith("premium_required") ? translate(lang, "err.premium_required") : msg;
        setRun((r) => (r ? { ...r, error, endedAt: Date.now() } : r));
      }
    },
    [variantOf, mcDir, unselectMany, lang],
  );

  const goTo = useCallback((p: string, tweakId?: string) => {
    setPage(p);
    setFocusTweak(tweakId ?? null);
    if (tweakId) setFocusSeq((n) => n + 1);
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
    focusTweak, setFocusTweak, focusSeq,
    pingRequest, requestPing: () => setPingRequest((n) => n + 1),
    license, setLicense, signOut, activated, activatedAt, licenseNotice, setLicenseNotice,
    premium, isLocked, variantLocked, undoOnly, upsell, upsellTweak, setUpsell,
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
