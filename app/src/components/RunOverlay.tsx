import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { formatNumber } from "../lib/i18n";
import { totalTweaks } from "../lib/catalog";
import { FREE, itemName, useStore } from "../lib/store";
import { findings, saved } from "../lib/analysis";
import { I } from "../s5/I";
import logo from "../assets/s5/img/rago-app-dark-128.svg";

/** Une case de la barre `.pg2` par réglage (22 cases dans la maquette) ; au-delà de 40, chaque case couvre plusieurs
 * réglages : rouge si l'un a échoué, pleine si tous sont finis, hachurée si l'un tourne. */
const SEGMENTS = 40;

export function RunOverlay() {
  const { t, lang, run, setRun, premium, license, setUpsell, playing, goTo } = useStore();
  // écran d'exécution des maquettes app-run-running, -done, -failed et -reboot (win.css) : toute la fenêtre
  // une analyse du PC existe : l'avant/après, et en gratuit ce que Premium règlerait encore parmi ce qu'elle a trouvé
  const an = saved();
  const anBase = an.after ?? an.before;
  const premiumLeft = anBase ? findings(anBase).filter((f) => f.issue && f.fix.kind === "premium").length : 0;
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run?.logs.length]);

  const listRef = useRef<HTMLOListElement>(null);
  const runningIndex = run?.rows.findIndex((r) => r.status === "running") ?? -1;
  useEffect(() => {
    if (runningIndex < 0) return;
    listRef.current?.children[runningIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [runningIndex]);

  // fin du lot : la liste revient en haut (comme les maquettes de fin), sur le premier échec s'il y en a un
  const ended = !!run && (!!run.done || !!run.error);
  useEffect(() => {
    const el = listRef.current;
    if (!ended || !el) return;
    el.scrollTop = 0;
    const i = run?.rows.findIndex((r) => r.status === "error") ?? -1;
    if (i >= 0) el.children[i]?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const total = run?.rows.length ?? 0;
  const finished = run?.rows.filter((r) => r.status === "ok" || r.status === "error" || r.status === "skipped").length ?? 0;
  const skipped = run?.rows.filter((r) => r.status === "skipped").length ?? 0;
  const failed = run?.rows.filter((r) => r.status === "error").length ?? 0;
  const current = run?.rows.find((r) => r.status === "running");
  const isDone = !!run && (!!run.done || !!run.error);
  const cancelled = run?.done?.cancelled;
  const restoreFailed = !!run?.done?.restoreFailed;
  // quelque chose a vraiment été changé (pas seulement un point de restauration raté)
  const changed = finished - failed - skipped > 0;
  // arrêté en cours de route : redémarrage seulement si un réglage qui le demande est allé au bout
  const reboot = !!run?.reboot && (cancelled ? run.rows.some((r) => r.reboot && r.status === "ok") : changed);
  // point de restauration raté : le moteur saute ce qui applique, mais lance quand même les annulations (runner.rs)
  const ranAfter = run?.rows.filter((r) => r.id !== "rst_point" && (r.status === "ok" || r.status === "error")).length ?? 0;
  const restoreKey = skipped
    ? ranAfter
      ? "run.restoreFailedPartial"
      : "run.restoreFailed"
    : ranAfter
      ? "run.restoreFailedUndo"
      : "run.restoreFailedAlone";
  // le point de restauration raté a son propre message : les autres échecs restent comptés
  const otherFailed = failed - (restoreFailed ? 1 : 0);
  const seconds = run ? ((run.endedAt ?? Date.now()) - run.startedAt) / 1000 : 0;
  const segs = Math.min(total, SEGMENTS);
  const seg = (k: number) => {
    const rows = run!.rows.slice(Math.floor((k * total) / segs), Math.floor(((k + 1) * total) / segs));
    if (rows.some((r) => r.status === "error")) return "x";
    // réglages sautés (point de restauration raté) : rien n'a été fait, la case reste vide
    if (rows.every((r) => r.status === "skipped")) return "";
    if (rows.every((r) => r.status === "ok" || r.status === "skipped")) return "d";
    if (rows.some((r) => r.status === "running" || r.status === "ok")) return "r";
    return "";
  };
  const name = (r: { id: string; undo?: boolean }) => (r.undo ? t("run.undoName", { name: itemName(r.id, lang) }) : itemName(r.id, lang));

  const close = () => setRun(null);

  return (
    <AnimatePresence>
      {run && (
        <motion.div className="w5" style={{ zIndex: 40 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
          <div className={`runw${isDone ? " fin" : ""}`}>
            <div className="run2" data-tauri-drag-region>
              <span className="wc2">
                <span role="button" aria-label={t("window.minimize")} onClick={() => api.window.minimize()}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 7h10" /></svg>
                </span>
                <span role="button" aria-label={t("window.maximize")} onClick={() => api.window.toggleMaximize()}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="2.5" width="9" height="9" /></svg>
                </span>
                <span role="button" className="x" aria-label={t("window.close")} onClick={() => api.window.close()}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3l8 8M11 3l-8 8" /></svg>
                </span>
              </span>
              <div className="hero2" data-tauri-drag-region>
                <img className="rlogo" src={logo} alt="" draggable={false} />
                <p className="rst">
                  {!isDone && <i className="lv" />}
                  {isDone ? (cancelled ? t("run.cancelled") : t("run.done")) : t("run.title")}
                </p>
                <div className="ctr">
                  <motion.b key={finished} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    {String(finished).padStart(2, "0")}
                  </motion.b>
                  <span>/{String(total).padStart(2, "0")}</span>
                </div>
                <div className="pg2">
                  {Array.from({ length: segs }, (_, k) => (
                    <i key={k} className={seg(k) || undefined} />
                  ))}
                </div>
                <div className="cur">
                  {isDone ? (
                    run.error ? (
                      <>
                        <p className="er3">
                          <I n="alert" />
                          {run.error}
                        </p>
                        {/* refus Premium du moteur : se connecter (ou se reconnecter) d'ici, 25/11 */}
                        {!premium && run.error === t("err.premium_required") && (
                          <button
                            type="button"
                            className="btn sm red"
                            onClick={() => {
                              close();
                              setUpsell("signin");
                            }}
                          >
                            <I n="user" />
                            {t("free.signIn")}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="sum">{t("run.summary", { ok: finished - failed - skipped, total, s: formatNumber(lang, seconds) })}</p>
                        {restoreFailed && (
                          <p className="er3">
                            <I n="alert" />
                            {t(restoreKey, { n: skipped })}
                          </p>
                        )}
                        {otherFailed > 0 && (
                          <p className="er3">
                            <I n="alert" />
                            {t("run.failed", { n: otherFailed })}
                          </p>
                        )}
                        {reboot && (
                          <p className="rb3">
                            <I n="power" />
                            {t("run.rebootNeeded")}
                          </p>
                        )}
                        {/* « Optimiser et jouer » : le jeu démarre à la fin du lot */}
                        {playing && !cancelled && (
                          <p className={playing.status === "failed" ? "er3" : "rb3"}>
                            <I n={playing.status === "failed" ? "alert" : "play"} />
                            {t(playing.status === "failed" ? "play.failed" : playing.status === "started" ? "play.started" : "play.starting", { game: playing.name })}
                          </p>
                        )}
                        {!cancelled && (run.done?.ok ?? 0) > 0 && anBase && (
                          <button
                            type="button"
                            className="up2"
                            onClick={() => {
                              close();
                              goTo("analysis");
                            }}
                          >
                            <I n="check" />
                            {t("pa.measureDiff")}
                            <I n="right" />
                          </button>
                        )}
                        {license && !premium && !cancelled && (
                          <button
                            type="button"
                            className="up2 prem"
                            onClick={() => {
                              close();
                              setUpsell(premiumLeft > 0 ? "analysis" : "plan");
                            }}
                          >
                            <I n="sparkles" />
                            {premiumLeft > 0 ? t("pa.premiumLeft", { n: premiumLeft }) : t("done.upsell", { n: totalTweaks - FREE.size })}
                            <I n="right" />
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    current && <span className="nm3">{name(current)}</span>
                  )}
                </div>
                <div className="ra">
                  {!isDone ? (
                    <button type="button" className="btn" onClick={() => api.cancelRun()}>
                      <I n="stop" />
                      {t("run.cancel")}
                    </button>
                  ) : (
                    <>
                      {reboot && (
                        <button type="button" className="btn red lg" onClick={() => api.restartPc()}>
                          <I n="power" />
                          {t("run.reboot")}
                        </button>
                      )}
                      <button type="button" className={`btn${reboot ? " gh2" : ""}`} onClick={close}>
                        {t("run.close")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="side2" data-tauri-drag-region>
                <ol className="rl" ref={listRef}>
                  {run.rows.map((r, i) => (
                    <li key={`${r.id}-${i}`} className={r.status}>
                      <span className="si">
                        {r.status === "running" && <I n="loader" className="spin" />}
                        {r.status === "ok" && <I n="check" />}
                        {r.status === "error" && <I n="x" />}
                        {r.status === "pending" && <i className="pd" />}
                        {r.status === "skipped" && <I n="minus" line />}
                      </span>
                      <span className="nm2">{name(r)}</span>
                      {r.durationMs != null && <span className="ms">{formatNumber(lang, r.durationMs / 1000)} s</span>}
                    </li>
                  ))}
                </ol>
                <div className="ch">
                  <span className="lbl">{t("run.console")}</span>
                  {isDone && run.done?.logFile && (
                    <button type="button" className="lnk" onClick={() => api.openFolder("logs")}>
                      <I n="folder" />
                      {t("run.openLog")}
                    </button>
                  )}
                </div>
                <div className="cs" ref={consoleRef}>
                  {run.logs.map((l, i) => (
                    <div key={i} className={l.line.startsWith("!") ? "err" : undefined}>
                      <span className="cid">{l.id}</span> {l.line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
