import { RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { availability, needsReboot, tweaks } from "../lib/catalog";
import { itemName, useStore } from "../lib/store";
import { Modal } from "./Modal";
import { Button, Badge } from "./ui";

export function ConfirmDialog() {
  const { t, lang, confirm, setConfirm, sys, startRun, variantOf, mcDir, applied } = useStore();
  const ids = confirm?.ids ?? [];
  const undoIds = confirm?.undo ?? [];
  const list = ids.map((id) => tweaks.get(id)!).filter(Boolean);
  const undoList = undoIds.map((id) => tweaks.get(id)!).filter(Boolean);
  const onlyUndo = list.length === 0 && undoList.length > 0;
  const total = list.length + undoList.length;
  const onlyRestore = ids.length === 1 && ids[0] === "rst_point";
  const needsWmic = list.filter((tw) => availability(tw, sys).warn === "needsWmic").length;
  const warnings = list.filter((tw) => tw.confirm);
  const reboot = list.some((tw) => needsReboot(tw, variantOf(tw))) || undoList.some((tw) => needsReboot(tw, applied.get(tw.id)?.variant ?? null));
  const mcBlocked = list.some((tw) => tw.native === "minecraft_optifine") && !mcDir;

  // point de restauration obligatoire avant tout changement (choix de Sofiene, 2026-10-07) : plus de case
  const opensOnly = [...ids, ...undoIds].every((id) => id === "rst_open" || id === "app_settings");
  const [wmic, setWmic] = useState(true);
  const footRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setWmic(true);
    // le bouton principal prend le focus sans faire défiler la fenêtre : le titre reste visible
    if (confirm) requestAnimationFrame(() => footRef.current?.querySelector<HTMLButtonElement>(".btn-primary")?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  const close = () => setConfirm(null);
  const go = () =>
    startRun(ids, { wmic: wmic && needsWmic > 0, clearSelection: !confirm?.single, undo: undoIds });

  const title =
    confirm?.single && list.length === 1
      ? list[0].name[lang]
      : onlyUndo
        ? t("confirm.undoTitle", { n: undoList.length })
        : undoList.length
          ? t("confirm.changesTitle", { n: total })
          : t("confirm.title", { n: list.length });
  const lead = confirm?.single && list.length === 1 ? list[0].desc[lang] : onlyUndo ? t("confirm.undoLead") : t("confirm.lead");
  const row = (tw: (typeof list)[number], v: string | null) => {
    const vLabel = tw.variants?.find((x) => x.id === v)?.label[lang];
    return (
      <li key={tw.id}>
        <span>{itemName(tw.id, lang)}</span>
        {vLabel && <span className="confirm-variant">{vLabel}</span>}
        {needsReboot(tw, v) && <RotateCcw size={12} className="muted" />}
        {tw.risk === "advanced" && <Badge tone="warn">{t("badge.advanced")}</Badge>}
      </li>
    );
  };

  return (
    <Modal open={!!confirm} onClose={close} className="confirm">
      <h2 className="modal-title">{title}</h2>
      <p className="modal-lead">{lead}</p>

      {!(confirm?.single && list.length === 1) && list.length > 0 && (
        <>
          {undoList.length > 0 && <div className="rg-overline confirm-group">{t("confirm.applyList")}</div>}
          <ul className="confirm-list">{list.map((tw) => row(tw, variantOf(tw)))}</ul>
        </>
      )}
      {undoList.length > 0 && (
        <>
          {list.length > 0 && <div className="rg-overline confirm-group">{t("confirm.undoList")}</div>}
          <ul className="confirm-list undo">{undoList.map((tw) => row(tw, applied.get(tw.id)?.variant ?? null))}</ul>
        </>
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
        {!onlyRestore && !opensOnly && (
          <p className="confirm-restore">
            <ShieldCheck size={14} />
            <span>
              {t("confirm.restore")}
              <small>{t("confirm.restoreHint")}</small>
            </span>
          </p>
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
          {confirm?.single ? t("confirm.goOne") : onlyUndo ? t("confirm.undoGo") : t("confirm.go")}
        </Button>
      </footer>
    </Modal>
  );
}
