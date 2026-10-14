import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, asLicenseError, type AppliedView, type DoneEvent, type HistoryEntry, type ItemStatus, type LicenseError, type LicenseStatus, type RunItem, type SystemInfo } from "./api";
import { autoVariant, availability, catalog, retired, tweakModule, tweaks, type Lang, type Tweak, needsReboot } from "./catalog";
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

// noms portés par plusieurs réglages (Disable autologgers, Disable HDCP…) : on ajoute le module pour les distinguer
const DUP_NAMES: Record<Lang, Set<string>> = { fr: new Set(), en: new Set() };
for (const lang of ["fr", "en"] as const) {
  const seen = new Set<string>();
  for (const tw of tweaks.values()) {
    if (seen.has(tw.name[lang])) DUP_NAMES[lang].add(tw.name[lang]);
    seen.add(tw.name[lang]);
  }
}

export function itemName(id: string, lang: Lang): string {
  const tw = tweaks.get(id);
  if (!tw) return retired.get(id)?.name[lang] ?? BUILTIN_NAMES[id]?.[lang] ?? id;
  const mod = catalog.modules.find((m) => m.id === tweakModule.get(id));
  return DUP_NAMES[lang].has(tw.name[lang]) && mod ? `${tw.name[lang]} · ${mod.name[lang]}` : tw.name[lang];
}

/** Un point de restauration réussi depuis moins longtemps que ça : la case n'est plus cochée d'office. */
export const RESTORE_FRESH_MS = 24 * 3600 * 1000;

export interface RunRow {
  id: string;
  variant: string | null;
  undo: boolean;
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
  /** phrase sous le titre (fin de Premium, déconnexion) */
  note: string | null;
  /** remise à zéro obligatoire (déconnexion) : pas de bouton pour l'arrêter */
  noCancel: boolean;
}

export interface ConfirmState {
  ids: string[];
  /** réglages décochés, à remettre comme avant */
  undo: string[];
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
  /** réglages appliqués décochés, annulés au prochain « Appliquer » */
  const [pendingUndo, setPendingUndo] = usePersisted<string[]>("pendingUndo", []);
  /** réglages appliqués d'après le moteur (applied.json), null tant qu'il n'a pas répondu */
  const [appliedList, setAppliedList] = useState<AppliedView[] | null>(null);
  const applied = useMemo(() => new Map((appliedList ?? []).map((a) => [a.id, a])), [appliedList]);
  const [variants, setVariants] = usePersisted<Record<string, string>>("variants", {});
  const [mcDirOverride, setMcDir] = usePersisted<string | null>("mcDir", null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [run, setRun] = useState<RunState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusTweak, setFocusTweak] = useState<string | null>(null);
  // chaque recherche compte, même vers le réglage déjà visé (sa ligne a pu disparaître dans une section repliée)
  const [focusSeq, setFocusSeq] = useState(0);
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
  const refreshApplied = useCallback(async () => setAppliedList(await api.applied()), []);

  useEffect(() => {
    void refreshSys();
    void refreshHistory();
    void refreshApplied();
  }, [refreshSys, refreshHistory, refreshApplied]);

  // licence active (et clé des scripts reçue) : le moteur garde l'annulation des réglages Premium appliqués,
  // pour pouvoir les remettre après une déconnexion ou une fin de licence
  useEffect(() => {
    if (license?.state === "active") void refreshApplied();
  }, [license, refreshApplied]);

  // sélection gardée d'une version précédente : les réglages retirés du catalogue n'y ont plus leur place
  useEffect(() => setSelection((s) => (s.every((id) => tweaks.has(id)) ? s : s.filter((id) => tweaks.has(id)))), [setSelection]);

  // un réglage annulé ailleurs (fin de Premium) ou plus appliqué n'a plus rien à annuler
  useEffect(() => {
    if (appliedList) setPendingUndo((p) => (p.every((id) => applied.has(id)) ? p : p.filter((id) => applied.has(id))));
  }, [appliedList, applied, setPendingUndo]);

  // dernier passage de chaque réglage, pour les badges « Appliqué le… »
  const lastRun = useMemo(() => {
    const m = new Map<string, HistoryEntry>();
    for (const e of history) {
      if (e.undo) continue;
      const prev = m.get(e.id);
      if (!prev || prev.ts < e.ts) m.set(e.id, e);
    }
    return m;
  }, [history]);

  /** dernier point de restauration créé par Rago Optimizer (réussi) */
  const lastRestore = useMemo(
    () => history.reduce<number | null>((m, e) => (e.id === "rst_point" && e.ok && !e.undo && (m == null || e.ts > m) ? e.ts : m), null),
    [history],
  );

  const selected = useMemo(() => new Set(selection), [selection]);
  const undoSet = useMemo(() => new Set(pendingUndo), [pendingUndo]);
  /** Interrupteur allumé : appliqué (et pas décoché depuis), ou coché pour être appliqué. */
  const isOn = useCallback((id: string) => (applied.has(id) && !undoSet.has(id)) || selected.has(id), [applied, undoSet, selected]);
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
      const want = on ?? !isOn(id);
      if (applied.has(id)) {
        // appliqué : l'éteindre prépare son annulation (possible même sans licence), le rallumer l'oublie
        if (want) setPendingUndo((p) => p.filter((x) => x !== id));
        else {
          setPendingUndo((p) => (p.includes(id) ? p : [...p, id]));
          setSelection((s) => s.filter((x) => x !== id));
        }
        return;
      }
      if (isLocked(id)) {
        setUpsell("tweak", id);
        return;
      }
      setSelection((s) => {
        const has = s.includes(id);
        if (want === has) return s;
        return want ? [...s, id] : s.filter((x) => x !== id);
      });
    },
    [setSelection, setPendingUndo, isLocked, isOn, applied],
  );

  const setVariant = useCallback(
    (id: string, v: string) => {
      if (variantLocked(id, v)) return setUpsell("tweak", id);
      setVariants((m) => ({ ...m, [id]: v }));
      // appliqué avec une autre variante : la nouvelle sera appliquée au prochain « Appliquer »
      const a = applied.get(id);
      if (a && SESSION_TOGGLES.has(id)) return;
      if (a) {
        setPendingUndo((p) => p.filter((x) => x !== id));
        setSelection((s) => (a.variant === v ? s.filter((x) => x !== id) : s.includes(id) ? s : [...s, id]));
      }
    },
    [setVariants, variantLocked, setUpsell, applied, setSelection, setPendingUndo],
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
        // déjà appliqué avec cette variante : rien à refaire
        const a = applied.get(id);
        if (a && !undoSet.has(id) && (a.variant ?? null) === (v || (variants[id] ?? autoVariant(tw, sys) ?? null))) continue;
        ids.push(id);
        if (v) vs[id] = v;
      }
      setVariants((m) => ({ ...m, ...vs }));
      setSelection((s) => [...s, ...ids.filter((id) => !s.includes(id))]);
      setPendingUndo((p) => p.filter((id) => !ids.includes(id)));
      return ids.length;
    },
    [sys, setSelection, setVariants, setPendingUndo, isLocked, variantLocked, applied, undoSet, variants],
  );

  /** Réapplique un réglage déjà appliqué (Windows en a changé une valeur depuis). */
  const reapply = useCallback(
    (id: string) => {
      setPendingUndo((p) => p.filter((x) => x !== id));
      setSelection((s) => (s.includes(id) ? s : [...s, id]));
    },
    [setSelection, setPendingUndo],
  );

  /** Décoche : retire de la sélection, et pour un réglage appliqué, revient à l'état appliqué. */
  const unselectMany = useCallback(
    (ids: string[]) => {
      setSelection((s) => s.filter((x) => !ids.includes(x)));
      setPendingUndo((p) => p.filter((x) => !ids.includes(x)));
    },
    [setSelection, setPendingUndo],
  );

  const byCatalog = (a: string, b: string) => (catalogOrder.get(a) ?? 0) - (catalogOrder.get(b) ?? 0);
  const requestApply = useCallback(
    (ids?: string[]) => {
      const list = (ids ?? selection).filter((id) => !isLocked(id));
      const undo = ids ? [] : pendingUndo.filter((id) => applied.has(id));
      if (!list.length && !undo.length) {
        if ((ids ?? selection).length) setUpsell("tweak", (ids ?? selection)[0]);
        return;
      }
      setConfirm({ ids: [...list].sort(byCatalog), undo: [...undo].sort(byCatalog), single: !!ids });
    },
    [selection, pendingUndo, applied, isLocked, setUpsell],
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
        // pas de point de restauration : rien n'a été appliqué, la sélection revient pour réessayer
        const skipped = (runRef.current?.rows ?? []).filter((r) => !r.undo && tweaks.get(r.id)?.kind === "tweak").map((r) => r.id);
        if (e.restoreFailed && skipped.length) setSelection((s) => [...s, ...skipped.filter((id) => !s.includes(id))]);
        void refreshHistory();
        void refreshApplied();
      }),
    ];
    return () => subs.forEach((p) => void p.then((un) => un()));
  }, [refreshHistory, refreshApplied, setSelection]);

  const startRun = useCallback(
    async (
      ids: string[],
      opts: { restorePoint: boolean; wmic: boolean; clearSelection: boolean; undo?: string[]; note?: string | null; noCancel?: boolean },
    ) => {
      const items: RunItem[] = [];
      // point de restauration quand la case est cochée (comme en 1.1.6), toujours en tête : s'il échoue, le moteur
      // n'applique rien de ce qui suit
      if (opts.restorePoint || ids.includes("rst_point")) items.push({ id: "rst_point" });
      ids = ids.filter((id) => id !== "rst_point");
      if (opts.wmic) items.push({ id: "__wmic" });
      let reboot = false;
      // d'abord les annulations : un réglage réappliqué juste après repart de l'état d'avant
      for (const id of opts.undo ?? []) {
        const tw = tweaks.get(id);
        const a = applied.get(id);
        // réglage retiré du catalogue : il reste annulable là où une version précédente l'a appliqué
        const gone = retired.get(id);
        if (!tw && !gone) continue;
        reboot ||= tw ? needsReboot(tw, a?.variant ?? null) : gone!.reboot;
        const item: RunItem = { id, variant: a?.variant ?? null, undo: true };
        if (tw?.native === "minecraft_optifine") item.params = { dir: mcDir };
        items.push(item);
      }
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
        rows: items.map((i) => ({ id: i.id, variant: i.variant ?? null, undo: !!i.undo, status: "pending", durationMs: null })),
        logs: [],
        startedAt: Date.now(),
        endedAt: null,
        done: null,
        reboot,
        error: null,
        note: opts.note ?? null,
        noCancel: opts.noCancel ?? false,
      });
      try {
        const runId = await api.runTweaks(items);
        setRun((r) => (r ? { ...r, runId } : r));
        if (opts.clearSelection) unselectMany([...ids, ...(opts.undo ?? [])]);
      } catch (err) {
        const msg = String(err);
        const error = msg.startsWith("premium_required")
          ? translate(lang, "err.premium_required")
          : msg.startsWith("premium_scripts_unavailable")
            ? translate(lang, "err.premium_scripts_unavailable")
            : msg;
        setRun((r) => (r ? { ...r, error, endedAt: Date.now() } : r));
      }
    },
    [variantOf, mcDir, unselectMany, lang, applied],
  );

  /** Réglages retirés du catalogue mais encore appliqués sur ce PC : on propose de les remettre comme avant. */
  const retiredApplied = useMemo(() => [...applied.keys()].filter((id) => retired.has(id)), [applied]);
  const requestUndo = useCallback((ids: string[]) => {
    if (ids.length) setConfirm({ ids: [], undo: ids, single: false });
  }, []);

  /** Réglages Premium appliqués : annulés quand l'abonnement Premium prend fin. */
  const premiumApplied = useMemo(() => [...applied.keys()].filter((id) => !FREE.has(id)).sort(byCatalog), [applied]);

  /** Tous les réglages appliqués (Premium et gratuits) : tout remis comme avant à la déconnexion. */
  const allApplied = useMemo(() => [...applied.keys()].sort(byCatalog), [applied]);

  const endedRef = useRef(false);
  /** Déconnexion : remet d'abord TOUS les réglages comme avant (Premium et gratuits), sans pouvoir l'arrêter, puis
   *  déconnecte. L'annulation reste permise sans licence. */
  const signOutAndUndo = useCallback(async () => {
    const ids = allApplied;
    endedRef.current = true;
    if (ids.length)
      await startRun([], {
        restorePoint: false,
        wmic: false,
        clearSelection: true,
        undo: ids,
        note: translate(lang, "run.signOutNote", { n: ids.length }),
        noCancel: true,
      });
    await signOut();
  }, [allApplied, startRun, signOut, lang]);

  // Premium terminé (abonnement fini, remboursement) ou plus de licence sur ce PC : au lancement, les réglages
  // Premium encore appliqués sont annulés, avec un message. Un jeton expiré hors ligne n'annule rien : le joueur
  // paie peut-être encore, le serveur le dira au prochain rafraîchissement.
  useEffect(() => {
    if (endedRef.current || !license || !appliedList || run) return;
    if (license.state !== "none" || !premiumApplied.length) return;
    endedRef.current = true;
    void startRun([], {
      restorePoint: false,
      wmic: false,
      clearSelection: true,
      undo: premiumApplied,
      note: translate(lang, "run.endedNote", { n: premiumApplied.length }),
    });
  }, [license, appliedList, run, premiumApplied, startRun, lang]);

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
    pendingUndo, applied, appliedLoaded: appliedList !== null, isOn, premiumApplied, allApplied, signOutAndUndo, reapply,
    retiredApplied, requestUndo,
    history, lastRun, lastRestore, refreshHistory, refreshApplied,
    mcDir, setMcDir,
    confirm, setConfirm, requestApply,
    run, setRun, startRun,
    paletteOpen, setPaletteOpen,
    focusTweak, setFocusTweak, focusSeq,
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
