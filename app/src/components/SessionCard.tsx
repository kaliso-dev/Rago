import { useEffect, useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { api, type BackgroundPrefs, type SessionCheck, type SessionState } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Card, Switch } from "./ui";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Ce que Rago a fait pour la partie en cours et ce qu'il conseille (barre en jeu, bibliothèque). */
export function SessionChecks({ session, t }: { session: SessionState; t: T }) {
  if (!session.playing || (!session.power && !session.checks.length)) return null;
  const line = (c: SessionCheck) => t(`session.check.${c.id}` as Key, { apps: c.apps.join(", ") });
  return (
    <div className="session-checks">
      {session.power && (
        <div className="session-line ok">
          <Zap size={13} /> {t("session.power")}
        </div>
      )}
      {session.checks.length > 0 && (
        <>
          <div className="rg-overline session-head">{t("session.checks")}</div>
          {session.checks.map((c) => (
            <div key={c.id} className="session-line warn">
              <AlertTriangle size={13} /> <span>{line(c)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** Partie en cours, suivie en direct. */
export function useSession(): SessionState | null {
  const [session, setSession] = useState<SessionState | null>(null);
  useEffect(() => {
    void api.sessionState().then(setSession, () => {});
    const sub = api.onSession(setSession);
    return () => void sub.then((un) => un());
  }, []);
  return session;
}

/** Paramètres : ce que l'app fait pendant une partie (session.rs). */
export function SessionCard() {
  const { t } = useStore();
  const [prefs, setPrefs] = useState<BackgroundPrefs | null>(null);
  const session = useSession();

  useEffect(() => {
    void api.backgroundGet().then((s) => setPrefs(s.prefs), () => {});
  }, []);

  if (!prefs) return null;
  const save = async (patch: Partial<Pick<BackgroundPrefs, "gameGpu" | "gamePower" | "gameChecks">>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      setPrefs(await api.sessionSetPrefs(next.gameGpu, next.gamePower, next.gameChecks));
    } catch {
      void api.backgroundGet().then((s) => setPrefs(s.prefs), () => {});
    }
  };
  const single = session?.multiGpu === false;

  return (
    <Card title={t("settings.session")}>
      <p className="muted small session-lead">{t("settings.session.lead")}</p>
      <div className="setting">
        <div>
          <div>{t("settings.session.gpu")}</div>
          <div className="muted small">
            {single ? t("settings.session.gpuSingle") : t("settings.session.gpuHint")}
            {!single && prefs.gameGpu && session && session.gpuGames > 0 && ` ${t("settings.session.gpuCount", { n: session.gpuGames })}`}
          </div>
        </div>
        <Switch checked={prefs.gameGpu && !single} disabled={single} onChange={(v) => void save({ gameGpu: v })} label={t("settings.session.gpu")} />
      </div>
      <div className="setting">
        <div>
          <div>{t("settings.session.power")}</div>
          <div className="muted small">{session?.x3d ? t("settings.session.x3d") : t("settings.session.powerHint")}</div>
        </div>
        <Switch checked={prefs.gamePower && !session?.x3d} disabled={session?.x3d} onChange={(v) => void save({ gamePower: v })} label={t("settings.session.power")} />
      </div>
      <div className="setting">
        <div>
          <div>{t("settings.session.checks")}</div>
          <div className="muted small">{t("settings.session.checksHint")}</div>
        </div>
        <Switch checked={prefs.gameChecks} onChange={(v) => void save({ gameChecks: v })} label={t("settings.session.checks")} />
      </div>
    </Card>
  );
}
