import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lock, Monitor, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { api, asLicenseError, type LicenseError } from "../lib/api";
import { translate, type Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Pulse, Wordmark } from "./Logo";
import { Button } from "./ui";

/** Site de vente : comptes, mot de passe oublié. Fixé au build par VITE_SITE_URL. */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL ?? "https://ragohub.com";

type Step = { kind: "signin" } | { kind: "confirm"; email: string; keyHint: string | null } | { kind: "success" };

const ease = [0.16, 1, 0.3, 1] as const;

export function LicenseGate() {
  const { t, license, setLicense, lang, setLang, sys } = useStore();
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

  const done = (st: Awaited<ReturnType<typeof api.licenseActivate>>) => {
    setStep({ kind: "success" });
    setTimeout(() => setLicense(st), 1100);
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
      if (r.kind === "active") done(r.status);
      else setStep({ kind: "confirm", email: r.email, keyHint: r.keyHint });
    });

  const activate = () => run(async () => done(await api.licenseActivate()));

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
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="gate" data-tauri-drag-region>
      <motion.div className="gate-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }}>
        <div className="gate-brand">
          <Pulse size={44} active={busy || step.kind === "success"} />
          <Wordmark height={16} />
          <span className="gate-premium rg-overline">Premium</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step.kind === "success" && (
            <motion.div key="ok" className="gate-success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <h1>{t("license.success")}</h1>
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
                <button type="button" className="link" onClick={() => api.openUrl(`${SITE_URL}/signup`)}>
                  {t("license.create")}
                </button>
                <button type="button" className="link" onClick={() => api.openUrl(`${SITE_URL}/forgot`)}>
                  {t("license.forgot")}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
      <button type="button" className="gate-lang link" onClick={() => setLang(lang === "en" ? "fr" : "en")}>
        {lang === "en" ? "Français" : "English"}
      </button>
    </div>
  );
}
