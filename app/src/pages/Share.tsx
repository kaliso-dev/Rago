// Partage et support, à l'identique des maquettes v5 app-share.html et app-share-states.html : le nombre de réglages
// du code dans l'étiquette rouge de l'en-tête ; à gauche le code en ticket et l'import d'un ami (barre à segments :
// nouveaux, déjà allumés, Premium, indisponibles) ; à droite le rapport pour le support.
// Styles : s5/pages/module.css (socle) et s5/pages/pages.css, retouches dans s5/app.css.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { api, type ReportParts, type SupportReport } from "../lib/api";
import { autoVariant, availability, needsReboot, tweaks } from "../lib/catalog";
import { decodePreset, encodePreset, MAX_NAME, presetFileName, ShareError, type SharedPreset } from "../lib/share";
import { useStore } from "../lib/store";
import { SUPPORT_URL } from "../components/LicenseGate";
import { PresetEditor } from "../components/PresetEditor";
import { I } from "../s5/I";

const PARTS: (keyof ReportParts)[] = ["pc", "tweaks", "history", "logs", "network"];
/** Ordre des segments de l'aperçu, comme la maquette : nouveaux, déjà allumés, réservés à Premium, indisponibles. */
const ORDER = { n: 0, a: 1, l: 2, u: 3 } as const;
type Mark = { k: keyof typeof ORDER; r: boolean };

/** Ce que l'import changerait sur ce PC, réglage par réglage (mêmes règles que selectMany). */
interface Preview {
  preset: SharedPreset;
  /** entrées à ajouter, variantes inconnues de cette version retirées */
  entries: string[];
  /** un segment par réglage du code, dans l'ordre de la barre */
  marks: Mark[];
  fresh: number;
  reboot: number;
  already: number;
  unavailable: number;
  locked: number;
}

const titleSize = (s: string) => Math.min(96, Math.floor((96 * 17) / s.length));

/** Champ de la maquette (.in3) : la case dessinée, l'<input> transparent dedans. */
function Field({ id, value, onChange, placeholder, code, bad, label, onEnter }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; code?: boolean; bad?: boolean; label?: string; onEnter?: () => void }) {
  return (
    <div className={`in3${code ? " code" : ""}${bad ? " bad" : ""}`}>
      <input
        id={id}
        value={value}
        maxLength={code ? undefined : MAX_NAME}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
    </div>
  );
}

/** Texte du rapport : les titres « == … == » et la ligne de ce qui est masqué ressortent, comme la maquette. */
function ReportText({ text }: { text: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [end, setEnd] = useState(false);
  const check = () => {
    const el = box.current;
    if (el) setEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  };
  useEffect(check, [text]);
  const lines = text.replace(/\n+$/, "").split("\n");
  return (
    <pre className={`txt2${end ? " end" : ""}`}>
      <span className="tx" ref={box} onScroll={check} tabIndex={0}>
        {lines.map((l, i) => (
          <span key={i}>
            {l.startsWith("Hidden in this file") ? <span className="hl2">{l}</span> : /^== .* ==$/.test(l) ? <span className="sec">{l}</span> : l || " "}
            {i < lines.length - 1 && "\n"}
          </span>
        ))}
      </span>
    </pre>
  );
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
    const p: Preview = { preset, entries: [], marks: [], fresh: 0, reboot: 0, already: 0, unavailable: 0, locked: 0 };
    for (const e of preset.t) {
      const [id, raw] = e.split(":");
      const tw = tweaks.get(id);
      if (!tw || tw.kind !== "tweak" || !availability(tw, sys).ok) {
        p.unavailable++;
        p.marks.push({ k: "u", r: false });
        continue;
      }
      // variante d'une autre version : celle choisie pour ce PC à la place
      const v = raw && tw.variants?.some((x) => x.id === raw) ? raw : undefined;
      if (isLocked(id) || (v && variantLocked(id, v))) {
        p.locked++;
        p.marks.push({ k: "l", r: false });
        continue;
      }
      p.entries.push(v ? `${id}:${v}` : id);
      const vNow = v ?? variants[id] ?? autoVariant(tw, sys) ?? null;
      // déjà allumé (appliqué ou coché) avec cette variante : rien ne change
      const current = selected.has(id) ? variantOf(tw) : (applied.get(id)?.variant ?? null);
      if (isOn(id) && current === vNow) {
        p.already++;
        p.marks.push({ k: "a", r: false });
        continue;
      }
      p.fresh++;
      const r = needsReboot(tw, vNow);
      if (r) p.reboot++;
      p.marks.push({ k: "n", r });
    }
    // tri stable : chaque groupe garde l'ordre du code
    p.marks = p.marks.map((m, i) => [m, i] as const).sort((a, b) => ORDER[a[0].k] - ORDER[b[0].k] || a[1] - b[1]).map(([m]) => m);
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
  const toggle = (k: keyof ReportParts) => setParts((p) => ({ ...p, [k]: !p[k] }));
  const picked = PARTS.some((k) => parts[k]);

  const title = t("share.title").toLowerCase();
  const n = currentSetup.length;
  const ticks = Math.min(Math.max(n, 1), 60);
  const cut = code.indexOf("_") + 1;

  return (
    <div className="pg-mod pg-pages pg-share is-page">
      <section className="head">
        <div>
          <p className="kick">
            <button type="button" className="bk" onClick={() => goTo("settings")}>
              <I n="left" />
              {t("nav.settings")}
            </button>{" "}
            <b>//</b> {t("s5.sh.kick")}
          </p>
          <h1 className="title" data-t={title} style={{ fontSize: titleSize(title) }}>
            {title}
          </h1>
        </div>
        <div className="ping sig">
          <div className="pv">
            <b>{n}</b>
            <span>
              {t("s5.sh.unit", { n })}
              <small>{n ? t("s5.sh.ready") : t("s5.sh.empty")}</small>
            </span>
          </div>
          <div className="ticks" aria-hidden="true">
            <span className="g" style={{ "--n": ticks } as CSSProperties}>
              {Array.from({ length: n ? ticks : 21 }, (_, i) => (
                <i key={i} className={n ? "on" : undefined} />
              ))}
            </span>
          </div>
        </div>
      </section>
      <div className="nobar" />

      <div className="setgrid shgrid">
        <div className="col">
          {/* RAG-44 : partager un preset */}
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("share.preset")}</h2>
              <span className="vt2 ok">{t("share.on", { n })}</span>
            </div>
            <p className="lead3">{t("share.presetLead")}</p>
            <div className="panel shp">
              {n > 0 ? (
                <>
                  <div className="fld">
                    <label className="lbl" htmlFor="share-name">
                      {t("share.name")}
                    </label>
                    <Field id="share-name" value={shareName} onChange={setShareName} placeholder={t("share.namePh")} />
                    <p className="hint2">{t("share.nameHint")}</p>
                  </div>
                  <div className="tkt">
                    <div className="tkl">
                      <div className="tkh">
                        <span className="lbl">{t("s5.sh.preset")}</span>
                        <b className={shareName.trim() ? undefined : "dim"}>{shareName.trim() || t("s5.sh.untitled")}</b>
                      </div>
                      <p className="cdv" title={code}>
                        {code ? (
                          <>
                            <em>{code.slice(0, cut)}</em>
                            {code.slice(cut)}
                          </>
                        ) : (
                          "…"
                        )}
                      </p>
                    </div>
                    <div className="tkr">
                      <b>{n}</b>
                      <span>{t("s5.sh.unit", { n })}</span>
                      <button type="button" className={`btn sm${copied ? "" : " red"}`} disabled={!code} onClick={() => void copy()}>
                        <I n={copied ? "check" : "copy"} />
                        {copied ? t("share.copied") : t("share.copy")}
                      </button>
                    </div>
                  </div>
                  {shareError && (
                    <p className="err2" role="alert">
                      <I n="alert" />
                      {t("share.error")}
                    </p>
                  )}
                  <div className="shrow">
                    <button type="button" className="btn sm" disabled={!code} onClick={() => void saveFile()}>
                      <I n="download" />
                      {t("share.saveFile")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="emp2">
                  <I n="sliders" />
                  <p>{t("share.none")}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("share.import")}</h2>
            </div>
            <div className="panel shp">
              <div className="pst">
                <Field
                  id="share-code"
                  code
                  bad={!!importError}
                  value={input}
                  placeholder="RAGO2_…"
                  label={t("share.import")}
                  onChange={(v) => {
                    setInput(v);
                    setImportError(null);
                  }}
                  onEnter={() => void runPreview()}
                />
                <button type="button" className="btn sm" disabled={!input.trim()} onClick={() => void runPreview()}>
                  {t("share.preview")}
                </button>
              </div>
              <button type="button" className="lnk opn" onClick={() => void openFile()}>
                <I n="upload" />
                {t("share.openFile")}
              </button>
              {importError && (
                <p className="err2" role="alert">
                  <I n="alert" />
                  {importError}
                </p>
              )}
              {preview && (
                <div className="pv2">
                  <div className="pvh">
                    <b>{preview.preset.n || t("share.import.unnamed")}</b>
                    <span>{t("share.import.count", { n: preview.preset.t.length })}</span>
                  </div>
                  <div className="segb" aria-hidden="true">
                    {preview.marks.map((m, i) => (
                      <i key={i} className={m.r ? `${m.k} r` : m.k} />
                    ))}
                  </div>
                  <div className="lg2">
                    {preview.fresh > 0 && (
                      <span className="n">
                        <i />
                        {t("share.import.fresh", { n: preview.fresh })}
                      </span>
                    )}
                    {preview.already > 0 && (
                      <span className="a">
                        <i />
                        {t("share.import.already", { n: preview.already })}
                      </span>
                    )}
                    {preview.reboot > 0 && (
                      <span className="r">
                        <I n="power" />
                        {t("share.import.reboot", { n: preview.reboot })}
                      </span>
                    )}
                    {preview.locked > 0 && (
                      <span className="l">
                        <i />
                        {t("share.import.locked", { n: preview.locked })}
                      </span>
                    )}
                    {preview.unavailable > 0 && (
                      <span className="u">
                        <i />
                        {t("share.import.unavailable", { n: preview.unavailable })}
                      </span>
                    )}
                  </div>
                  <div className="pva">
                    {added != null ? (
                      <span className="ok3" role="status">
                        <I n="check" />
                        {t("share.import.added", { n: added })}
                      </span>
                    ) : (
                      // « tout est déjà allumé » seulement si c'est vrai : pas quand le reste est réservé à Premium
                      preview.fresh === 0 && preview.locked === 0 && preview.already > 0 && <span className="ok3 dim">{t("share.import.nothing")}</span>
                    )}
                    {preview.locked > 0 && !premium && (
                      <button type="button" className="btn sm gh2" onClick={() => setUpsell("plan")}>
                        {t("free.upgrade")}
                      </button>
                    )}
                    {added == null && preview.fresh > 0 && (
                      <button type="button" className="btn sm red" onClick={addAll}>
                        <I n="plus" />
                        {t("share.import.add")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* le preset de l'ami se garde sous son nom, modifiable ici puis dans Mes presets */}
              {preview &&
                (savedMine ? (
                  <div className="keep2 done">
                    <span className="ok3" role="status">
                      <I n="check" />
                      {t("share.import.saved")}
                    </span>
                    <button type="button" className="btn sm" onClick={() => setEditing(savedMine)}>
                      <I n="pencil" />
                      {t("share.import.edit")}
                    </button>
                  </div>
                ) : (
                  <div className="keep2">
                    <label className="lbl" htmlFor="share-keep-name">
                      {t("share.import.keepAs")}
                    </label>
                    <div className="kr">
                      <Field id="share-keep-name" value={keepName} onChange={setKeepName} placeholder={t("share.import.unnamed")} />
                      <button type="button" className="btn sm" onClick={() => setSavedMine(savePreset(keepName.trim() || t("share.import.unnamed"), preview.preset.t))}>
                        <I n="plus" />
                        {t("share.import.keep")}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <PresetEditor id={editing} onClose={() => setEditing(null)} />
          </section>
        </div>

        <div className="col">
          {/* RAG-70 : rapport pour le support */}
          <section>
            <div className="sh">
              <h2 className="h2 tape">{t("share.report")}</h2>
              <span className="fold">{t("share.reportFor")}</span>
            </div>
            <p className="lead3">{t("share.reportLead")}</p>
            <div className="panel shp">
              <div className="chl">
                {PARTS.map((k) => (
                  <div
                    key={k}
                    className={`cr${parts[k] ? "" : " off"}`}
                    role="checkbox"
                    aria-checked={parts[k]}
                    tabIndex={0}
                    onClick={() => toggle(k)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggle(k);
                      }
                    }}
                  >
                    <i className={`cbx${parts[k] ? " on" : ""}`} />
                    <span>{t(`share.part.${k}`)}</span>
                  </div>
                ))}
              </div>
              {report && (
                <div className="rfile">
                  <span className="ic2">
                    <I n="filetext" />
                  </span>
                  <div className="l">
                    <b title={report.name}>{report.name}</b>
                    <span>{kb(report.size)}</span>
                  </div>
                  <button type="button" className="lnk" aria-expanded={showText} onClick={() => setShowText((v) => !v)}>
                    {showText ? t("share.hide") : t("share.look")}
                  </button>
                  <button type="button" className="btn sm" onClick={() => void api.showReport(report.name)}>
                    <I n="folder" />
                    {t("share.showFile")}
                  </button>
                </div>
              )}
              {report && showText && <ReportText text={report.text} />}
              {reportError && (
                <p className="err2" role="alert">
                  <I n="alert" />
                  {t("share.reportError")}
                </p>
              )}
              <div className="shrow end">
                {report ? (
                  <>
                    <button type="button" className="btn sm" disabled={making || !picked} onClick={() => void makeReport()}>
                      <I n={making ? "loader" : "refresh"} className={making ? "spin" : undefined} />
                      {t("share.again")}
                    </button>
                    {SUPPORT_URL && (
                      <button type="button" className="btn sm red" onClick={() => void api.openUrl(SUPPORT_URL)}>
                        <I n="chat" />
                        {t("share.discord")}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className={`btn sm red${picked ? "" : " dis2"}`} disabled={making || !picked} onClick={() => void makeReport()}>
                    {making && <I n="loader" className="spin" />}
                    {t("share.make")}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
