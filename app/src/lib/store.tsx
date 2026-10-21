import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, asLicenseError, isTauri, type AppliedView, type DoneEvent, type HistoryEntry, type ItemStatus, type LicenseError, type LicenseStatus, type ResetDone, type RunItem, type SystemInfo } from "./api";
import { autoVariant, availability, catalog, retired, tweakModule, tweaks, type Lang, type Tweak, needsReboot } from "./catalog";
import { translate, type Key } from "./i18n";
import free from "../data/free.json";

/** Réglages ouverts sans licence. Le moteur Rust applique la même liste. */
export const FREE = new Set<string>(free.tweaks);
/** Variante « retour arrière » de chaque réglage qui en a une, pour remettre Windows comme avant. */
export const REVERTS = new Map<string, string>();
for (const tw of tweaks.values()) {
  const v = tw.variants?.find((x) => x.revert);
  if (v) REVERTS.set(tw.id, v.id);
}
/** Réglages Premium dont seul le retour arrière est ouvert sans licence : RBW Mod et mode jeu (free.json, le moteur
 * applique la même liste). Ceux de Réseau et Hitreg restent fermés. */
export const FREE_REVERTS = new Set<string>(free.reverts);
/** Modes qu'on allume avant de jouer et qu'on éteint après : deux boutons au lieu d'un interrupteur. */
export const SESSION_TOGGLES = new Set(["game_mode", "rbw_mode", "win_gamemode"]);
/** Retour arrière qui lance la variante `revert` en entier (moteur : catalog::revert_runs_script) : RBW Mod « Activé ». */
export const REVERT_RUNS_SCRIPT = new Set(["rbw_mode"]);
/** Variante que le moteur lance vraiment pour annuler un réglage appliqué, pour le calcul du redémarrage. RBW Mod :
 * « Activé » (qui demande un redémarrage), sauf après le « Désactivé » de cette version, qui n'a posé que les valeurs
 * de Windows : rien n'est lancé. Les autres réglages : la variante appliquée, comme avant. */
export const undoVariant = (id: string, a: AppliedView | undefined): string | null =>
  REVERT_RUNS_SCRIPT.has(id) && a && !a.windowsValues ? (REVERTS.get(id) ?? a.variant) : (a?.variant ?? null);
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

/** Preset enregistré par le joueur (« Mes presets » du tableau de bord), entrées "id" ou "id:variante". */
export interface MyPreset {
  id: string;
  name: string;
  t: string[];
  at: number;
}

export interface RunRow {
  id: string;
  variant: string | null;
  undo: boolean;
  status: ItemStatus;
  durationMs: number | null;
  /** demande un redémarrage (variante lancée, ou celle que remet l'annulation) */
  reboot: boolean;
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
  /** réglages décochés, à remettre comme avant */
  undo: string[];
  /** lancé depuis un bouton « Lancer » : la sélection n'est pas touchée */
  single: boolean;
  /** « Tout annuler » du tableau de bord : tous les réglages appliqués sur ce PC */
  all?: boolean;
  /** « Optimiser et jouer » (bibliothèque) : le jeu lancé une fois le lot fini */
  play?: { id: string; name: string };
  /** titre et texte d'un lot préparé par un bouton (optimisations gratuites, outils) */
  title?: string;
  lead?: string;
}

/** Lancement d'un jeu de la bibliothèque, suivi par la page Jeux et la fenêtre du lot. */
export interface Playing {
  id: string;
  name: string;
  status: "waiting" | "started" | "failed";
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
  /** « Nettoyer » la RAM réduit aussi les applis en arrière-plan (paramètres, désactivé par défaut) */
  const [cleanTrim, setCleanTrim] = usePersisted<boolean>("cleanTrim", false);
  const [myPresets, setMyPresets] = usePersisted<MyPreset[]>("myPresets", []);
  /** preset choisi pour chaque jeu de la bibliothèque : "builtin:<id>", "mine:<id>" ou "none" */
  const [gamePresets, setGamePresets] = usePersisted<Record<string, string>>("gamePresets", {});
  const [playing, setPlaying] = useState<Playing | null>(null);
  /** jeu à lancer à la fin du lot en cours (« Optimiser et jouer ») */
  const launchAfter = useRef<Playing | null>(null);

  const launchGame = useCallback(async (id: string, name: string) => {
    setPlaying({ id, name, status: "waiting" });
    try {
      await api.gameLaunch(id);
      setPlaying({ id, name, status: "started" });
    } catch {
      setPlaying({ id, name, status: "failed" });
    }
  }, []);
  const launchGameRef = useRef(launchGame);
  launchGameRef.current = launchGame;
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
  /** Remise à zéro faite par le moteur (fin de Premium, déconnexion) : petit message en bas à droite. */
  const [resetDone, setResetDone] = useState<(ResetDone & { at: number }) | null>(null);
  /** La réparation du moteur au lancement a supprimé une valeur qui peut faire planter Windows (RAG-67) : petit message
   * « redémarre ton PC », une seule fois (le moteur ne le dit qu'au premier appel de ce lancement). */
  const [repairNotice, setRepairNotice] = useState(false);
  useEffect(() => {
    void api.takeRepairNotice().then(
      (v) => v && setRepairNotice(true),
      () => {},
    );
  }, []);
  const premium = license?.state === "active";
  /** Verrouillé en gratuit : tout sauf la liste gratuite et les réglages dont le retour arrière est ouvert. */
  const isLocked = useCallback((id: string) => !premium && !FREE.has(id) && !FREE_REVERTS.has(id), [premium]);
  /** En gratuit, seule la variante de retour arrière de RBW Mod et du mode jeu est ouverte. */
  const variantLocked = useCallback(
    (id: string, v: string) => !premium && !FREE.has(id) && !(FREE_REVERTS.has(id) && REVERTS.get(id) === v),
    [premium],
  );
  const openInFree = useCallback((id: string) => premium || FREE.has(id) || FREE_REVERTS.has(id), [premium]);
  /** Réglage Premium dont seul le retour arrière est gratuit : ni badge « Free », ni « Select safe tweaks ». */
  const undoOnly = useCallback((id: string) => !premium && !FREE.has(id) && FREE_REVERTS.has(id), [premium]);

  // Plan gratuit : une sélection faite avant la déconnexion ne garde que les réglages ouverts.
  useEffect(() => {
    if (license && !premium) setSelection((s) => (s.every(openInFree) ? s : s.filter(openInFree)));
  }, [license, premium, setSelection, openInFree]);

  // Rafraîchit le jeton si le serveur répond : au démarrage, une fois par jour et avec « Réessayer » du bandeau.
  // Sans réseau, le jeton reste valable jusqu'à son expiration ; une révocation renvoie à la connexion.
  const refreshLicense = useCallback(async (st: LicenseStatus) => {
    if (st.state !== "active" && st.state !== "expired") return;
    try {
      const next = await api.licenseRefresh();
      setLicense(next);
      setLicenseNotice(next.state === "expired" ? { code: "expired", message: null, buyUrl: null } : null);
    } catch (e) {
      const err = asLicenseError(e);
      if (err.code === "invalid_token" || err.code === "bound_to_other_device" || err.code === "revoked") {
        setLicenseNotice(err);
        setLicense(await api.licenseStatus());
      } else if (st.state === "expired") {
        // pas de réseau : le joueur paie peut-être encore, on le lui dit au lieu d'afficher le plan gratuit
        setLicenseNotice({ code: "expired", message: null, buyUrl: null });
      }
    }
  }, []);

  useEffect(() => {
    void api.licenseStatus().then((st) => {
      setLicense(st);
      void refreshLicense(st);
    });
    const daily = setInterval(() => void api.licenseStatus().then(refreshLicense), 24 * 3600 * 1000);
    return () => clearInterval(daily);
  }, [refreshLicense]);

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
    for (let e of history) {
      if (e.undo) {
        // Mode jeu et mode jeu de Windows (on les allume et on les éteint) : une annulation remet l'état d'avant. Le
        // moteur note comme annulation « Désactivé » lancé sur un Mode jeu activé (variante de retour arrière) : la
        // ligne affichait encore « Activé depuis… ». L'annulation compte comme cette variante (« Désactivé
        // depuis… ») ; sans variante de retour arrière (mode jeu de Windows), plus de badge. RBW Mod : son annulation
        // après « Désactivé » ne lance rien et garde « Désactivé depuis… » (runner.rs) ; son retour arrière est noté
        // comme « Activé », pas comme une annulation.
        if (!SESSION_TOGGLES.has(e.id) || REVERT_RUNS_SCRIPT.has(e.id)) continue;
        e = { ...e, variant: REVERTS.get(e.id) ?? null };
      }
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
      if (!premium && !FREE.has(tw.id) && FREE_REVERTS.has(tw.id)) return REVERTS.get(tw.id)!;
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

  /** Réglages allumés en ce moment (appliqués ou cochés), avec leur variante, dans l'ordre du catalogue : ce que
   * garde un code de partage ou « Enregistrer ma sélection ». Les actions ponctuelles n'en font pas partie. */
  const currentSetup = useMemo(() => {
    const out: string[] = [];
    for (const id of catalogOrder.keys()) {
      const tw = tweaks.get(id);
      if (!tw || tw.kind !== "tweak" || !isOn(id)) continue;
      const v = selected.has(id) ? variantOf(tw) : (applied.get(id)?.variant ?? null);
      out.push(v ? `${id}:${v}` : id);
    }
    return out;
  }, [isOn, selected, variantOf, applied]);

  const savePreset = useCallback(
    (name: string, entries: string[]) =>
      setMyPresets((list) => [...list, { id: `p${Date.now().toString(36)}`, name: name.trim(), t: entries, at: Date.now() }]),
    [setMyPresets],
  );
  const deletePreset = useCallback((id: string) => setMyPresets((list) => list.filter((p) => p.id !== id)), [setMyPresets]);

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

  /** Réglages d'une liste "id" ou "id:variante" à appliquer sur ce PC (mêmes règles que selectMany), sans toucher à
   * la sélection : variante voulue de chacun, déjà appliqués avec cette variante exclus (sauf `again` : relancés). */
  const toApply = useCallback(
    (entries: string[], again = false) => {
      const ids: string[] = [];
      const vs: Record<string, string> = {};
      for (const e of entries) {
        const [id, v] = e.split(":");
        const tw = tweaks.get(id);
        if (!tw || !availability(tw, sys).ok || tw.kind === "action" || isLocked(id) || (v && variantLocked(id, v))) continue;
        const variant = v && tw.variants?.some((x) => x.id === v) ? v : undefined;
        const a = applied.get(id);
        if (!again && a && !undoSet.has(id) && (a.variant ?? null) === (variant || (variants[id] ?? autoVariant(tw, sys) ?? null))) continue;
        ids.push(id);
        if (variant) vs[id] = variant;
      }
      return { ids, vs };
    },
    [sys, isLocked, variantLocked, applied, undoSet, variants],
  );

  /** « Optimiser et jouer » : confirmation des réglages du preset du jeu, lot, puis lancement du jeu. Tout est déjà
   * appliqué : le jeu démarre tout de suite. */
  const optimizeAndPlay = useCallback(
    (game: { id: string; name: string }, entries: string[]) => {
      const { ids, vs } = toApply(entries);
      if (!ids.length) return void launchGame(game.id, game.name);
      setVariants((m) => ({ ...m, ...vs }));
      launchAfter.current = { ...game, status: "waiting" };
      setPlaying(null);
      setConfirm({ ids: ids.sort(byCatalog), undo: [], single: true, play: game });
    },
    [toApply, launchGame, setVariants],
  );

  /** Lot préparé par un bouton (optimisations gratuites, outils) : confirmation, sans toucher à la sélection. 0 : tout
   * est déjà appliqué. */
  const requestApplyEntries = useCallback(
    (entries: string[], text?: { title: string; lead: string }, again = false) => {
      const { ids, vs } = toApply(entries, again);
      if (!ids.length) return 0;
      setVariants((m) => ({ ...m, ...vs }));
      setConfirm({ ids: ids.sort(byCatalog), undo: [], single: true, ...text });
      return ids.length;
    },
    [toApply, setVariants],
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

  // confirmation fermée sans lancer le lot : le jeu ne démarre pas plus tard
  useEffect(() => {
    if (!confirm && !run) launchAfter.current = null;
  }, [confirm, run]);

  useEffect(() => {
    // lot terminé encore affiché : un lot lancé depuis la barre en jeu ne vient pas s'y mélanger
    const subs = [
      api.onItem((e) =>
        setRun((r) => {
          if (!r || r.done) return r;
          const rows = r.rows.slice();
          if (rows[e.index]) rows[e.index] = { ...rows[e.index], status: e.status, durationMs: e.durationMs };
          const logs = e.status === "error" && e.message ? [...r.logs, { id: e.id, line: `! ${e.message}` }] : r.logs;
          return { ...r, runId: e.runId, rows, logs };
        }),
      ),
      api.onLog((e) =>
        setRun((r) => (r && !r.done ? { ...r, logs: r.logs.length > 600 ? [...r.logs.slice(-500), e] : [...r.logs, e] } : r)),
      ),
      api.onDone((e) => {
        setRun((r) => (r && !r.done ? { ...r, done: e, endedAt: Date.now() } : r));
        // « Optimiser et jouer » : le jeu démarre une fois les réglages posés, sauf si le joueur a arrêté le lot
        const play = launchAfter.current;
        launchAfter.current = null;
        if (play && !e.cancelled) void launchGameRef.current(play.id, play.name);
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
      opts: { restorePoint: boolean; wmic: boolean; clearSelection: boolean; undo?: string[] },
    ) => {
      const items: RunItem[] = [];
      // point de restauration quand la case est cochée (comme en 1.1.6), toujours en tête : s'il échoue, le moteur
      // n'applique rien de ce qui suit
      if (opts.restorePoint || ids.includes("rst_point")) items.push({ id: "rst_point" });
      ids = ids.filter((id) => id !== "rst_point");
      if (opts.wmic) items.push({ id: "__wmic" });
      // lignes du lot qui demandent un redémarrage : après « Arrêter », seules celles allées au bout comptent
      const rebootAt = new Set<number>();
      // d'abord les annulations : un réglage réappliqué juste après repart de l'état d'avant
      for (const id of opts.undo ?? []) {
        const tw = tweaks.get(id);
        const a = applied.get(id);
        // réglage retiré du catalogue : il reste annulable là où une version précédente l'a appliqué. Inconnu de cette
        // version mais noté dans applied.json (Tout annuler) : le moteur le remet quand même avec ce qu'il a gardé
        const gone = retired.get(id);
        if (!tw && !gone && !a) continue;
        if (tw ? needsReboot(tw, undoVariant(id, a)) : (gone?.reboot ?? false)) rebootAt.add(items.length);
        const item: RunItem = { id, variant: a?.variant ?? null, undo: true };
        if (tw?.native === "minecraft_optifine") item.params = { dir: mcDir };
        items.push(item);
      }
      for (const id of ids) {
        const tw = tweaks.get(id);
        if (!tw) continue;
        const variant = variantOf(tw);
        if (needsReboot(tw, variant)) rebootAt.add(items.length);
        const item: RunItem = { id, variant };
        if (tw.native === "minecraft_optifine") item.params = { dir: mcDir, values: tw.optifine?.[variant ?? ""] ?? {} };
        items.push(item);
      }
      setConfirm(null);
      // un lancement de jeu d'avant ne s'affiche pas dans ce lot
      setPlaying(null);
      setRun({
        runId: null,
        rows: items.map((i, n) => ({ id: i.id, variant: i.variant ?? null, undo: !!i.undo, status: "pending", durationMs: null, reboot: rebootAt.has(n) })),
        logs: [],
        startedAt: Date.now(),
        endedAt: null,
        done: null,
        reboot: rebootAt.size > 0,
        error: null,
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
            : msg.startsWith("reset_running")
              ? translate(lang, "err.reset_running")
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
  /** « Tout annuler » : la liste vient du moteur (même liste et même ordre que la remise à zéro de la désinstallation),
   * le joueur confirme, puis chaque réglage est remis comme une annulation ordinaire. */
  const requestUndoAll = useCallback(async () => {
    const ids = await api.undoAllPlan().catch(() => [...applied.keys()]);
    if (ids.length) setConfirm({ ids: [], undo: ids, single: false, all: true });
  }, [applied]);

  /** Réglages Premium appliqués : le moteur les remet de lui-même à la déconnexion et à la fin de Premium. */
  const premiumApplied = useMemo(() => [...applied.keys()].filter((id) => !FREE.has(id)).sort(byCatalog), [applied]);

  // Licence terminée (abonnement fini, remboursement, licence passée sur un autre PC) ou déconnexion : le moteur remet
  // tous les réglages en arrière-plan, sans fenêtre ni bouton pour l'arrêter, et ne prévient qu'à la fin.
  useEffect(() => {
    const sub = api.onReset((e) => {
      void refreshApplied();
      void refreshHistory();
      if (e.ok > 0 || e.failed > 0) setResetDone({ ...e, at: Date.now() });
    });
    return () => void sub.then((un) => un());
  }, [refreshApplied, refreshHistory]);

  const goTo = useCallback((p: string, tweakId?: string) => {
    setPage(p);
    setFocusTweak(tweakId ?? null);
    if (tweakId) setFocusSeq((n) => n + 1);
  }, []);
  // barre en jeu : « Ouvrir Rago Optimizer » ou l'offre Premium, depuis la partie
  useEffect(() => {
    const sub = api.onGoto((page) => (page === "premium" ? setUpsell("plan") : goTo(page)));
    return () => void sub.then((un) => un());
  }, [goTo, setUpsell]);
  // langue du menu de l'icône près de l'horloge
  useEffect(() => {
    if (!isTauri) return;
    void api.backgroundGet().then(
      (st) => {
        if (st.prefs.lang !== lang) void api.backgroundSet({ ...st.prefs, lang });
      },
      () => {},
    );
  }, [lang]);

  return {
    lang, setLang, motion, setMotion, t,
    page, goTo,
    refreshLicense,
    sys, sysLoading, refreshSys,
    selection, selected, toggle, selectMany, unselectMany, variants, setVariant, variantOf,
    pendingUndo, applied, appliedLoaded: appliedList !== null, isOn, premiumApplied, reapply, resetDone, setResetDone,
    repairNotice, setRepairNotice,
    retiredApplied, requestUndo, requestUndoAll,
    history, lastRun, lastRestore, refreshHistory, refreshApplied,
    mcDir, setMcDir, cleanTrim, setCleanTrim,
    currentSetup, myPresets, savePreset, deletePreset,
    gamePresets, setGamePresets, playing, setPlaying, launchGame, optimizeAndPlay, toApply,
    confirm, setConfirm, requestApply, requestApplyEntries,
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
