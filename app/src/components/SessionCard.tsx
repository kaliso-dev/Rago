import { useEffect, useState } from "react";
import { api, type BackgroundPrefs, type SessionCheck, type SessionState } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { Sw } from "../s5/ui";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Ce que Rago a fait pour la partie en cours et ce qu'il conseille (barre en jeu, maquette app-ingame, bloc .igck). */
export function SessionChecks({ session, t }: { session: SessionState; t: T }) {
  if (!session.playing || (!session.power && !session.priority && !session.checks.length)) return null;
  const line = (c: SessionCheck) => {
    // mémoire presque pleine sans grosse appli à nommer : la phrase sans liste
    if (c.id === "ram" && !c.apps.length) return t("session.check.ramBare");
    return t(`session.check.${c.id}` as Key, { apps: c.apps.join(", "), cur: c.apps[0] ?? "", max: c.apps[1] ?? "" });
  };
  return (
    <div className="igck">
      {session.power && (
        <p className="ok">
          <I n="zap" />
          {t("session.power")}
        </p>
      )}
      {session.priority > 0 && (
        <p className="ok">
          <I n="gauge" />
          {t("session.priority")}
        </p>
      )}
      {session.checks.length > 0 && (
        <>
          <span className="igo">{t("session.checks")}</span>
          {session.checks.map((c) => (
            <p key={c.id} className="wr">
              <I n="alert" />
              {line(c)}
            </p>
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

/** Paramètres : ce que l'app fait pendant une partie (session.rs).
 * Écran v5 (maquettes app-settings*.html) : bloc « while you play », une ligne grisée (.dis) quand le réglage ne
 * s'applique pas à ce PC (une seule carte graphique, Ryzen X3D). */
export function SessionSection() {
  const { t } = useStore();
  const [prefs, setPrefs] = useState<BackgroundPrefs | null>(null);
  const session = useSession();

  useEffect(() => {
    void api.backgroundGet().then((s) => setPrefs(s.prefs), () => {});
  }, []);

  const head = (
    <>
      <div className="sh">
        <h2 className="h2 tape">{t("settings.session")}</h2>
      </div>
      <p className="lead3">{t("settings.session.lead")}</p>
    </>
  );
  if (!prefs) return <section>{head}</section>;
  const save = async (patch: Partial<Pick<BackgroundPrefs, "gameGpu" | "gamePower" | "gameChecks" | "gamePriority">>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      setPrefs(await api.sessionSetPrefs(next.gameGpu, next.gamePower, next.gameChecks, next.gamePriority));
    } catch {
      void api.backgroundGet().then((s) => setPrefs(s.prefs), () => {});
    }
  };
  const single = session?.multiGpu === false;
  const x3d = !!session?.x3d;
  const row = (title: string, hint: string, on: boolean, set: (v: boolean) => void, dis = false) => (
    <div className={`sr${dis ? " dis" : ""}`}>
      <div className="l">
        <b>{title}</b>
        <span>{hint}</span>
      </div>
      <Sw on={on && !dis} disabled={dis} onChange={set} label={title} />
    </div>
  );

  return (
    <section>
      {head}
      <div className="panel sp">
        {row(
          t("settings.session.gpu"),
          single
            ? t("settings.session.gpuSingle")
            : t("settings.session.gpuHint") + (prefs.gameGpu && session && session.gpuGames > 0 ? ` ${t("settings.session.gpuCount", { n: session.gpuGames })}` : ""),
          prefs.gameGpu,
          (v) => void save({ gameGpu: v }),
          single,
        )}
        {row(t("settings.session.power"), x3d ? t("settings.session.x3d") : t("settings.session.powerHint"), prefs.gamePower, (v) => void save({ gamePower: v }), x3d)}
        {row(t("settings.session.priority"), t("settings.session.priorityHint"), prefs.gamePriority, (v) => void save({ gamePriority: v }))}
        {row(t("settings.session.checks"), t("settings.session.checksHint"), prefs.gameChecks, (v) => void save({ gameChecks: v }))}
      </div>
    </section>
  );
}
