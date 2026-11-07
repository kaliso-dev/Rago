import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, LoaderCircle } from "lucide-react";
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

  return (
    <>
      <motion.div className="nav-update" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} title={[ready.notes, t("update.sub", { version: ready.version })].filter(Boolean).join("\n\n")}>
        <span className="nav-update-text">
          <span className="nav-update-title">{t("update.ready")}</span>
          <span className="nav-update-sub">
            <ArrowDown size={11} strokeWidth={2.4} />
            <span>{t("update.version", { version: ready.version })}</span>
          </span>
        </span>
        <button type="button" className="nav-update-cta" disabled={busy || installing} title={busy ? t("update.busy") : undefined} onClick={() => void install()}>
          {installing ? <LoaderCircle size={13} className="spin" /> : t("update.restart")}
        </button>
      </motion.div>
      {failed && <p className="nav-update-error">{t("update.failed")}</p>}
    </>
  );
}
