// Tableau de bord : la maquette v5 app-dashboard-v2-pi.html reprise telle quelle (styles : s5/pages/pg-dash.css).
// Le score de la machine en tête, une seule action principale (les tweaks gratuits), l'analyse, le PC et son usage en
// direct, les jeux en vignettes, les presets sans description.
import { useEffect, useMemo, useState } from "react";
import { availability, catalog, distinctKey, retired, totalTweaks, tweakModule, tweaks } from "../lib/catalog";
import { api, type Game } from "../lib/api";
import { findings, saved } from "../lib/analysis";
import { FREE, FREE_SLOTS, useStore } from "../lib/store";
import { MAX_NAME } from "../lib/share";
import { useLiveStats } from "../components/LiveStatsCard";
import { PresetEditor } from "../components/PresetEditor";
import { I, Seg } from "../s5/I";
import { ago, shortDate } from "../s5/text";
import { coverOf } from "../s5/art";

/** Interrupteurs du catalogue (les actions ponctuelles ne restent jamais « appliquées »), jumeaux comptés une fois. */
const totalSwitches = new Set([...tweaks.values()].filter((tw) => tw.kind === "tweak").map((tw) => distinctKey(tw.id))).size;

/** Tweaks gratuits : les interrupteurs du module Windows du plan gratuit, chacun avec sa variante par défaut. */
const FREE_ENTRIES = [...FREE].flatMap((id) => {
  const tw = tweaks.get(id);
  if (!tw || tw.kind !== "tweak" || tweakModule.get(id) !== "windows") return [];
  return [tw.variants?.length ? `${id}:${tw.defaultVariant ?? tw.variants[0].id}` : id];
});

/** « AMD Ryzen 7 7800X3D 8-Core Processor » → « Ryzen 7 7800X3D » ; « NVIDIA GeForce RTX 4070 SUPER » → « RTX 4070 SUPER ». */
export function shortCpu(name: string) {
  return name
    .replace(/\((R|TM|tm)\)/g, "")
    .replace(/^(AMD|Intel)\s+/i, "")
    .replace(/\s+\d+-Core Processor.*$/i, "")
    .replace(/\s+(CPU|Processor)\b.*$/i, "")
    .replace(/^Core\s+/i, "Core ")
    .replace(/\s+with Radeon.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
export function shortGpu(name: string) {
  return name.replace(/^(NVIDIA|AMD|Intel\(R\)|Intel)\s+/i, "").replace(/^(GeForce|Radeon\(TM\)|Radeon)\s+/i, "").replace(/\(TM\)|\(R\)/g, "").replace(/\s{2,}/g, " ").trim();
}
/** « 2.5 Gbps », « 1 Gbit/s » → « 2.5 GbE » ; Wi-Fi tel quel. */
function shortNet(adapter: string | null, speed: string | null) {
  if (adapter && /wi-?fi|wireless|802\.11/i.test(adapter)) return "Wi-Fi";
  const m = speed?.match(/([\d.]+)\s*G/i);
  if (m) return `${m[1]} GbE`;
  const k = speed?.match(/([\d.]+)\s*M/i);
  if (k) return `${k[1]} Mb/s`;
  return adapter ?? "—";
}
/** colonne « chaude » de la maquette : valeur en rouge et barre rouge */
const HOT = 60;

export function Dashboard() {
  const { t, lang, sys, isOn, selected, variantOf, selectMany, lastRestore, requestApply, premium, setUpsell, applied: appliedMap, retiredApplied, requestUndo, requestUndoAll, run, myPresets, currentSetup, savePreset, toApply, requestApplyEntries, slotsUsed, goTo, cleanTrim } = useStore();
  const stats = useLiveStats();
  const [naming, setNaming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [art, setArt] = useState<Record<string, string | null>>({});
  const [cleaning, setCleaning] = useState<"busy" | "done" | null>(null);

  // tweaks gratuits encore à appliquer ; plan gratuit : pas plus que les emplacements libres
  const room = premium || !FREE_SLOTS ? Infinity : Math.max(0, FREE_SLOTS - slotsUsed);
  const boost = sys ? FREE_ENTRIES.filter((e) => toApply([e]).ids.length > 0).slice(0, room) : [];
  const freeLeft = boost.length;
  const freeOn = FREE_ENTRIES.filter((e) => isOn(e.split(":")[0])).length;
  const freeTotal = premium ? FREE_ENTRIES.length : Math.min(FREE_ENTRIES.length, FREE_SLOTS || FREE_ENTRIES.length);
  const applied = new Set([...appliedMap.values()].filter((a) => a.ok && tweaks.get(a.id)?.kind === "tweak").map((a) => distinctKey(a.id))).size;

  // dernière analyse : points au-dessus de la normale, et qui les règle
  const last = saved();
  const lastV = last.after ?? last.before;
  const list = useMemo(() => (lastV ? findings(lastV) : []), [lastV]);
  const issues = list.filter((f) => f.issue);
  const by = (k: string) => issues.filter((f) => f.fix.kind === k).length;

  // jeux du PC, les derniers joués d'abord
  useEffect(() => {
    let live = true;
    void api.gamesList(false).then(
      (g) => live && setGames([...g].sort((a, b) => Number(b.running) - Number(a.running) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))),
      () => live && setGames([]),
    );
    return () => {
      live = false;
    };
  }, []);
  const shown = (games ?? []).slice(0, 5);
  useEffect(() => {
    let live = true;
    for (const g of shown)
      if (!(g.id in art) && !coverOf(g, "wide"))
        void api.gameArt(g.id).then(
          (src) => live && setArt((a) => ({ ...a, [g.id]: src })),
          () => {},
        );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  /** Réglages d'un preset utilisables sur ce PC, et preset complet (chacun allumé, avec la variante du preset). */
  const presetState = (entries: string[]) => {
    const usable = entries.flatMap((e) => {
      const [id, v] = e.split(":");
      const tw = tweaks.get(id);
      return tw && tw.kind === "tweak" && availability(tw, sys).ok ? [{ tw, v }] : [];
    });
    const variantNow = (id: string) => (selected.has(id) ? variantOf(tweaks.get(id)!) : appliedMap.get(id)?.variant);
    const on = usable.length > 0 && usable.every(({ tw, v }) => isOn(tw.id) && (!v || variantNow(tw.id) === v));
    return { n: usable.length, on };
  };
  const ready = catalog.presets
    .filter((p) => !p.game)
    .map((p) => ({ p, ...presetState(p.tweaks) }))
    .sort((a, b) => b.n - a.n);

  const clean = async () => {
    setCleaning("busy");
    try {
      await api.cleanRam(cleanTrim);
    } catch {
      /* la valeur en direct dit ce qu'il en est */
    }
    setCleaning("done");
    window.setTimeout(() => setCleaning(null), 2400);
  };

  const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v));
  const hw: { key: string; icon: string; label: string; model: string; value: number | null; unit: string; max: number; action?: React.ReactNode }[] = [
    { key: "cpu", icon: "cpu", label: t("dash.cpu"), model: sys ? shortCpu(sys.cpuName) : "…", value: pct(stats?.cpu), unit: "%", max: 100 },
    { key: "gpu", icon: "gpu", label: t("dash.gpu"), model: sys ? (sys.gpus.map((g) => shortGpu(g.name))[0] ?? "—") : "…", value: pct(stats?.gpu), unit: "%", max: 100 },
    {
      key: "ram",
      icon: "ram",
      label: t("dash.ram"),
      model: sys ? `${sys.ramGb} GB` : "…",
      value: pct(stats?.ram),
      unit: "%",
      max: 100,
      action: (
        <button type="button" className="btn sm" title={t("live.cleanHint")} disabled={cleaning === "busy"} onClick={() => void clean()}>
          {cleaning === "busy" ? t("live.cleaning") : cleaning === "done" ? t("s5.dash.cleaned") : t("live.clean")}
        </button>
      ),
    },
    { key: "net", icon: "net", label: t("dash.net"), model: sys ? shortNet(sys.adapterDesc ?? sys.adapter, sys.linkSpeed) : "…", value: stats?.ping == null ? null : Math.round(stats.ping), unit: "ms", max: 100 },
  ];
  const npi = !!sys?.resources.includes("nvidiaProfileInspector.exe");
  const freeTitle = t("s5.dash.freeTitle").split("\n");

  return (
    <div className="pg-dash">
      <section className="head">
        <div>
          <p className="kick">
            {t("dash.overline")} <b>//</b> {t("dash.kick", { n: totalTweaks })}
          </p>
          <h1 className="title" data-t={t("dash.title")}>
            {t("dash.title")}
          </h1>
        </div>
        <div className="score">
          <div className="pv">
            <b>{applied}</b>
            <span>
              {t("dash.on")}
              <small>{t("dash.of", { n: totalSwitches })}</small>
            </span>
          </div>
          <Seg value={applied} total={totalSwitches} count={24} />
        </div>
      </section>

      <div className="row">
        <section className="free panel">
          {!premium && <span className="chip ghost">{t("free.plan")}</span>}
          <div className="t">
            <h2>
              {freeTitle[0]}
              {freeTitle[1] && <br />}
              {freeTitle[1]}
            </h2>
            <div className="left">
              <b>{sys ? freeLeft : "–"}</b>
              <span className="lbl">{t("dash.free.left")}</span>
            </div>
          </div>
          <Seg value={freeOn} total={Math.max(freeTotal, 1)} count={30} />
          <div className="go">
            <button
              type="button"
              className="btn red lg"
              disabled={!sys || freeLeft === 0 || !!run}
              onClick={() => requestApplyEntries(boost, { title: t("dash.free.confirmTitle"), lead: t("dash.free.confirmLead") })}
            >
              <I n={sys && freeLeft === 0 ? "check" : "zap"} />
              {sys && freeLeft === 0 ? t("dash.free.done") : t("s5.dash.freeGo", { n: freeLeft })}
            </button>
            <span className="sub">{t("dash.free.already", { n: freeOn, total: freeTotal })}</span>
          </div>
        </section>

        <section className="ana panel">
          <div className="top">
            <span className="ic">
              <I n="activity" />
            </span>
            <h3>
              {t("nav.analysis")}
              <small>{lastV ? t("s5.dash.lastRun", { ago: ago(lang, lastV.at) }) : t("s5.dash.neverRun")}</small>
            </h3>
          </div>
          <div className="res">
            <b>{lastV ? issues.length : "–"}</b>
            <span>
              {t("s5.dash.above")}
              <small>{lastV ? t("s5.dash.measured", { n: list.length }) : t("s5.dash.notMeasured")}</small>
            </span>
          </div>
          <Seg value={issues.length} total={Math.max(list.length, 1)} count={list.length || 17} />
          <div className="split">
            <div>
              <b>{lastV ? by("free") : "–"}</b>
              <span className="lbl">{t("s5.dash.freeFix")}</span>
            </div>
            <div className="p">
              <b>{lastV ? by("premium") : "–"}</b>
              <span className="lbl">{t("s5.dash.premium")}</span>
            </div>
            <div>
              <b>{lastV ? by("diy") : "–"}</b>
              <span className="lbl">{t("s5.dash.byYou")}</span>
            </div>
          </div>
          <div className="acts">
            {lastV ? (
              <>
                <button type="button" className="btn" onClick={() => goTo("analysis")}>
                  <I n="eye" />
                  {t("s5.dash.seeResults")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    sessionStorage.setItem("rago.analysis.run", "1");
                    goTo("analysis");
                  }}
                >
                  <I n="refresh" />
                  {t("s5.dash.runAgain")}
                </button>
              </>
            ) : (
              <button type="button" className="btn red" onClick={() => goTo("analysis")}>
                <I n="activity" />
                {t("pa.start")}
              </button>
            )}
          </div>
        </section>
      </div>

      {retiredApplied.length > 0 && (
        <section className="lnt dash-retired">
          <I n="alert" />
          <span className="tx">
            <b>{t("dash.retired.title")}.</b> {retiredApplied.map((id) => retired.get(id)?.name[lang]).filter(Boolean).join(", ")}
          </span>
          <button type="button" className="btn" disabled={!!run} onClick={() => requestUndo(retiredApplied)}>
            <I n="undo" />
            {t("dash.retired.go")}
          </button>
        </section>
      )}

      <section>
        <div className="sh">
          <h2 className="h2 tape">{t("dash.system")}</h2>
          <div className="r">
            <span className="live">
              <i />
              {t("dash.live")}
            </span>
          </div>
        </div>
        <div className="rig panel">
          <div className="hw">
            {hw.map((h) => {
              const hot = h.unit === "%" && h.value != null && h.value >= HOT;
              return (
                <div key={h.key} className={hot ? "hot" : undefined}>
                  <span className="k lbl">
                    <I n={h.icon} />
                    {h.label}
                  </span>
                  <span className="md">{h.model}</span>
                  <div className="v">
                    <b>
                      {h.value ?? "–"}
                      <small>{h.unit}</small>
                    </b>
                    {h.action}
                  </div>
                  <Seg value={h.value ?? 0} total={h.max} count={20} kind={hot ? "f" : "m"} />
                </div>
              );
            })}
          </div>
          <div className="chk">
            <span>
              <I n="windows" />
              <b>{sys?.osName ?? "Windows"}</b>
            </span>
            <span className={sys && !sys.isAdmin ? "no" : undefined}>
              <I n={sys && !sys.isAdmin ? "x" : "check"} />
              {t("s5.dash.admin")}
            </span>
            {sys?.gpus.some((g) => g.vendor === "nvidia") && (
              <span className={npi ? undefined : "no"}>
                <I n={npi ? "check" : "x"} />
                Profile Inspector
              </span>
            )}
            <span className={lastRestore == null ? "no" : undefined}>
              <I n={lastRestore == null ? "x" : "check"} />
              {t("dash.health.restore")} <b>{lastRestore != null ? shortDate(lang, lastRestore) : t("dash.health.restoreNone")}</b>
            </span>
            {lastRestore == null && (
              <button type="button" className="btn sm" disabled={!!run} onClick={() => requestApply(["rst_point"])}>
                <I n="plus" />
                {t("dash.createRestore")}
              </button>
            )}
            <button type="button" className="btn sm" disabled={!!run || appliedMap.size === 0} onClick={() => void requestUndoAll()}>
              <I n="undo" />
              {t("dash.undoAll")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="sh">
          <h2 className="h2 tape">{t("nav.games")}</h2>
        </div>
        <div className="games">
          {shown.map((g) => {
            const src = coverOf(g, "wide") ?? art[g.id] ?? null;
            return (
              <div key={g.id} className={`gc${g.running ? " on" : ""}`} role="button" tabIndex={0} onClick={() => goTo("games")}>
                <div className="cv" style={src ? { backgroundImage: `url("${src}")` } : undefined}>
                  {g.running && (
                    <span className="ck">
                      <I n="check" line />
                    </span>
                  )}
                </div>
                <b>{g.name}</b>
              </div>
            );
          })}
          <div className="gc more" role="button" tabIndex={0} onClick={() => goTo("games")}>
            <div className="cv">
              <b>{games && games.length > shown.length ? `+${games.length - shown.length}` : "+"}</b>
            </div>
            <b>{t("s5.dash.allGames")}</b>
          </div>
        </div>
      </section>

      <section>
        <div className="sh">
          <h2 className="h2 tape">{t("dash.presets")}</h2>
        </div>
        <div className="pgrid">
          <div className="plist panel">
            <div className="ph lbl">{t("dash.readyMade")}</div>
            {ready.map(({ p, n, on }) => (
              <div key={p.id} className={`pr${on ? " on" : ""}`}>
                <span className="c">{n}</span>
                <b>{p.name[lang]}</b>
                <button type="button" className="btn sm" onClick={() => (premium ? selectMany(p.tweaks) : setUpsell("preset"))}>
                  {on ? t("dash.preset.added") : t("dash.preset.add")}
                </button>
              </div>
            ))}
          </div>
          <div className="plist panel">
            <div className="ph lbl">{t("s5.dash.mine")}</div>
            {myPresets.map((p) => {
              const st = presetState(p.t);
              return (
                <div key={p.id} className={`pr mine${st.on ? " on" : ""}`} role="button" tabIndex={0} title={t("dash.preset.add")} onClick={() => selectMany(p.t)}>
                  <span className="c">{st.n}</span>
                  <b>{p.name}</b>
                  <button
                    type="button"
                    className="dots"
                    aria-label={t("dash.mine.edit")}
                    title={t("dash.mine.edit")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p.id);
                    }}
                  >
                    <I n="sliders" />
                  </button>
                </div>
              );
            })}
            {naming == null ? (
              <button type="button" className="save" disabled={!currentSetup.length} title={currentSetup.length ? t("dash.mine.saveHint") : t("dash.mine.empty")} onClick={() => setNaming("")}>
                <I n="plus" line />
                {t("dash.mine.save")}
              </button>
            ) : (
              <form
                className="save naming"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!naming.trim() || !currentSetup.length) return;
                  savePreset(naming, currentSetup);
                  setNaming(null);
                }}
              >
                <I n="plus" line />
                <input autoFocus maxLength={MAX_NAME} value={naming} placeholder={t("dash.mine.namePh")} aria-label={t("dash.mine.name")} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNaming(null)} />
                <button type="submit" className="btn sm red" disabled={!naming.trim()}>
                  {t("dash.mine.ok")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <PresetEditor id={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
