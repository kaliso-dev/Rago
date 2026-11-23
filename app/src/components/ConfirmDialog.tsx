import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { availability, needsReboot, retired, tweaks } from "../lib/catalog";
import { formatTime } from "../lib/i18n";
import { RESTORE_FRESH_MS, SESSION_TOGGLES, itemName, undoVariant, useStore } from "../lib/store";
import { Modal } from "./Modal";
import { I } from "../s5/I";

/** Liste de la fenêtre ; au-delà de 6 lignes, elle défile dans `.clw` (fondu en bas, petite barre à droite), comme la
 * maquette app-confirm-undoall. */
function List({ children, n }: { children: ReactNode; n: number }) {
  const [bar, setBar] = useState<{ top: number; h: number; end: boolean }>({ top: 0, h: 84, end: false });
  if (n <= 6) return <ul className="cl">{children}</ul>;
  const track = (el: HTMLUListElement | null) => {
    if (!el) return;
    const h = Math.max(28, (el.clientHeight / el.scrollHeight) * el.clientHeight);
    const top = el.scrollHeight > el.clientHeight ? (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - h) : 0;
    const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    if (Math.abs(top - bar.top) > 0.5 || Math.abs(h - bar.h) > 0.5 || end !== bar.end) setBar({ top, h, end });
  };
  return (
    <div className={`clw${bar.end ? " end" : ""}`}>
      <ul className="cl" ref={track} onScroll={(e) => track(e.currentTarget)}>
        {children}
      </ul>
      <i className="sbar2" style={{ top: bar.top, height: bar.h }} />
    </div>
  );
}

/** Case de la fenêtre (`.opt`, `.cbx`) : un point de restauration, WMIC. */
function Opt({ on, set, title, hint, icon }: { on: boolean; set: (v: boolean) => void; title: string; hint: string; icon?: string }) {
  const key = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      set(!on);
    }
  };
  return (
    <div className={`opt${on ? " on" : ""}`} role="checkbox" aria-checked={on} tabIndex={0} onClick={() => set(!on)} onKeyDown={key}>
      <i className={`cbx${on ? " on" : ""}`} />
      <div>
        <b>
          {icon && <I n={icon} />}
          {title}
        </b>
        <small>{hint}</small>
      </div>
    </div>
  );
}

export function ConfirmDialog() {
  const { t, lang, confirm, setConfirm, sys, startRun, variantOf, mcDir, applied, lastRestore } = useStore();
  const ids = confirm?.ids ?? [];
  const undoIds = confirm?.undo ?? [];
  const list = ids.map((id) => tweaks.get(id)!).filter(Boolean);
  const undoList = undoIds.map((id) => tweaks.get(id)!).filter(Boolean);
  // réglages retirés du catalogue, encore appliqués sur ce PC : on peut seulement les remettre comme avant
  const undoRetired = undoIds.map((id) => retired.get(id)!).filter(Boolean);
  // Tout annuler : noté dans applied.json par une autre version, inconnu de celle-ci (le moteur le remet quand même)
  const undoUnknown = confirm?.all ? undoIds.filter((id) => !tweaks.has(id) && !retired.has(id)) : [];
  const undoCount = undoList.length + undoRetired.length + undoUnknown.length;
  const onlyUndo = list.length === 0 && undoCount > 0;
  const total = list.length + undoCount;
  const onlyRestore = ids.length === 1 && ids[0] === "rst_point";
  const needsWmic = list.filter((tw) => availability(tw, sys).warn === "needsWmic").length;
  const warnings = list.filter((tw) => tw.confirm);
  const reboot =
    list.some((tw) => needsReboot(tw, variantOf(tw))) ||
    undoList.some((tw) => needsReboot(tw, undoVariant(tw.id, applied.get(tw.id)))) ||
    undoRetired.some((r) => r.reboot);
  const mcBlocked = list.some((tw) => tw.native === "minecraft_optifine") && !mcDir;

  // Point de restauration : la case de 1.1.6, cochée d'office seulement quand il sert vraiment (choix de Sofiene,
  // 2026-10-08). Rago Optimizer garde l'état d'avant de chaque réglage et le remet quand on le décoche ; le point
  // n'est conseillé que pour un réglage avancé ou qui ne se remet pas entièrement, et pas deux fois dans la journée.
  const opensOnly = ids.every((id) => id === "rst_open" || id === "app_settings");
  const askRestore = !onlyRestore && !onlyUndo && !opensOnly && !ids.includes("rst_point");
  const needed = list.filter((tw) => tw.restore);
  const recent = lastRestore != null && Date.now() - lastRestore < RESTORE_FRESH_MS;
  const [restorePoint, setRestorePoint] = useState(false);
  const [wmic, setWmic] = useState(true);
  const footRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // un mode qu'on allume et éteint à chaque session (mode jeu, RBW Mod) ne demande jamais de point
    const session = list.length > 0 && list.every((tw) => SESSION_TOGGLES.has(tw.id));
    setRestorePoint(askRestore && needed.length > 0 && !recent && !session);
    setWmic(true);
    // le bouton principal prend le focus sans faire défiler la fenêtre : le titre reste visible
    if (confirm) requestAnimationFrame(() => footRef.current?.querySelector<HTMLButtonElement>(".btn.red")?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  const close = () => setConfirm(null);
  const go = () =>
    startRun(ids, { restorePoint: askRestore && restorePoint, wmic: wmic && needsWmic > 0, clearSelection: !confirm?.single, undo: undoIds });

  const play = confirm?.play;
  const title = confirm?.title
    ? confirm.title
    : play
    ? t("play.confirmTitle", { game: play.name })
    : confirm?.single && list.length === 1
      ? list[0].name[lang]
      : confirm?.all
        ? t("confirm.undoAllTitle")
        : onlyUndo
          ? t("confirm.undoTitle", { n: undoCount })
          : undoList.length
          ? t("confirm.changesTitle", { n: total })
          : t("confirm.title", { n: list.length });
  const lead = confirm?.lead
    ? confirm.lead
    : play
    ? t("play.confirmLead", { n: list.length, game: play.name })
    : confirm?.single && list.length === 1
      ? list[0].desc[lang]
      : confirm?.all
        ? t("confirm.undoAllLead", { n: undoCount })
        : onlyUndo
          ? t("confirm.undoLead")
          : t("confirm.lead");
  const restoreHint =
    needed.length > 0
      ? recent
        ? t("confirm.restoreRecent", { time: formatTime(lang, lastRestore!) })
        : t("confirm.restoreNeeded", { n: needed.length, names: needed.slice(0, 3).map((tw) => itemName(tw.id, lang)).join(", ") + (needed.length > 3 ? "…" : "") })
      : list.some((tw) => tw.kind === "tweak")
        ? t("confirm.restoreOptional")
        : t("confirm.restoreOptionalAction", { n: list.length });
  // run : variante que le moteur lance vraiment (une annulation du RBW Mod lance « Activé »), pour l'icône de redémarrage
  const row = (tw: (typeof list)[number], v: string | null, run: string | null = v, undo = false) => {
    const vLabel = tw.variants?.find((x) => x.id === v)?.label[lang];
    return (
      <li key={tw.id} className={undo ? "u" : undefined}>
        <i className="tk" />
        <b>{itemName(tw.id, lang)}</b>
        {vLabel && <span className="vr">{vLabel}</span>}
        <i className="sp" />
        {needsReboot(tw, run) && <I n="rotate" className="rb" />}
        {tw.risk === "advanced" && <span className="adv">{t("badge.advanced")}</span>}
      </li>
    );
  };
  const gone = (id: string, name: string, reboot = false) => (
    <li key={id} className="u">
      <i className="tk" />
      <b>{name}</b>
      <i className="sp" />
      {reboot && <I n="rotate" className="rb" />}
      <span className="adv">{t("badge.retired")}</span>
    </li>
  );
  // une seule action, sans liste (« Remove ghost devices ») : la petite fenêtre de la maquette app-confirm-single
  const alone = !!confirm?.single && list.length === 1 && !play && !confirm.title;

  return (
    <Modal open={!!confirm} onClose={close} v5={alone ? "sm" : ""}>
      <h2 className="h2 tape mt">{title}</h2>
      <p className="ml">{lead}</p>

      {!alone && list.length > 0 && (
        <>
          {undoList.length > 0 && <p className="grp">{t("confirm.applyList")}</p>}
          <List n={list.length}>{list.map((tw) => row(tw, variantOf(tw)))}</List>
        </>
      )}
      {undoCount > 0 && (
        <>
          {list.length > 0 && <p className="grp">{t("confirm.undoList")}</p>}
          <List n={undoCount}>
            {undoList.map((tw) => row(tw, applied.get(tw.id)?.variant ?? null, undoVariant(tw.id, applied.get(tw.id)), true))}
            {undoRetired.map((r) => gone(r.id, r.name[lang], r.reboot))}
            {undoUnknown.map((id) => gone(id, itemName(id, lang)))}
          </List>
        </>
      )}

      {warnings.length > 0 && (
        <div className="wrn">
          <p className="grp">{t("confirm.warnings")}</p>
          {warnings.map((tw) => (
            <p key={tw.id}>
              <I n="alert" />
              <span>
                <b>{itemName(tw.id, lang)}.</b> {tw.confirm![lang]}
              </span>
            </p>
          ))}
        </div>
      )}
      {mcBlocked && (
        <div className="wrn">
          <p>
            <I n="alert" />
            <span>{t("confirm.mcMissing")}</span>
          </p>
        </div>
      )}

      {askRestore && <Opt on={restorePoint} set={setRestorePoint} icon="shield" title={t("confirm.restore")} hint={restoreHint} />}
      {needsWmic > 0 && <Opt on={wmic} set={setWmic} title={t("confirm.wmic")} hint={t("confirm.wmicHint", { n: needsWmic })} />}
      {reboot && (
        <p className="rbn">
          <I n="power" />
          {t("run.rebootNeeded")}
        </p>
      )}

      <div className="mf" ref={footRef}>
        <button type="button" className="btn gh2" onClick={close}>
          {t("confirm.cancel")}
        </button>
        <button type="button" className="btn red" onClick={go} disabled={mcBlocked}>
          {play ? t("play.go") : confirm?.title ? t("confirm.go") : confirm?.single ? t("confirm.goOne") : confirm?.all ? t("dash.undoAll") : onlyUndo ? t("confirm.undoGo") : t("confirm.go")}
        </button>
      </div>
    </Modal>
  );
}
