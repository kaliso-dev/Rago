// « Analyze my PC » (1.3.0), à l'identique des maquettes v5 app-analysis-start, -running, -results, -allfine et -after :
// ce qui ralentit le PC en jeu, mesuré, avec pour chaque point ce qui le règle ; puis l'avant/après quand des tweaks
// ont été appliqués depuis. Logique : lib/analysis.ts. Styles : s5/pages/module.css (socle), s5/pages/analysis.css,
// retouches dans s5/app.css.
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useStore, FREE } from "../lib/store";
import { analyze, deltas, findings, record, resetBaseline, saved, Stopped, STEPS, type Delta, type Finding, type Group, type Step, type Values } from "../lib/analysis";
import type { Key } from "../lib/i18n";
import { I } from "../s5/I";
import { clock, dayMonth } from "../s5/text";

const GROUPS: Group[] = ["network", "fps", "system", "windows"];
const UNITS: Partial<Record<keyof Values, string>> = { jitter: "ms", loss: "%", cpuIdle: "%", fps: "fps", low1: "fps", stutters: "/min" };
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
/** Texte sur deux lignes (« what slows your pc\ndown in game »). */
const lines = (s: string) => s.split("\n").map((l, i) => (
  <Fragment key={i}>
    {i > 0 && <br />}
    {l}
  </Fragment>
));

export function Analysis() {
  const { t, lang, premium, applied, requestApplyEntries, setUpsell, goTo } = useStore();
  const [step, setStep] = useState<Step | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const stop = useRef<AbortController | null>(null);
  const [store, setStore] = useState(saved);
  const current: Values | null = store.after ?? store.before;
  const list = useMemo(() => (current ? findings(current) : []), [current]);
  const issues = list.filter((f) => f.issue);
  const byFix = (k: "free" | "premium" | "diy") => issues.filter((f) => f.fix.kind === k);
  const nFree = byFix("free").length, nPrem = byFix("premium").length, nDiy = byFix("diy").length;
  // tweaks gratuits qui règlent un point trouvé et qui ne sont pas encore appliqués
  const freeTweaks = [...new Set(byFix("free").flatMap((f) => (f.fix.kind === "free" ? f.fix.tweaks : [])))].filter((id) => FREE.has(id) && !applied.has(id));
  const compare = store.before && store.after ? deltas(store.before, store.after) : [];
  const beforeIssues = store.before && store.after ? findings(store.before).filter((f) => f.issue).length : null;

  const run = async () => {
    const ctl = new AbortController();
    stop.current = ctl;
    setProgress(null);
    setStep("hardware");
    try {
      const v = await analyze(
        (s) => {
          setStep(s);
          setProgress(null);
        },
        { signal: ctl.signal, onProgress: (done, n) => setProgress([done, n]) },
      );
      record(v);
      setStore(saved());
    } catch (e) {
      if (!(e instanceof Stopped)) throw e;
    } finally {
      stop.current = null;
      setStep(null);
      setProgress(null);
    }
  };
  // tweaks appliqués pendant que la page est ouverte : le bouton rouge devient « mesurer à nouveau »
  useEffect(() => {
    if (!step) setStore(saved());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);
  // ouverte après une application : la nouvelle mesure part toute seule
  useEffect(() => {
    // « Run again » du tableau de bord : la mesure part aussi toute seule
    const asked = sessionStorage.getItem("rago.analysis.run") === "1";
    sessionStorage.removeItem("rago.analysis.run");
    if ((store.changed || asked) && !step) void run();
    return () => stop.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startOver = () => {
    resetBaseline();
    setStore(saved());
  };

  const title = t("pa.title").toLowerCase();
  const show = (v: string) => (v.startsWith("pa.") ? t(v as Key) : v);
  const unitOf = (u: string) => (u === "d" ? t("s5.pa.days") : u === "FPS" ? "fps" : u);

  const badge = (f: Finding) =>
    !f.issue ? (
      <span className="vt fine">{t("pa.fine")}</span>
    ) : f.fix.kind === "free" ? (
      <span className="vt free">
        <I n="zap" />
        {t("pa.free")}
      </span>
    ) : f.fix.kind === "premium" ? (
      <span className="vt prem">
        {!premium && <I n="lock" />}
        {t("pa.premium")}
      </span>
    ) : f.fix.kind === "diy" ? (
      <span className="vt diy">
        <I n="wrench" />
        {t("pa.diy")}
      </span>
    ) : (
      <span />
    );

  /** Valeur de la ligne : nombre et unité (« 14 ms »), ou texte (« Cable », « Steam, OneDrive »). */
  const value = (f: Finding) => {
    if (f.id === "background" && current && current.background.length) {
      const apps = current.background;
      return (
        <div className="v t" title={apps.join(", ")}>
          {apps.slice(0, 2).join(", ")}
          {apps.length > 2 && ` +${apps.length - 2}`}
        </div>
      );
    }
    const m = /^(-?[\d.]+)\s*(.*)$/.exec(f.value);
    if (!m) return <div className="v t">{show(f.value)}</div>;
    return (
      <div className="v">
        {m[1]}
        <small>{unitOf(m[2])}</small>
      </div>
    );
  };

  const norm = (f: Finding) => {
    if (!current) return "";
    const base = t(f.norm as Key, { max: current.refreshMax ?? "", rated: current.memRated ?? "", half: current.fps != null ? Math.round(current.fps / 2) : "", ...f.vars });
    return f.vars?.why ? `${base} ${t(f.vars.why as Key, f.vars)}` : base;
  };
  const how = (f: Finding) => {
    if (!current || !f.issue || f.fix.kind !== "diy") return null;
    const s = t(f.fix.how as Key, { max: current.refreshMax ?? "" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /** Écart de l'avant/après : en %, en points ou en nombre, comme la maquette (« −57 % », « −4.6 points »). */
  const gap = (d: Delta) => {
    const diff = Math.round((d.after - d.before) * 10) / 10;
    const sign = (x: number) => (x > 0 ? `+${x}` : x < 0 ? `−${Math.abs(x)}` : "0");
    if (d.id === "processes") return t("s5.pa.dProc", { d: sign(diff), n: Math.abs(diff) });
    if (d.id === "spikes") return t("s5.pa.dSpike", { d: sign(diff), n: Math.abs(diff) });
    if (d.id === "cpuIdle" || d.id === "loss") return t("s5.pa.dPts", { d: sign(diff) });
    return `${sign(Math.round(((d.after - d.before) / (d.before || 1)) * 100))} %`;
  };

  const measured = (at: number) => (sameDay(at, Date.now()) ? t("s5.pa.today", { time: clock(lang, at) }) : t("s5.pa.on", { date: dayMonth(lang, at, true), time: clock(lang, at) }));
  const at = step ? STEPS.indexOf(step) : -1;

  // ---------- en-tête : l'étiquette rouge change avec l'écran
  let sig;
  if (step) {
    sig = (
      <>
        <div className="pv">
          <b>{at + 1}</b>
          <span>
            / {STEPS.length}
            <small>{t(`s5.pa.sn.${step}` as Key).toLowerCase()}</small>
          </span>
        </div>
        <div className="ticks" aria-hidden="true">
          <span className="g" style={{ "--n": STEPS.length } as CSSProperties}>
            {STEPS.map((s, i) => (
              <i key={s} className={i < at ? "on" : i === at ? "pd" : undefined} />
            ))}
          </span>
        </div>
      </>
    );
  } else if (!current) {
    sig = (
      <>
        <div className="pv">
          <b>20</b>
          <span>
            {t("s5.pa.sec")}
            <small>{t("s5.pa.about")}</small>
          </span>
        </div>
        <div className="ticks" aria-hidden="true">
          <span className="g" style={{ "--n": STEPS.length } as CSSProperties}>
            {STEPS.map((s) => (
              <i key={s} />
            ))}
          </span>
        </div>
      </>
    );
  } else {
    sig = (
      <>
        <div className="pv">
          <b>{issues.length}</b>
          <span>
            {lines(t("s5.pa.above"))}
            <small>
              {beforeIssues != null && store.before
                ? t("s5.pa.was", { n: beforeIssues, date: dayMonth(lang, store.before.at).toLowerCase() })
                : t("s5.pa.ofMeasured", { n: list.length })}
            </small>
          </span>
        </div>
        <div className="ticks" aria-hidden="true">
          {GROUPS.map((g) => {
            const rows = list.filter((f) => f.group === g);
            return rows.length ? (
              <span key={g} className="g" style={{ "--n": rows.length } as CSSProperties}>
                {rows.map((f) => (
                  <i key={f.id} className={f.issue ? "on" : undefined} />
                ))}
              </span>
            ) : null;
          })}
        </div>
      </>
    );
  }

  // ---------- phrase du bilan : « 3 fixed for free, 3 by Premium, 2 to do yourself: each line says how. »
  const parts: string[] = [];
  if (nFree) parts.push(t("s5.pa.sFree", { n: nFree }));
  if (nPrem) parts.push(t(parts.length ? "s5.pa.sPrem" : "s5.pa.sPremFirst", { n: nPrem }));
  if (nDiy) parts.push(t("s5.pa.sDiy", { n: nDiy }));
  const again = (cls: string) => (
    <button type="button" className={cls} onClick={() => void run()}>
      <I n="refresh" />
      {store.changed ? t("pa.measureAgain") : t("pa.again")}
    </button>
  );
  const red = store.changed ? (
    again("btn red")
  ) : freeTweaks.length > 0 ? (
    <button type="button" className="btn red" onClick={() => requestApplyEntries(freeTweaks)}>
      <I n="zap" />
      {t("pa.applyFree", { n: freeTweaks.length })}
    </button>
  ) : premium && nPrem > 0 ? (
    <button type="button" className="btn red" onClick={() => goTo("latency")}>
      <I n="gauge" />
      {t("pa.openLatency")}
    </button>
  ) : null;
  const upsell = !premium && nPrem > 0 && (
    <button type="button" className={`btn${red ? "" : " red"}`} onClick={() => setUpsell("analysis")}>
      <I n="lock" />
      {t("pa.seePremium")}
    </button>
  );
  // « analyze again » : dans la rangée quand il y a un avant/après, sinon dans la ligne du bas
  const againInRow = compare.length > 0 && !store.changed;

  return (
    <div className="pg-mod pg-an is-page">
      <section className="head">
        <div>
          <p className="kick">
            {t("pa.overline").toLowerCase()} <b>//</b> {t("s5.pa.kick")}
          </p>
          <h1 className="title" data-t={title} style={{ fontSize: Math.min(97, Math.floor((97 * 13) / title.length)) }}>
            {title}
          </h1>
        </div>
        <div className="ping sig">{sig}</div>
      </section>

      {step || !current ? (
        <div className="start">
          <div className="panel go">
            {step ? (
              <div>
                <span className="lbl">{t("s5.pa.running")}</span>
                <h3>{lines(t(`s5.pa.run.${step}` as Key))}</h3>
                <p>{step === "network" ? t("s5.pa.runLeadNet") : t("s5.pa.runLead")}</p>
              </div>
            ) : (
              <div>
                <span className="lbl">{t("s5.pa.checks")}</span>
                <h3>{lines(t("s5.pa.startTitle"))}</h3>
                <p>{t("s5.pa.startLead")}</p>
              </div>
            )}
            <div className="gb">
              {step ? (
                <button type="button" className="btn lg" onClick={() => stop.current?.abort()}>
                  <I n="x" />
                  {t("s5.pa.stop")}
                </button>
              ) : (
                <button type="button" className="btn red lg" onClick={() => void run()}>
                  <I n="activity" />
                  {t("pa.start")}
                </button>
              )}
              <span className="sub">{step ? t("s5.pa.stopSub") : t("s5.pa.startSub")}</span>
            </div>
          </div>
          <ol className="panel steps">
            {STEPS.map((s, i) => {
              const state = !step ? "" : i < at ? "done" : i === at ? "now" : "";
              const live = state === "now" && progress && (s === "network" || s === "system") ? progress : null;
              return (
                <li key={s} className={state}>
                  <i className="n">{i + 1}</i>
                  <div>
                    <b>{t(`s5.pa.sn.${s}` as Key)}</b>
                    <small>{t(`s5.pa.sd.${s}` as Key)}</small>
                    {live && (
                      <div className="pg" aria-hidden="true">
                        {Array.from({ length: live[1] }, (_, k) => (
                          <i key={k} className={k < live[0] ? "f" : undefined} />
                        ))}
                      </div>
                    )}
                  </div>
                  {step &&
                    (state === "done" ? (
                      <span className="st">
                        <I n="check" />
                        {t("s5.pa.done")}
                      </span>
                    ) : state === "now" ? (
                      <span className="st">
                        {live ? t(s === "network" ? "s5.pa.pings" : "s5.pa.secs", { done: live[0], n: live[1] }) : <I n="loader" className="spin" />}
                      </span>
                    ) : (
                      <span className="st">{t("s5.pa.next")}</span>
                    ))}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <>
          {compare.length > 0 && store.before && store.after && (
            <section className="ba">
              <div className="sh">
                <h2 className="h2 tape">{t("pa.beforeAfter")}</h2>
                <span className="cnt">
                  {dayMonth(lang, store.before.at).toLowerCase()}
                  <small> → {sameDay(store.after.at, Date.now()) ? t("s5.pa.todayShort") : dayMonth(lang, store.after.at).toLowerCase()}</small>
                </span>
              </div>
              <div className="bagrid">
                {compare.map((d) => (
                  <div key={d.id} className={`bc${d.better ? "" : " worse"}`}>
                    <span className="k">{t(`pa.${d.id}` as Key)}</span>
                    <div className="n">
                      <s>{d.before}</s>
                      <I n="right" />
                      <b>
                        {d.after}
                        {UNITS[d.id] && <small>{UNITS[d.id]}</small>}
                      </b>
                    </div>
                    <span className="d">{gap(d)}</span>
                  </div>
                ))}
              </div>
              {(store.after.fps == null || store.after.fps === store.before.fps) && <p className="note">{t("pa.fpsLater")}</p>}
            </section>
          )}

          {issues.length === 0 ? (
            <div className="panel okbar">
              <span className="ck">
                <I n="check" />
              </span>
              <div className="n">
                <b>
                  {list.length}
                  <small>/ {list.length}</small>
                </b>
                <span>{t("s5.pa.within")}</span>
              </div>
              <p className="lead">
                <span>
                  <b>{t("s5.pa.fineB")}</b>{" "}
                  {store.changed ? t("pa.changed") : t("s5.pa.fineT")}
                </span>
              </p>
              {again("btn lg")}
            </div>
          ) : (
            <div className="split">
              <div className={`sc free${nFree ? "" : " zero"}`}>
                <b>{nFree}</b>
                <span>{t("s5.pa.byFree")}</span>
              </div>
              <div className={`sc prem${nPrem ? "" : " zero"}`}>
                <b>{nPrem}</b>
                <span>{t("s5.pa.byPrem")}</span>
              </div>
              <div className={`sc diy${nDiy ? "" : " zero"}`}>
                <b>{nDiy}</b>
                <span>{t("s5.pa.byYou")}</span>
              </div>
              <div className="acts">
                <p className="lead">
                  <b>{t("pa.found", { n: issues.length })}</b> {store.changed ? t("pa.changed") : `${parts.join(", ")}${t("s5.pa.how")}`}
                </p>
                {(red || upsell || againInRow) && (
                  <div className="row">
                    {red}
                    {upsell}
                    {againInRow && again("lnk")}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="groups">
            {GROUPS.map((g) => {
              const rows = list.filter((f) => f.group === g);
              if (!rows.length) return null;
              return (
                <section key={g} className="grp">
                  <div className="sh">
                    <h2 className="h2 tape">{t(`pa.group.${g}` as Key)}</h2>
                    <span className="cnt">
                      {rows.filter((f) => f.issue).length}
                      <small>{t("s5.pa.cnt", { n: rows.length })}</small>
                    </span>
                  </div>
                  <div className="panel rows">
                    {rows.map((f) => (
                      <div key={f.id} className={`r${f.issue ? " iss" : ""}`}>
                        <div className="l">
                          <b>{t(`pa.${f.id}` as Key)}</b>
                          <span>{norm(f)}</span>
                          {how(f) && (
                            <span className="how">
                              <I n="right" />
                              {how(f)}
                            </span>
                          )}
                        </div>
                        {value(f)}
                        {badge(f)}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mfoot">
            {measured(current.at)}
            {!againInRow && issues.length > 0 && !store.changed && (
              <button type="button" onClick={() => void run()}>
                <u>{t("pa.again")}</u>
              </button>
            )}
            <button type="button" onClick={startOver}>
              <u>{t("pa.reset")}</u>
            </button>
          </p>
        </>
      )}
    </div>
  );
}
