import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronLeft, Copy, Download, FileText, FolderOpen, LoaderCircle, MessagesSquare, Pencil, Plus, Upload } from "lucide-react";
import { api, isTauri, type ReportParts, type SupportReport } from "../lib/api";
import { autoVariant, availability, needsReboot, tweaks } from "../lib/catalog";
import { decodePreset, encodePreset, MAX_NAME, presetFileName, ShareError, type SharedPreset } from "../lib/share";
import { useStore } from "../lib/store";
import { SUPPORT_URL } from "../components/LicenseGate";
import { PresetEditor } from "../components/PresetEditor";
import { Button } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const PARTS: (keyof ReportParts)[] = ["pc", "tweaks", "history", "logs", "network"];

/** Ce que l'import changerait sur ce PC, réglage par réglage (mêmes règles que selectMany). */
interface Preview {
  preset: SharedPreset;
  /** entrées à ajouter, variantes inconnues de cette version retirées */
  entries: string[];
  fresh: number;
  reboot: number;
  already: number;
  unavailable: number;
  locked: number;
}

export function Share() {
  const { t, lang, goTo, sys, currentSetup, applied, selected, isOn, variantOf, variants, isLocked, variantLocked, selectMany, savePreset, premium, setUpsell } = useStore();

  // ---------- partager
  const [code, setCode] = useState("");
  const [shareName, setShareName] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const setupKey = currentSetup.join(",");
  useEffect(() => {
    let live = true;
    setCopied(false);
    if (!currentSetup.length) return setCode("");
    encodePreset({ n: shareName, t: currentSetup }).then(
      (c) => live && (setCode(c), setShareError(false)),
      () => live && setShareError(true),
    );
    return () => {
      live = false;
    };
    // la liste change de référence à chaque rendu du store : on suit son contenu
  }, [setupKey, shareName]);

  const copy = async () => {
    try {
      await api.copyText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setShareError(true);
    }
  };
  const saveFile = async () => {
    try {
      await api.savePresetFile(code, presetFileName(shareName.trim() || (lang === "fr" ? "mon-preset-rago" : "my-rago-preset")), t("share.saveTitle"));
    } catch {
      setShareError(true);
    }
  };

  // ---------- importer
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  // nom sous lequel le preset importé est gardé : celui choisi par l'ami, modifiable
  const [keepName, setKeepName] = useState("");
  const [savedMine, setSavedMine] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const analyse = (preset: SharedPreset): Preview => {
    const p: Preview = { preset, entries: [], fresh: 0, reboot: 0, already: 0, unavailable: 0, locked: 0 };
    for (const e of preset.t) {
      const [id, raw] = e.split(":");
      const tw = tweaks.get(id);
      if (!tw || tw.kind !== "tweak" || !availability(tw, sys).ok) {
        p.unavailable++;
        continue;
      }
      // variante d'une autre version : celle choisie pour ce PC à la place
      const v = raw && tw.variants?.some((x) => x.id === raw) ? raw : undefined;
      if (isLocked(id) || (v && variantLocked(id, v))) {
        p.locked++;
        continue;
      }
      p.entries.push(v ? `${id}:${v}` : id);
      const vNow = v ?? variants[id] ?? autoVariant(tw, sys) ?? null;
      // déjà allumé (appliqué ou coché) avec cette variante : rien ne change
      const current = selected.has(id) ? variantOf(tw) : (applied.get(id)?.variant ?? null);
      if (isOn(id) && current === vNow) {
        p.already++;
        continue;
      }
      p.fresh++;
      if (needsReboot(tw, vNow)) p.reboot++;
    }
    return p;
  };

  const runPreview = async (text = input) => {
    setAdded(null);
    setSavedMine(null);
    try {
      const preset = await decodePreset(text);
      setPreview(analyse(preset));
      setKeepName(preset.n ?? "");
      setImportError(null);
    } catch (e) {
      setPreview(null);
      const why = e instanceof ShareError ? e.message : "format";
      setImportError(why === "empty" ? null : t(why === "newer" ? "share.import.newer" : why === "broken" ? "share.import.broken" : "share.import.bad"));
    }
  };
  // le PC, la licence ou les réglages appliqués changent : l'aperçu se recalcule
  useEffect(() => {
    if (added == null) setPreview((p) => (p ? analyse(p.preset) : p));
  }, [sys, premium, applied]);

  const openFile = async () => {
    try {
      const text = await api.openPresetFile(t("share.openTitle"));
      if (text == null) return;
      setInput(text);
      await runPreview(text);
    } catch {
      setImportError(t("share.import.bad"));
    }
  };

  const addAll = () => {
    if (!preview) return;
    selectMany(preview.entries);
    setAdded(preview.fresh);
  };

  // ---------- rapport
  const [parts, setParts] = useState<ReportParts>({ pc: true, tweaks: true, history: true, logs: true, network: false });
  const [report, setReport] = useState<SupportReport | null>(null);
  const [making, setMaking] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [showText, setShowText] = useState(false);
  const makeReport = async () => {
    setMaking(true);
    setReportError(false);
    try {
      setReport(await api.supportReport(parts));
    } catch {
      setReportError(true);
    } finally {
      setMaking(false);
    }
  };
  const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} ${lang === "fr" ? "Ko" : "KB"}`;
  const counts = preview
    ? [
        preview.fresh > 0 && t("share.import.fresh", { n: preview.fresh }),
        preview.already > 0 && t("share.import.already", { n: preview.already }),
        preview.reboot > 0 && t("share.import.reboot", { n: preview.reboot }),
        preview.unavailable > 0 && t("share.import.unavailable", { n: preview.unavailable }),
        preview.locked > 0 && t("share.import.locked", { n: preview.locked }),
      ].filter(Boolean)
    : [];

  return (
    <motion.div className="page share" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <button type="button" className="rg-overline back-link" onClick={() => goTo("settings")}>
          <ChevronLeft size={12} />
          {t("nav.settings")}
        </button>
        <h1>{t("share.title")}</h1>
        <p className="lead">{t("share.lead")}</p>
      </motion.header>

      <div className="share-grid">
        {/* RAG-44 : partager un preset */}
        <motion.section variants={rise} className="card share-card">
          <header className="card-head">
            <h3 className="rg-overline">{t("share.preset")}</h3>
            <span className="rg-metric muted small">{t("share.on", { n: currentSetup.length })}</span>
          </header>
          <p className="muted small share-p">{t("share.presetLead")}</p>
          {currentSetup.length > 0 ? (
            <>
              <label htmlFor="share-name" className="share-label">
                {t("share.name")}
              </label>
              <input
                id="share-name"
                className="input text share-name"
                maxLength={MAX_NAME}
                value={shareName}
                autoComplete="off"
                placeholder={t("share.namePh")}
                onChange={(e) => setShareName(e.target.value)}
              />
              <p className="muted small share-hint">{t("share.nameHint")}</p>
              <div className="share-well share-code">
                <span className="rg-metric" title={code}>
                  {code || "…"}
                </span>
                <Button size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} disabled={!code} onClick={() => void copy()}>
                  {copied ? t("share.copied") : t("share.copy")}
                </Button>
              </div>
              <div className="share-row">
                <Button size="sm" icon={<Download size={13} />} disabled={!code} onClick={() => void saveFile()}>
                  {t("share.saveFile")}
                </Button>
              </div>
            </>
          ) : (
            <div className="share-well share-empty muted small">{t("share.none")}</div>
          )}
          {shareError && <p className="share-error small">{t("share.error")}</p>}

          <div className="share-sep" />

          <label htmlFor="share-code" className="share-label">
            {t("share.import")}
          </label>
          <div className="share-input">
            <input
              id="share-code"
              className="input rg-metric"
              value={input}
              spellCheck={false}
              autoComplete="off"
              placeholder="RAGO2_…"
              onChange={(e) => {
                setInput(e.target.value);
                setImportError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void runPreview()}
            />
            <Button disabled={!input.trim()} onClick={() => void runPreview()}>
              {t("share.preview")}
            </Button>
          </div>
          <button type="button" className="link small share-open" onClick={() => void openFile()}>
            <Upload size={12} />
            {t("share.openFile")}
          </button>
          {importError && <p className="share-error small">{importError}</p>}
          {preview && (
            <motion.div className="share-well share-preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="share-preview-top">
                <span>{preview.preset.n ? <b>{preview.preset.n}</b> : t("share.import.unnamed")}</span>
                <span className="rg-metric muted">{t("share.import.count", { n: preview.preset.t.length })}</span>
              </div>
              <div className="muted">{counts.join(" · ")}</div>
            </motion.div>
          )}
          {preview && (
            <div className="share-actions">
              {added != null && (
                <span className="share-added small">{added > 0 ? t("share.import.added", { n: added }) : t("share.import.nothing")}</span>
              )}
              {preview.locked > 0 && !premium && (
                <Button size="sm" variant="ghost" onClick={() => setUpsell("plan")}>
                  {t("free.upgrade")}
                </Button>
              )}
              {added == null && (
                <Button size="sm" variant="primary" disabled={preview.fresh === 0} onClick={addAll}>
                  {t("share.import.add")}
                </Button>
              )}
            </div>
          )}
          {/* le preset de l'ami se garde sous son nom, modifiable ici puis dans Mes presets */}
          {preview && !savedMine && (
            <label htmlFor="share-keep-name" className="share-label share-keep-label">
              {t("share.import.keepAs")}
            </label>
          )}
          {preview && (
            <div className={`share-keep${savedMine ? " saved" : ""}`}>
              {savedMine ? (
                <>
                  <span className="share-added small">
                    <Check size={13} />
                    {t("share.import.saved")}
                  </span>
                  <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => setEditing(savedMine)}>
                    {t("share.import.edit")}
                  </Button>
                </>
              ) : (
                <>
                  <input
                    id="share-keep-name"
                    className="input text"
                    maxLength={MAX_NAME}
                    value={keepName}
                    placeholder={t("share.import.unnamed")}
                    onChange={(e) => setKeepName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => setSavedMine(savePreset(keepName.trim() || t("share.import.unnamed"), preview.preset.t))}
                  >
                    {t("share.import.keep")}
                  </Button>
                </>
              )}
            </div>
          )}
          <PresetEditor id={editing} onClose={() => setEditing(null)} />
        </motion.section>

        {/* RAG-70 : rapport pour le support */}
        <motion.section variants={rise} className="card share-card">
          <header className="card-head">
            <h3 className="rg-overline">{t("share.report")}</h3>
            <span className="muted small">{t("share.reportFor")}</span>
          </header>
          <p className="muted small share-p">{t("share.reportLead")}</p>
          <div className="share-well share-parts">
            {PARTS.map((k) => (
              <label key={k} className="check">
                <input type="checkbox" checked={parts[k]} onChange={(e) => setParts((p) => ({ ...p, [k]: e.target.checked }))} />
                <span>{t(`share.part.${k}`)}</span>
              </label>
            ))}
          </div>
          {report && (
            <motion.div className="share-file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <FileText size={15} />
              <span className="share-file-name">
                <span className="rg-metric">{report.name}</span>
                <span className="rg-metric muted"> · {kb(report.size)}</span>
              </span>
              <button type="button" className="link small" onClick={() => setShowText((v) => !v)}>
                {showText ? t("share.hide") : t("share.look")}
              </button>
              {isTauri && (
                <Button size="sm" icon={<FolderOpen size={13} />} onClick={() => void api.showReport(report.name)}>
                  {t("share.showFile")}
                </Button>
              )}
            </motion.div>
          )}
          {report && showText && <pre className="share-text rg-metric">{report.text}</pre>}
          {reportError && <p className="share-error small">{t("share.reportError")}</p>}
          <div className="share-actions share-foot">
            <Button
              size="sm"
              variant={report ? "secondary" : "primary"}
              icon={making ? <LoaderCircle size={13} className="spin" /> : undefined}
              disabled={making || !PARTS.some((k) => parts[k])}
              onClick={() => void makeReport()}
            >
              {report ? t("share.again") : t("share.make")}
            </Button>
            {report && SUPPORT_URL && (
              <Button size="sm" variant="primary" icon={<MessagesSquare size={13} />} onClick={() => void api.openUrl(SUPPORT_URL)}>
                {t("share.discord")}
              </Button>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
