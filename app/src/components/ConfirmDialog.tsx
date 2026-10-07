import { RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { availability, needsReboot, tweaks } from "../lib/catalog";
import { SESSION_TOGGLES, itemName, useStore } from "../lib/store";
import { Modal } from "./Modal";
import { Button, Badge } from "./ui";

export function ConfirmDialog() {
  const { t, lang, confirm, setConfirm, sys, startRun, variantOf, mcDir } = useStore();
  const ids = confirm?.ids ?? [];
  const list = ids.map((id) => tweaks.get(id)!).filter(Boolean);
  const onlyRestore = ids.length === 1 && ids[0] === "rst_point";
  const needsWmic = list.filter((tw) => availability(tw, sys).warn === "needsWmic").length;
  const warnings = list.filter((tw) => tw.confirm);
  const reboot = list.some((tw) => needsReboot(tw, variantOf(tw)));
  const mcBlocked = list.some((tw) => tw.native === "minecraft_optifine") && !mcDir;

  const [restorePoint, setRestorePoint] = useState(true);
  const [wmic, setWmic] = useState(true);
  const footRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // un simple bouton « Lancer » sur une action sûre ne propose pas le point de restauration par défaut
    // ni pour un mode à allumer et éteindre à chaque session (mode jeu, RBW Mod)
    const session = !!confirm?.single && list.every((tw) => SESSION_TOGGLES.has(tw.id));
    const risky = list.some((tw) => tw.kind === "tweak" || tw.risk === "advanced");
    setRestorePoint(!onlyRestore && risky && !session);
    setWmic(true);
    // le bouton principal prend le focus sans faire défiler la fenêtre : le titre reste visible
    if (confirm) requestAnimationFrame(() => footRef.current?.querySelector<HTMLButtonElement>(".btn-primary")?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  const close = () => setConfirm(null);
  const go = () =>
    startRun(ids, { restorePoint: restorePoint && !onlyRestore, wmic: wmic && needsWmic > 0, clearSelection: !confirm?.single });

  return (
    <Modal open={!!confirm} onClose={close} className="confirm">
      <h2 className="modal-title">{confirm?.single && list.length === 1 ? list[0].name[lang] : t("confirm.title", { n: list.length })}</h2>
      <p className="modal-lead">{confirm?.single && list.length === 1 ? list[0].desc[lang] : t("confirm.lead")}</p>

      {!(confirm?.single && list.length === 1) && (
        <ul className="confirm-list">
          {list.map((tw) => {
            const v = variantOf(tw);
            const vLabel = tw.variants?.find((x) => x.id === v)?.label[lang];
            return (
              <li key={tw.id}>
                <span>{itemName(tw.id, lang)}</span>
                {vLabel && <span className="confirm-variant">{vLabel}</span>}
                {needsReboot(tw, variantOf(tw)) && <RotateCcw size={12} className="muted" />}
                {tw.risk === "advanced" && <Badge tone="warn">{t("badge.advanced")}</Badge>}
              </li>
            );
          })}
        </ul>
      )}

      {warnings.length > 0 && (
        <div className="confirm-warn">
          <div className="rg-overline">{t("confirm.warnings")}</div>
          {warnings.map((tw) => (
            <p key={tw.id}>
              <TriangleAlert size={13} />
              <span>
                <b>{itemName(tw.id, lang)}.</b> {tw.confirm![lang]}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="confirm-options">
        {!onlyRestore && (
          <label className="check">
            <input type="checkbox" checked={restorePoint} onChange={(e) => setRestorePoint(e.target.checked)} />
            <span>
              <ShieldCheck size={14} /> {t("confirm.restore")}
              <small>{t("confirm.restoreHint")}</small>
            </span>
          </label>
        )}
        {needsWmic > 0 && (
          <label className="check">
            <input type="checkbox" checked={wmic} onChange={(e) => setWmic(e.target.checked)} />
            <span>
              {t("confirm.wmic")}
              <small>{t("confirm.wmicHint", { n: needsWmic })}</small>
            </span>
          </label>
        )}
        {reboot && <p className="muted small">{t("run.rebootNeeded")}</p>}
        {mcBlocked && <p className="tweak-note block">{t("confirm.mcMissing")}</p>}
      </div>

      <footer className="modal-actions" ref={footRef}>
        <Button variant="ghost" onClick={close}>
          {t("confirm.cancel")}
        </Button>
        <Button variant="primary" onClick={go} disabled={mcBlocked}>
          {confirm?.single ? t("confirm.goOne") : t("confirm.go")}
        </Button>
      </footer>
    </Modal>
  );
}
