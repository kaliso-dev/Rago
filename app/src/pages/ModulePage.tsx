import { motion } from "motion/react";
import { ChevronDown, FolderOpen, RotateCcw, Trash2, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type MinecraftStatus } from "../lib/api";
import { availability, catalog, sectionTweaks, tweaks } from "../lib/catalog";
import { formatDate } from "../lib/i18n";
import { itemName, useStore } from "../lib/store";
import { RbwStatus } from "../components/RbwStatus";
import { TweakRow } from "../components/TweakRow";
import { Button, Card } from "../components/ui";

function MinecraftFolder() {
  const { t, mcDir, setMcDir } = useStore();
  const [status, setStatus] = useState<MinecraftStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStatus(await api.minecraftStatus(mcDir));
    } catch {
      setStatus(null);
    }
  }, [mcDir]);
  useEffect(() => void refresh(), [refresh]);

  return (
    <Card title={t("mc.folder")} className="mc-folder">
      <div className="mc-row">
        <code className="mc-path">{mcDir ?? t("mc.noDir")}</code>
        <Button
          size="sm"
          icon={<FolderOpen size={13} />}
          onClick={async () => {
            const d = await api.pickFolder(t("mc.pick"));
            if (d) setMcDir(d);
          }}
        >
          {t("mc.change")}
        </Button>
      </div>
      {status && (
        <div className="mc-status">
          <span className={`dot ${status.dirExists ? "dot-ok" : "dot-warn"}`} />
          <span>{status.dirExists ? (status.optifineFile ? t("mc.optifineOk") : t("mc.optifineNo")) : t("mc.noDir")}</span>
          {status.backups > 0 && (
            <>
              <span className="muted">· {t("mc.backups", { n: status.backups })}</span>
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={12} />}
                onClick={async () => {
                  // le moteur répond en anglais : on affiche nos textes, l'erreur système (dans la langue de Windows) en détail
                  try {
                    await api.minecraftRestore(mcDir);
                    setMsg(t("mc.restored"));
                  } catch (e) {
                    setMsg(String(e) === "No Rago backup found" ? t("mc.noBackup") : t("mc.restoreFailed", { error: String(e) }));
                  }
                  void refresh();
                }}
              >
                {t("mc.restore")}
              </Button>
            </>
          )}
        </div>
      )}
      {msg && <p className="muted small">{msg}</p>}
    </Card>
  );
}

function HistoryList() {
  const { t, lang, history, refreshHistory } = useStore();
  const items = [...history].sort((a, b) => b.ts - a.ts).slice(0, 80);
  return (
    <Card
      title={t("restore.history")}
      action={
        history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={12} />}
            onClick={async () => {
              await api.clearHistory();
              void refreshHistory();
            }}
          >
            {t("restore.clear")}
          </Button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="muted small">{t("restore.historyEmpty")}</p>
      ) : (
        <ul className="history">
          {items.map((h, i) => {
            const tw = tweaks.get(h.id);
            // annulation : « Annuler · Nom », sans la variante (celle qu'on a défaite se lirait comme celle appliquée)
            const v = h.undo ? undefined : tw?.variants?.find((x) => x.id === h.variant)?.label[lang];
            return (
              <li key={`${h.ts}-${i}`}>
                <span className={`dot ${h.ok ? "dot-ok" : "dot-bad"}`} />
                <span className="history-name">
                  {h.undo ? t("run.undoName", { name: itemName(h.id, lang) }) : itemName(h.id, lang)}
                  {v && <span className="muted"> · {v}</span>}
                </span>
                <span className="rg-metric muted">
                  {formatDate(lang, h.ts)} {new Date(h.ts).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** `embedded` : dans un onglet (Réseau), sous le titre de la page qui l'accueille. */
export function ModulePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { t, lang, sys, selected, selectMany, unselectMany, isLocked, undoOnly, premium, setUpsell, focusTweak, setFocusTweak, focusSeq, isOn, pendingUndo } = useStore();
  // dernière recherche vers chaque réglage (focusSeq) : sert de clé à sa ligne
  const focusKeys = useRef(new Map<string, number>());
  if (focusTweak) focusKeys.current.set(focusTweak, focusSeq);
  const index = catalog.modules.findIndex((m) => m.id === id);
  const mod = catalog.modules[index];
  const own = mod.sections.flatMap((s) => sectionTweaks(s)).filter((tw) => tw.kind === "tweak");
  const nOn = own.filter((tw) => isOn(tw.id)).length;
  // changements en attente dans ce module (cochés, ou appliqués puis décochés)
  const nSel = own.filter((tw) => selected.has(tw.id) || pendingUndo.includes(tw.id)).length;
  const safe = own.filter((tw) => tw.risk === "safe" && availability(tw, sys).ok && !tw.confirm && !isLocked(tw.id) && !undoOnly(tw.id)).map((tw) => tw.id);
  // modules longs (Latency, Windows…) : sommaire des sections et sections repliables
  const long = own.length > 30 && mod.sections.length > 1;
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  useEffect(() => setFolded(new Set()), [id]);
  // recherche (Ctrl+K) vers un réglage d'une section repliée : on la déplie pour que la ligne puisse se montrer
  useEffect(() => {
    if (!focusTweak) return;
    const sec = mod.sections.find((s) => sectionTweaks(s).some((tw) => tw.id === focusTweak));
    if (sec) setFolded((f) => (f.has(sec.id) ? new Set([...f].filter((x) => x !== sec.id)) : f));
  }, [focusTweak, focusSeq, mod]);
  const fold = (sid: string) => {
    // replier la section du réglage cherché annule la recherche : pas de saut surprise au prochain dépliage
    const sec = mod.sections.find((s) => s.id === sid);
    if (focusTweak && sec && !folded.has(sid) && sectionTweaks(sec).some((tw) => tw.id === focusTweak)) setFocusTweak(null);
    setFolded((f) => {
      const n = new Set(f);
      if (n.has(sid)) n.delete(sid);
      else n.add(sid);
      return n;
    });
  };
  const jump = (sid: string) => {
    setFolded((f) => (f.has(sid) ? new Set([...f].filter((x) => x !== sid)) : f));
    requestAnimationFrame(() => document.getElementById(`sec-${sid}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  return (
    <div className={embedded ? "module embedded" : "page module"}>
      <motion.header
        className={embedded ? "module-head module-bar" : "page-head module-head"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {embedded ? (
          <p className="muted small">{mod.tagline[lang]}</p>
        ) : (
          <div>
            <div className="rg-overline">
              {String(index + 1).padStart(2, "0")} / {mod.name[lang].toUpperCase()}
            </div>
            <h1>{mod.name[lang]}</h1>
            <p className="lead">{mod.tagline[lang]}</p>
          </div>
        )}
        {own.length > 1 && (
          <div className="module-tools">
            <span className="rg-metric muted">{t("module.selected", { n: nOn, total: own.length })}</span>
            {nSel > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => unselectMany(own.map((tw) => tw.id))}>
                {t("module.clear")}
              </Button>
            ) : !premium && safe.length === 0 ? (
              <Button size="sm" icon={<Lock size={12} />} onClick={() => setUpsell("plan")}>
                {t("free.lock")}
              </Button>
            ) : (
              safe.length > 0 && (
                <Button size="sm" onClick={() => selectMany(safe)}>
                  {t("module.selectSafe")}
                </Button>
              )
            )}
          </div>
        )}
      </motion.header>

      {id === "minecraft" && <MinecraftFolder />}

      {long && (
        <nav className="section-index" aria-label={t("module.sections")}>
          {mod.sections.map((s) => {
            const n = sectionTweaks(s).length;
            return n ? (
              <button key={s.id} type="button" className="section-chip" onClick={() => jump(s.id)}>
                {s.name[lang]}
                <span className="rg-metric">{n}</span>
              </button>
            ) : null;
          })}
        </nav>
      )}

      {mod.sections.map((s, si) => {
        const list = sectionTweaks(s);
        if (!list.length) return null;
        const showTitle = mod.sections.length > 1;
        return (
          <motion.section
            key={s.id}
            id={`sec-${s.id}`}
            className="tweak-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: Math.min(si * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
          >
            {showTitle &&
              (long ? (
                <h2 className="section-title">
                  <button type="button" className="section-fold" aria-expanded={!folded.has(s.id)} onClick={() => fold(s.id)}>
                    <ChevronDown size={16} className={folded.has(s.id) ? "folded" : undefined} />
                    <span>{s.name[lang]}</span>
                    <span className="rg-metric muted">{list.length}</span>
                  </button>
                </h2>
              ) : (
                <h2 className="section-title">
                  <span>{s.name[lang]}</span>
                  <span className="rg-metric muted">{list.length}</span>
                </h2>
              ))}
            {!folded.has(s.id) && (
              <div className="tweak-list">
                {list.map((tw) => (
                  // nouvelle clé à chaque recherche vers ce réglage : la mise en valeur rejoue ; la clé reste
                  // ensuite la même quand la mise en valeur s'éteint, pour ne pas refermer un Details ouvert
                  <TweakRow key={`${tw.id}-${focusKeys.current.get(tw.id) ?? 0}`} tweak={tw} />
                ))}
              </div>
            )}
          </motion.section>
        );
      })}

      {id === "rbw" && <RbwStatus />}
      {id === "restore" && <HistoryList />}
    </div>
  );
}
