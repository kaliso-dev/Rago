import { useEffect, useState } from "react";
import { api, type UpdateReady } from "../lib/api";
import { useStore } from "../lib/store";

/** Mise à jour téléchargée (RAG-24) : redémarrer l'installe tout de suite, sinon elle s'installe à la fermeture. */
export function UpdateCard() {
  const { t, run } = useStore();
  const [ready, setReady] = useState<UpdateReady | null>(null);
  const [installing, setInstalling] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void api.updateReady().then((u) => live && u && setReady(u), () => {});
    const sub = api.onUpdateReady((u) => live && setReady(u));
    return () => {
      live = false;
      void sub.then((un) => un());
    };
  }, []);

  if (!ready) return null;
  // un lot en cours : l'app ne se ferme pas au milieu
  const busy = !!run && !run.done;
  const install = async () => {
    setInstalling(true);
    setFailed(false);
    try {
      await api.updateInstall();
    } catch {
      setFailed(true);
    } finally {
      setInstalling(false);
    }
  };

  // carte de la maquette (frame.css) : « Update / 1.3.1 ready / Restart »
  return (
    <>
      <div className={`upd${busy ? " dis" : ""}`} title={[ready.notes, t("update.sub", { version: ready.version })].filter(Boolean).join("\n\n")}>
        <div className="ut">
          <b>{t("update.ready")}</b>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
            {t("update.version", { version: ready.version })}
          </span>
        </div>
        <button type="button" className="ub" disabled={busy || installing} onClick={() => void install()}>
          {installing ? (
            <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          ) : (
            t("update.restart")
          )}
        </button>
      </div>
      {busy && <p className="uh">{t("update.busy")}</p>}
      {failed && <p className="uh bad">{t("update.failed")}</p>}
    </>
  );
}
