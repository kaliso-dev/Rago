import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Lock, Monitor, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { api, asLicenseError, type LicenseError } from "../lib/api";
import { totalTweaks } from "../lib/catalog";
import { formatDate, translate, type Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Pulse, Wordmark } from "./Logo";
import { Button } from "./ui";

// Une variable de CI non renseignée arrive vide, d'où || plutôt que ??.
const trim = (u: string | undefined) => (u ?? "").trim().replace(/\/+$/, "");
const origin = (u: string) => {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
};
/** Serveur de comptes (/forgot, /signup…) : origine de RAGO_API_BASE, passée au build en VITE_ACCOUNT_URL. */
export const ACCOUNT_URL: string = origin(trim(import.meta.env.VITE_ACCOUNT_URL)) || "http://localhost:8787";
/** Site de vente (VITE_SITE_URL). Vide : le serveur de comptes, dont la racine redirige vers le site en gardant #pricing. */
export const SITE_URL: string = trim(import.meta.env.VITE_SITE_URL) || ACCOUNT_URL;
/** Invitation permanente du Discord de Rago (la même que sur le site). */
export const DISCORD_URL = "https://discord.gg/cbCxCBx8vJ";
/** Support (VITE_SUPPORT_URL, sinon le Discord de Rago, où se trouvent les tickets). */
export const SUPPORT_URL: string = trim(import.meta.env.VITE_SUPPORT_URL) || DISCORD_URL;

type Step = { kind: "signin" } | { kind: "confirm"; email: string; keyHint: string | null } | { kind: "success" };

const ease = [0.16, 1, 0.3, 1] as const;

export function LicenseGate({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void }) {
  const { t, license, activated, activatedAt, lang, setLang, sys } = useStore();
  const [email, setEmail] = useState(license?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "signin" });
  const [error, setError] = useState<LicenseError | null>(
    license?.state === "expired" ? { code: "expired", message: null, buyUrl: null } : null,
  );

  // en anglais, le message du serveur (voix de la marque) s'affiche tel quel
  const errorText = (e: LicenseError) => {
    if (e.code === "expired") return t("license.state.expired");
    if (lang === "en" && e.message) return e.message;
    const key = `license.err.${e.code}` as Key;
    const txt = translate(lang, key);
    return txt === key ? (e.message ?? t("license.err.server_error")) : txt;
  };

  // l'écran de succès reste affiché jusqu'au clic : c'est la confirmation d'activation que voit le joueur
  const done = (st: Awaited<ReturnType<typeof api.licenseActivate>>, fresh: boolean) => {
    activated(st, fresh);
    setStep({ kind: "success" });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const err = asLicenseError(e);
      setError(err);
      if (err.code === "invalid_token") setStep({ kind: "signin" });
    } finally {
      setBusy(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const r = await api.licenseLogin(email.trim(), password);
      setPassword("");
      if (r.kind === "active") done(r.status, false);
      else setStep({ kind: "confirm", email: r.email, keyHint: r.keyHint });
    });

  const activate = () => run(async () => done(await api.licenseActivate(), true));

  const errorBox = (
    <AnimatePresence>
      {error && (
        <motion.div className="gate-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
          <TriangleAlert size={14} />
          <span>
            {errorText(error)}
            {error.buyUrl && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(error.buyUrl!)}>
                {t("license.buy")} <ArrowRight size={12} />
              </button>
            )}
            {error.code === "bound_to_other_device" && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(`${ACCOUNT_URL}/account`)}>
                {t("account.manage")} <ArrowRight size={12} />
              </button>
            )}
            {SUPPORT_URL && (error.code === "revoked" || error.code === "invalid_request" || error.code === "bound_to_other_device") && (
              <button type="button" className="link gate-buy" onClick={() => api.openUrl(SUPPORT_URL)}>
                {t("account.help")} <ArrowRight size={12} />
              </button>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const card = (
      <motion.div className="gate-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }}>
        <div className="gate-brand">
          <Pulse size={40} active={busy || step.kind === "success"} />
          <Wordmark height={26} mark={false} />
          <span className="gate-premium rg-overline">Premium</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step.kind === "success" && (
            <motion.div key="ok" className="gate-success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <motion.span
                className="gate-check"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}
              >
                <Check size={26} strokeWidth={2.5} />
              </motion.span>
              <h1>{t("license.success")}</h1>
              <p className="gate-lead">{t("license.successLead", { total: totalTweaks })}</p>
              <div className="gate-device">
                <Monitor size={16} />
                <div>
                  <div>{t("license.successDevice", { device: sys?.hostname ?? license?.deviceName ?? "", date: formatDate(lang, activatedAt ?? Date.now()) })}</div>
                  {license?.keyHint && <div className="muted small rg-metric">{license.keyHint}</div>}
                </div>
              </div>
              <Button variant="primary" size="lg" className="gate-submit" autoFocus onClick={() => onDone?.()}>
                {t("license.continue")} <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}

          {step.kind === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24, ease }}>
              <h1>{t("license.confirmTitle")}</h1>
              <p className="gate-lead">{t("license.confirmLead", { device: sys?.hostname ?? license?.deviceName ?? "" })}</p>
              <div className="gate-device">
                <Monitor size={16} />
                <div>
                  <div>{sys?.hostname ?? license?.deviceName}</div>
                  <div className="muted small">{sys?.osName}</div>
                </div>
              </div>
              <dl className="gate-facts rg-metric">
                <div>
                  <dt>{t("license.email")}</dt>
                  <dd>{step.email}</dd>
                </div>
                {step.keyHint && (
                  <div>
                    <dt>{t("account.key")}</dt>
                    <dd>{step.keyHint}</dd>
                  </div>
                )}
              </dl>
              {errorBox}
              <Button variant="primary" size="lg" className="gate-submit" disabled={busy} onClick={() => void activate()}>
                {busy ? t("license.activating") : t("license.activate")}
                {!busy && <Lock size={15} />}
              </Button>
              <div className="gate-links">
                <button type="button" className="link" onClick={() => setStep({ kind: "signin" })}>
                  {t("license.back")}
                </button>
              </div>
            </motion.div>
          )}

          {step.kind === "signin" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.24, ease }}
              onSubmit={(e) => {
                e.preventDefault();
                void signIn();
              }}
            >
              <h1>{t("license.title")}</h1>
              <p className="gate-lead">{t("license.lead")}</p>
              <label className="field">
                <span>{t("license.email")}</span>
                <input id="gate-email" className="input" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="field">
                <span>{t("license.password")}</span>
                <input id="gate-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              {errorBox}
              <Button type="submit" variant="primary" size="lg" className="gate-submit" disabled={busy || !email || !password}>
                {busy ? t("license.signingIn") : t("license.signIn")}
                {!busy && <ArrowRight size={16} />}
              </Button>
              <p className="gate-lock">
                <Lock size={12} /> {t("license.lock")}
              </p>
              <div className="gate-links">
                <button type="button" className="link" onClick={() => api.openUrl(`${SITE_URL}/#pricing`)}>
                  {t("license.create")}
                </button>
                <button type="button" className="link" onClick={() => api.openUrl(`${ACCOUNT_URL}/forgot`)}>
                  {t("license.forgot")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
  );
  if (embedded) return card;
  return (
    <div className="gate" data-tauri-drag-region>
      {card}
      <button type="button" className="gate-lang link" onClick={() => setLang(lang === "en" ? "fr" : "en")}>
        {lang === "en" ? "Français" : "English"}
      </button>
    </div>
  );
}
