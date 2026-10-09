// Compte Rago dans l'app (nom public, photo, avis) et invitation à laisser un avis.
// L'invitation vient après 5 minutes d'utilisation réelle (fenêtre visible, active, et le joueur s'en sert),
// une fois par lancement au plus. Fermée : elle revient au plus tôt 7 jours et 30 minutes d'utilisation plus tard ;
// fermée une deuxième fois, ou avis donné : plus jamais.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { accountApi, asAccountError, type AccountState } from "./accountApi";
import { useStore } from "./store";

export const PROMPT_KEY = "rago.reviewPrompt";
/** utilisation réelle avant la première invitation */
export const FIRST_AFTER_MS = 5 * 60_000;
/** après une fermeture : au plus tôt 7 jours et 30 minutes d'utilisation plus tard */
export const SNOOZE_MS = 7 * 86_400_000;
export const SNOOZE_USE_MS = 30 * 60_000;
/** fermée deux fois : plus jamais */
export const MAX_DISMISSALS = 2;
const TICK_MS = 5_000;
/** sans clic, touche ni mouvement depuis 1 minute, le temps ne compte plus */
const IDLE_MS = 60_000;

export interface PromptMemo {
  usedMs: number;
  nextAtMs: number;
  snoozeUntil: number;
  dismissals: number;
  /** avis donné ou invitation fermée deux fois */
  done: boolean;
}

const FRESH: PromptMemo = { usedMs: 0, nextAtMs: FIRST_AFTER_MS, snoozeUntil: 0, dismissals: 0, done: false };

function loadMemo(): PromptMemo {
  try {
    return { ...FRESH, ...JSON.parse(localStorage.getItem(PROMPT_KEY) ?? "{}") };
  } catch {
    return FRESH;
  }
}
function saveMemo(m: PromptMemo) {
  try {
    localStorage.setItem(PROMPT_KEY, JSON.stringify(m));
  } catch {
    /* stockage indisponible : l'invitation n'est pas proposée (voir `stored`) */
  }
}
const storageWorks = (() => {
  try {
    localStorage.setItem("rago.t", "1");
    localStorage.removeItem("rago.t");
    return true;
  } catch {
    return false;
  }
})();

/** L'invitation est due : assez d'utilisation, et plus de report en cours. */
const isDue = (m: PromptMemo) => storageWorks && !m.done && m.usedMs >= m.nextAtMs && Date.now() >= m.snoozeUntil;

/** "loading" : première réponse attendue ; "offline" : serveur injoignable (on garde l'état d'avant). */
export type AccountStatus = "loading" | "ready" | "offline";
export type Dialog = null | { kind: "review"; fromPrompt: boolean } | { kind: "signin" };

function useAccountValue() {
  const { license, run, confirm, paletteOpen, upsell, selection, pendingUndo } = useStore();
  const [state, setState] = useState<AccountState>({ via: null, profile: null, review: null });
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [memo, setMemoState] = useState<PromptMemo>(loadMemo);
  const memoRef = useRef(memo);
  const [due, setDue] = useState(() => isDue(memo));
  const setMemo = useCallback((f: (m: PromptMemo) => PromptMemo) => {
    const next = f(memoRef.current);
    if (next === memoRef.current) return;
    memoRef.current = next;
    saveMemo(next);
    setMemoState(next);
    setDue(isDue(next));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await accountApi.me());
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "loading" ? "offline" : s));
    }
  }, []);

  // au démarrage, et quand la licence change (connexion Premium, déconnexion)
  useEffect(() => {
    if (license) void refresh();
  }, [license?.state, license?.email, refresh]);

  // un avis existe déjà (donné sur ce PC ou ailleurs) : plus d'invitation
  useEffect(() => {
    if (state.review && !memoRef.current.done) setMemo((m) => ({ ...m, done: true }));
  }, [state.review, setMemo]);

  // horloge d'utilisation réelle
  useEffect(() => {
    if (!storageWorks || memoRef.current.done) return;
    let last = Date.now();
    let active = Date.now();
    const touch = () => {
      active = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    const id = setInterval(() => {
      const now = Date.now();
      const step = Math.min(now - last, TICK_MS);
      last = now;
      // la fin d'un report arrive aussi sans que le compteur bouge
      setDue(isDue(memoRef.current));
      if (document.visibilityState !== "visible" || !document.hasFocus() || now - active > IDLE_MS) return;
      // une fois l'invitation due, le compteur attend qu'elle soit vue
      setMemo((m) => (m.done || m.usedMs >= m.nextAtMs ? m : { ...m, usedMs: m.usedMs + step }));
    }, TICK_MS);
    return () => {
      clearInterval(id);
      for (const e of events) window.removeEventListener(e, touch);
    };
  }, [memo.done, setMemo]);

  /** l'invitation a été vue et laissée (bouton Plus tard, croix, ou formulaire fermé sans envoi) */
  const dismissPrompt = useCallback(() => {
    setMemo((m) => {
      const dismissals = m.dismissals + 1;
      return dismissals >= MAX_DISMISSALS
        ? { ...m, dismissals, done: true }
        : { ...m, dismissals, snoozeUntil: Date.now() + SNOOZE_MS, nextAtMs: m.usedMs + SNOOZE_USE_MS };
    });
  }, [setMemo]);

  // pas pendant une optimisation, une fenêtre ou une sélection en cours (la barre « Appliquer » est en bas)
  const busy = !!run || !!confirm || paletteOpen || !!upsell || !!dialog || selection.length > 0 || pendingUndo.length > 0;
  const showPrompt = due && status === "ready" && !state.review && !busy && license?.state !== "unconfigured";

  const dialogRef = useRef<Dialog>(null);
  const show = useCallback((d: Dialog) => {
    dialogRef.current = d;
    setDialog(d);
  }, []);
  const openReview = useCallback((fromPrompt = false) => show({ kind: "review", fromPrompt }), [show]);
  const openSignIn = useCallback(() => show({ kind: "signin" }), [show]);
  const closeDialog = useCallback(
    (saved = false) => {
      const d = dialogRef.current;
      // ouvert depuis l'invitation et fermé sans envoyer : compte comme « Plus tard »
      if (d?.kind === "review" && d.fromPrompt && !saved) dismissPrompt();
      show(null);
    },
    [dismissPrompt, show],
  );

  /** Appelle le serveur ; renvoie l'erreur à afficher, ou null. */
  const act = useCallback(async (fn: () => Promise<AccountState>) => {
    try {
      const next = await fn();
      setState(next);
      setStatus("ready");
      return null;
    } catch (e) {
      const err = asAccountError(e);
      if (err.code === "invalid_token") void refresh();
      return err;
    }
  }, [refresh]);

  const signIn = useCallback((email: string, password: string) => act(() => accountApi.login(email.trim(), password)), [act]);
  const saveReview = useCallback(
    async (rating: number, comment: string, name: string | null) => {
      const err = await act(() => accountApi.saveReview(rating, comment, name));
      if (!err) setMemo((m) => ({ ...m, done: true }));
      return err;
    },
    [act, setMemo],
  );
  const setName = useCallback((name: string) => act(() => accountApi.setName(name)), [act]);
  const setPhoto = useCallback((base64: string) => act(() => accountApi.setPhoto(base64)), [act]);
  const removePhoto = useCallback(() => act(() => accountApi.removePhoto()), [act]);
  const signOut = useCallback(async () => {
    await accountApi.signOut().catch(() => {});
    await refresh();
  }, [refresh]);

  return {
    ...state,
    status,
    refresh,
    signIn,
    signOut,
    saveReview,
    setName,
    setPhoto,
    removePhoto,
    dialog,
    openReview,
    openSignIn,
    closeDialog,
    showPrompt,
    dismissPrompt,
  };
}

export type Account = ReturnType<typeof useAccountValue>;
const Ctx = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const value = useAccountValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): Account {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAccount hors de AccountProvider");
  return a;
}

/** Image choisie par le joueur, réduite à 512 × 512 au plus (carré centré) avant l'envoi, en base64 sans en-tête. */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw { code: "invalid_image", message: null };
  if (file.size > 25 * 1024 * 1024) throw { code: "image_too_large", message: null };
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw { code: "invalid_image", message: null };
  }
  const side = Math.min(bmp.width, bmp.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw { code: "invalid_image", message: null };
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (!blob) throw { code: "invalid_image", message: null };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
