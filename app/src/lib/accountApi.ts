// Compte Rago dans l'app : nom public, photo de profil et avis (moteur Rust : src-tauri/src/account.rs).
// Hors de Tauri (navigateur, démo), un simulateur garde un compte de démo dans le navigateur.
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./api";

export interface Profile {
  email: string;
  name: string | null;
  /** data URL prête à afficher, null sans photo */
  photo: string | null;
}

export interface MyReview {
  rating: number;
  comment: string;
  updatedAt: string;
  /** masqué du site par l'équipe */
  hidden: boolean;
}

export interface AccountState {
  /** "license" : jeton de licence du PC (Premium) ; "account" : connexion au compte ; null : pas connecté */
  via: "license" | "account" | null;
  profile: Profile | null;
  review: MyReview | null;
}

/** Erreur du serveur de comptes : code stable et message anglais affichable tel quel. */
export interface AccountError {
  code: string;
  message: string | null;
}

export function asAccountError(err: unknown): AccountError {
  const e = (err ?? {}) as Partial<AccountError>;
  return { code: e.code ?? "server_error", message: e.message ?? null };
}

export const COMMENT_MAX = 600;
export const NAME_MAX = 32;

export interface AccountApi {
  me(): Promise<AccountState>;
  login(email: string, password: string): Promise<AccountState>;
  signOut(): Promise<void>;
  saveReview(rating: number, comment: string, name: string | null): Promise<AccountState>;
  setName(name: string): Promise<AccountState>;
  /** image en base64 (déjà réduite par l'interface) ; le serveur la recadre en 256 × 256 WebP */
  setPhoto(base64: string): Promise<AccountState>;
  removePhoto(): Promise<AccountState>;
}

const tauriAccount: AccountApi = {
  me: () => invoke("account_me"),
  login: (email, password) => invoke("account_login", { email, password }),
  signOut: () => invoke("account_sign_out"),
  saveReview: (rating, comment, name) => invoke("account_save_review", { rating, comment, name }),
  setName: (name) => invoke("account_set_name", { name }),
  setPhoto: (data) => invoke("account_set_photo", { data }),
  removePhoto: () => invoke("account_remove_photo"),
};

// ------------------------------------------------------------------ démo

interface Demo {
  email: string | null;
  name: string | null;
  photo: string | null;
  review: MyReview | null;
}

const DEMO_KEY = "rago.demoAccount";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function demo(): Demo {
  try {
    return { email: null, name: null, photo: null, review: null, ...JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}") };
  } catch {
    return { email: null, name: null, photo: null, review: null };
  }
}
function saveDemo(d: Demo) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(d));
  } catch {
    /* démo sans stockage */
  }
}
function demoLicense(): string | null {
  try {
    return localStorage.getItem("rago.demoLicense");
  } catch {
    return null;
  }
}
function demoState(): AccountState {
  const d = demo();
  const lic = demoLicense();
  const email = lic ?? d.email;
  if (!email) return { via: null, profile: null, review: null };
  return { via: lic ? "license" : "account", profile: { email, name: d.name, photo: d.photo }, review: d.review };
}
function fail(code: string, message: string): never {
  throw { code, message } satisfies AccountError;
}
/** Mêmes règles que le serveur (licensing/src/profile.js), pour que la démo réagisse pareil. */
function demoName(raw: string): string {
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > NAME_MAX || !/^[\p{L}\p{N}][\p{L}\p{N}\p{M} _.'-]*$/u.test(name) || /https?|www\.|\.(com|net|org|gg|io|fr)\b/i.test(name))
    fail("invalid_name", "Use 2 to 32 letters, numbers, spaces and _ . ' - for your public name. No email or link.");
  return name;
}
function signedIn() {
  if (!demoState().via) fail("invalid_token", "Sign in to your Rago account first.");
}

const mockAccount: AccountApi = {
  me: async () => {
    await sleep(250);
    return demoState();
  },
  login: async (email, password) => {
    await sleep(600);
    if (!email.includes("@") || password.length < 4) fail("invalid_credentials", "That email and password don't match. Try again or reset your password.");
    saveDemo({ ...demo(), email: email.trim().toLowerCase() });
    return demoState();
  },
  signOut: async () => {
    saveDemo({ ...demo(), email: null });
  },
  saveReview: async (rating, comment, name) => {
    await sleep(500);
    signedIn();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail("invalid_rating", "Pick a rating from 1 to 5 stars.");
    const text = comment.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) fail("empty_comment", "Write a few words about Rago Optimizer.");
    if (text.length > COMMENT_MAX) fail("comment_too_long", `Keep your review under ${COMMENT_MAX} characters.`);
    const d = demo();
    const n = name?.trim() ? demoName(name) : d.name;
    if (!n) fail("name_required", "Add the public name shown with your review.");
    saveDemo({ ...d, name: n, review: { rating, comment: text, updatedAt: new Date().toISOString(), hidden: false } });
    return demoState();
  },
  setName: async (name) => {
    await sleep(300);
    signedIn();
    saveDemo({ ...demo(), name: demoName(name) });
    return demoState();
  },
  setPhoto: async (data) => {
    await sleep(700);
    signedIn();
    if (data.length > (5 * 1024 * 1024 * 4) / 3) fail("image_too_large", "This picture is over 5 MB. Choose a smaller one.");
    // la démo garde l'image telle que l'interface l'a réduite
    saveDemo({ ...demo(), photo: `data:image/webp;base64,${data}` });
    return demoState();
  },
  removePhoto: async () => {
    await sleep(300);
    signedIn();
    saveDemo({ ...demo(), photo: null });
    return demoState();
  },
};

export const accountApi: AccountApi = isTauri ? tauriAccount : mockAccount;
