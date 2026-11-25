// Page Outils, à l'identique de la maquette v5 app-tools.html : en-tête (place à libérer), « en un clic » (cache de la
// RAM, cache DNS, mode d'alimentation, test réseau), nettoyage, applis au démarrage, applis préinstallées, réglages de
// Windows, pilotes, puis les actions à lancer de tous les onglets. Styles : s5/pages/module.css (socle commun) et
// s5/pages/tools.css (porté de rendus-v5/src/tools.css), retouches dans s5/app.css.
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  api, type BloatApp, type CleanArea, type CleanAreaId, type CleanResult, type Driver, type DriversInfo, type PowerPlan, type StartupApp,
  type WindowsPanel,
} from "../lib/api";
import { catalog, distinctKey, sectionTweaks, type Tweak } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { markSeen } from "../lib/seen";
import { useStore } from "../lib/store";
import { TweakRow } from "../components/TweakRow";
import { I } from "../s5/I";
import { dayMonth } from "../s5/text";
import { Sw } from "../s5/ui";

/** Les neuf zones du nettoyage, dans l'ordre de tools.rs (et de la maquette). */
const AREAS: CleanAreaId[] = ["temp", "windows_temp", "update", "crash", "browsers", "discord", "launchers", "shaders", "recycle"];
/** Cochées d'office : tout sauf les shaders (saccades au premier lancement des jeux) et la corbeille. */
const AREA_DEFAULT: CleanAreaId[] = ["temp", "windows_temp", "update", "crash", "browsers", "discord", "launchers"];
/** Applis qu'on peut vraiment utiliser : décochées d'office. */
const APP_KEEP = new Set(["MSTeams", "MicrosoftTeams", "Microsoft.OutlookForWindows", "microsoft.windowscommunicationsapps", "Microsoft.MicrosoftOfficeHub", "Microsoft.YourPhone", "SpotifyAB.SpotifyMusic", "Microsoft.Todos"]);

/** Site officiel des pilotes d'après le fournisseur ; Realtek et les autres : le site du fabricant de la carte mère. */
const VENDORS: [RegExp, string][] = [
  [/nvidia/i, "https://www.nvidia.com/Download/index.aspx"],
  [/\bamd\b|advanced micro|\bati\b|radeon/i, "https://www.amd.com/en/support/download/drivers.html"],
  [/intel|killer/i, "https://www.intel.com/content/www/us/en/support/detect.html"],
];
/** Fabricant de la carte mère : son site de pilotes et son nom court (Windows écrit « ASUSTeK COMPUTER INC. »). */
const MAKERS: [RegExp, string, string][] = [
  [/asus/i, "https://www.asus.com/support/download-center/", "ASUS"],
  [/micro-star|\bmsi\b/i, "https://www.msi.com/support/download", "MSI"],
  [/gigabyte|aorus/i, "https://www.gigabyte.com/Support", "Gigabyte"],
  [/asrock/i, "https://www.asrock.com/support/index.asp", "ASRock"],
  [/lenovo/i, "https://pcsupport.lenovo.com/", "Lenovo"],
  [/\bhp\b|hewlett/i, "https://support.hp.com/drivers", "HP"],
  [/dell|alienware/i, "https://www.dell.com/support/home/", "Dell"],
  [/acer|predator/i, "https://www.acer.com/support", "Acer"],
  [/razer/i, "https://mysupport.razer.com/", "Razer"],
  [/samsung/i, "https://www.samsung.com/support/", "Samsung"],
  [/microsoft/i, "https://support.microsoft.com/surface", "Microsoft"],
];
const linkFor = (re: [RegExp, string, ...string[]][], s: string | null | undefined) => (s ? re.find(([r]) => r.test(s))?.[1] : undefined);

/** Badge « Nouveau » de la barre latérale tant que la page Outils n'a pas été rouverte depuis l'arrivée des outils réunis
 * (Sidebar.tsx). */
export const TOOLS_SEEN = "tools.v2";

/** Taille en deux morceaux, comme la maquette (« 7.3 » + « GB », « 412 » + « MB ») ; Go et Mo en français. */
function useSize() {
  const { lang } = useStore();
  return useCallback(
    (bytes: number) => {
      const loc = lang === "fr" ? "fr-FR" : "en-US";
      const gb = bytes / 1024 ** 3;
      if (gb >= 1) return { n: gb.toLocaleString(loc, { maximumFractionDigits: 1 }), u: lang === "fr" ? "Go" : "GB" };
      const mb = bytes / 1024 ** 2;
      return { n: Math.max(mb < 1 && bytes > 0 ? 1 : 0, Math.round(mb)).toLocaleString(loc), u: lang === "fr" ? "Mo" : "MB" };
    },
    [lang],
  );
}

/** Case ou ligne qu'on coche au clavier comme à la souris (espace ou entrée). */
const keyToggle = (go: () => void) => (e: KeyboardEvent) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    go();
  }
};

export function Tools() {
  const { t } = useStore();
  useEffect(() => markSeen(TOOLS_SEEN), []);
  const size = useSize();

  // nettoyage : partagé avec l'en-tête (place à libérer, une coche par zone)
  const [areas, setAreas] = useState<CleanArea[] | null>(null);
  const [picked, setPicked] = useState<Set<CleanAreaId>>(new Set(AREA_DEFAULT));
  const [busy, setBusy] = useState<"scan" | "clean" | null>("scan");
  const [done, setDone] = useState<CleanResult | null>(null);
  const scan = useCallback(async () => {
    setBusy("scan");
    try {
      setAreas(await api.toolsScan());
    } finally {
      setBusy(null);
    }
  }, []);
  useEffect(() => {
    void scan();
  }, [scan]);
  const chosen = (areas ?? []).filter((a) => picked.has(a.id) && a.bytes > 0);
  const total = chosen.reduce((n, a) => n + a.bytes, 0);
  const all = (areas ?? []).reduce((n, a) => n + a.bytes, 0);
  const clean = async () => {
    setBusy("clean");
    setDone(null);
    try {
      setDone(await api.toolsClean(chosen.map((a) => a.id)));
      setAreas(await api.toolsScan());
    } finally {
      setBusy(null);
    }
  };

  const title = t("tools.title").toLowerCase();
  const tot = size(total);
  const sum = size(all);
  return (
    <div className="pg-mod pg-tools is-page">
      <section className="head">
        <div>
          <p className="kick">
            {t("tools.overline").toLowerCase()} <b>//</b> {t("s5.tl.kick")}
          </p>
          <h1 className="title" data-t={title} style={{ fontSize: title.length <= 8 ? 150 : Math.floor((150 * 8.4) / title.length) }}>
            {title}
          </h1>
        </div>
        <div className="ping sig">
          <div className="pv">
            <b>{areas ? tot.n : "–"}</b>
            <span>
              {tot.u.toLowerCase()}
              <small>{areas ? t("s5.tl.toFree", { all: sum.u === tot.u ? sum.n : `${sum.n} ${sum.u.toLowerCase()}` }) : t("tools.scanning")}</small>
            </span>
          </div>
          <div className="ticks">
            <span className="g" style={{ "--n": AREAS.length } as CSSProperties}>
              {(areas ?? AREAS.map((id) => ({ id, bytes: 0 }))).map((a) => (
                <i key={a.id} className={picked.has(a.id) && a.bytes > 0 ? "on" : undefined} />
              ))}
            </span>
          </div>
        </div>
      </section>
      <div className="nobar" />

      <QuickTools />

      <div className="cols blockh">
        <section>
          <div className="sh">
            <h2 className="h2 tape">{t("tools.clean.title")}</h2>
            {areas && (
              <span className="cnt">
                {tot.n}
                <small>
                  {tot.u !== sum.u && ` ${tot.u.toLowerCase()}`} / {sum.n} {sum.u.toLowerCase()}
                </small>
              </span>
            )}
            <button type="button" className="lnk2 fold" disabled={!!busy} onClick={() => void scan()}>
              {t("tools.rescan")}
              <I n={busy === "scan" ? "loader" : "refresh"} className={busy === "scan" ? "spin" : undefined} />
            </button>
          </div>
          <div className="panel lst">
            {(areas ?? AREAS.map((id) => ({ id, bytes: -1, files: 0 }))).map((a) => {
              const off = !picked.has(a.id) || a.bytes <= 0;
              const can = a.bytes > 0 && !busy;
              const flip = () =>
                can &&
                setPicked((s) => {
                  const n = new Set(s);
                  if (n.has(a.id)) n.delete(a.id);
                  else n.add(a.id);
                  return n;
                });
              const sz = size(Math.max(0, a.bytes));
              return (
                <div
                  key={a.id}
                  className={`li${off ? " off" : ""}`}
                  role="checkbox"
                  aria-checked={!off}
                  aria-disabled={!can}
                  tabIndex={can ? 0 : -1}
                  onClick={flip}
                  onKeyDown={keyToggle(flip)}
                >
                  <i className={`cb${off ? "" : " on"}`} />
                  <div className="l">
                    <b>{t(`tools.area.${a.id}` as Key)}</b>
                    <span>{t(`tools.area.${a.id}.hint` as Key)}</span>
                  </div>
                  <span className="sz">
                    {a.bytes < 0 ? "…" : sz.n}
                    {a.bytes >= 0 && <small>{sz.u}</small>}
                  </span>
                </div>
              );
            })}
            <div className="pf">
              {done ? (
                <span className="sub ok">
                  <I n="check" />
                  {t("tools.clean.done", { size: `${size(done.bytes).n} ${size(done.bytes).u}` })}
                  {done.skipped > 0 && ` ${t("tools.clean.skipped", { n: done.skipped })}`}
                </span>
              ) : (
                <span className="sub">{t("tools.clean.note")}</span>
              )}
              <button type="button" className="btn red" disabled={!!busy || total === 0} onClick={() => void clean()}>
                <I n={busy === "clean" ? "loader" : "trash"} className={busy === "clean" ? "spin" : undefined} />
                {busy === "clean" ? t("tools.clean.running") : t("tools.clean.go", { size: areas ? `${tot.n} ${tot.u.toLowerCase()}` : "…" })}
              </button>
            </div>
          </div>
        </section>
        <Startup />
        <Apps />
        <Panels />
      </div>

      <Drivers />
      <AllTools />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------- en un clic

type Status = { tone: "ok" | "muted" | "bad"; text: string } | null;

function StatusLine({ s }: { s: Status }) {
  if (!s) return <span />;
  return (
    <span className={`ok${s.tone === "ok" ? "" : ` ${s.tone}`}`} aria-live="polite">
      {s.tone === "ok" && <I n="check" />}
      {s.text}
    </span>
  );
}

/** Outils immédiats : cache de la RAM (memory.rs, comme « Nettoyer » du tableau de bord), cache DNS, mode
 * d'alimentation et test réseau. */
function QuickTools() {
  const { t, lang, cleanTrim, goTo } = useStore();
  const gb = (bytes: number) => (bytes / 1024 ** 3).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 });

  const [ramBusy, setRamBusy] = useState(false);
  const [ram, setRam] = useState<Status>(null);
  const cleanRam = async () => {
    setRamBusy(true);
    setRam(null);
    try {
      const c = await api.cleanRam(cleanTrim);
      // moins de 50 Mo : rien à annoncer, comme sur le tableau de bord
      const freed = (c.standby >= 50 * 1024 ** 2 ? c.standby : 0) + (c.apps > 0 ? c.trimmed : 0);
      setRam(freed > 0 ? { tone: "ok", text: t("s5.tl.freed", { n: gb(freed) }) } : { tone: "muted", text: t("live.cleanedEmpty") });
    } catch {
      setRam({ tone: "bad", text: t("live.cleanFailed") });
    } finally {
      setRamBusy(false);
    }
  };

  const [dnsBusy, setDnsBusy] = useState(false);
  const [dns, setDns] = useState<Status>(null);
  const flushDns = async () => {
    setDnsBusy(true);
    setDns(null);
    try {
      await api.toolsFlushDns();
      setDns({ tone: "ok", text: t("tools.dns.done") });
    } catch {
      setDns({ tone: "bad", text: t("tools.dns.failed") });
    } finally {
      setDnsBusy(false);
    }
  };

  const [plans, setPlans] = useState<PowerPlan[] | null>(null);
  const [planBusy, setPlanBusy] = useState<string | null>(null);
  const [planErr, setPlanErr] = useState(false);
  useEffect(() => {
    let live = true;
    void api.toolsPowerPlans().then(
      (p) => live && setPlans(p),
      () => live && setPlans([]),
    );
    return () => {
      live = false;
    };
  }, []);
  const choosePlan = async (p: PowerPlan) => {
    if (p.active || planBusy) return;
    setPlanBusy(p.guid);
    setPlanErr(false);
    try {
      setPlans(await api.toolsSetPowerPlan(p.guid));
    } catch {
      setPlanErr(true);
      void api.toolsPowerPlans().then(setPlans, () => undefined);
    } finally {
      setPlanBusy(null);
    }
  };

  const run = (busy: boolean, label: string, onClick: () => void) => (
    <button type="button" className="run" disabled={busy} onClick={onClick}>
      <I n={busy ? "loader" : "play"} className={busy ? "spin" : undefined} />
      {label}
    </button>
  );

  return (
    <section>
      <div className="sh">
        <h2 className="h2 tape">{t("tools.quick.title")}</h2>
      </div>
      <div className="quick">
        <div className={`panel qt${ram?.tone === "ok" ? " done" : ""}`}>
          <span className="qi">
            <I n="ram" />
          </span>
          <h3>{t("tools.ram.title")}</h3>
          <p>{t("tools.ram.desc")}</p>
          <div className="qf">
            <StatusLine s={ram} />
            {run(ramBusy, t("tools.ram.go"), () => void cleanRam())}
          </div>
        </div>
        <div className={`panel qt${dns?.tone === "ok" ? " done" : ""}`}>
          <span className="qi">
            <I n="globe" />
          </span>
          <h3>{t("tools.dns.title")}</h3>
          <p>{t("tools.dns.desc")}</p>
          <div className="qf">
            <StatusLine s={dns} />
            {run(dnsBusy, t("tools.dns.go"), () => void flushDns())}
          </div>
        </div>
        <div className="panel qt">
          <span className="qi">
            <I n="battery" />
          </span>
          <h3>{t("tools.power.title")}</h3>
          {!plans || plans.length === 0 ? (
            <p>{plans ? t("tools.power.none") : t("tools.power.loading")}</p>
          ) : (
            <div className="plans" role="radiogroup" aria-label={t("tools.power.title")}>
              {plans.map((p) => {
                const go = () => void choosePlan(p);
                return (
                  <span
                    key={p.guid}
                    role="radio"
                    aria-checked={p.active}
                    aria-disabled={!!planBusy}
                    tabIndex={0}
                    className={p.active ? "on" : undefined}
                    onClick={go}
                    onKeyDown={keyToggle(go)}
                  >
                    {planBusy === p.guid ? <I n="loader" className="spin" /> : <i />}
                    {/* mode sans nom dans Windows : le moteur renvoie son GUID, montré en court (25/11) */}
                    {p.name.toLowerCase() === p.guid.toLowerCase() ? t("s5.tl.planUnnamed", { id: p.guid.slice(0, 8).toUpperCase() }) : p.name}
                  </span>
                );
              })}
            </div>
          )}
          <div className="qf">
            <span className={`ok ${planErr ? "bad" : "muted"}`} aria-live="polite">
              {planErr ? t("tools.power.failed") : t("s5.tl.powerNote")}
            </span>
          </div>
        </div>
        <div className="panel qt">
          <span className="qi">
            <I n="activity" />
          </span>
          <h3>{t("tools.net.title")}</h3>
          <p>{t("tools.net.desc")}</p>
          <div className="qf">
            <span />
            <button type="button" className="run" onClick={() => goTo("nettest")}>
              <I n="upright" />
              {t("tools.net.go")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- démarrage

/** Ligne d'attente ou de liste vide dans un panneau. */
function Wait({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <div className="li wait">
      <I n={ok ? "check" : "loader"} className={ok ? undefined : "spin"} />
      <div className="l">
        <span>{text}</span>
      </div>
    </div>
  );
}

/** Programmes lancés avec Windows (tools.rs) : couper un programme écrit le même état que le Gestionnaire des tâches. */
function Startup() {
  const { t } = useStore();
  const [apps, setApps] = useState<StartupApp[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void api.toolsStartup().then(
      (list) => live && setApps(list),
      () => live && setApps([]),
    );
    return () => {
      live = false;
    };
  }, []);

  const on = (apps ?? []).filter((a) => a.enabled).length;

  const set = async (a: StartupApp, enabled: boolean) => {
    setBusy(a.id);
    setError(null);
    try {
      setApps(await api.toolsSetStartup(a.id, enabled));
    } catch {
      setError(t("tools.startup.failed", { name: a.name }));
    } finally {
      setBusy(null);
    }
  };

  return (
    // « fit » (25/11) : à la hauteur de « nettoyage » à côté, la liste défile dedans (pas de vide sous le nettoyage)
    <section className="fit">
      <div className="sh">
        <h2 className="h2 tape">{t("tools.startup.title")}</h2>
        {apps && apps.length > 0 && (
          <span className="cnt">
            {on}
            <small>{t("s5.tl.startCnt", { n: apps.length })}</small>
          </span>
        )}
      </div>
      <p className="lead2">{t("tools.startup.lead")}</p>
      <div className="panel lst">
        {!apps ? (
          <Wait text={t("tools.startup.loading")} />
        ) : apps.length === 0 ? (
          <Wait ok text={t("tools.startup.none")} />
        ) : (
          // ordre alphabétique de tools.rs, comme la maquette : une ligne ne bouge pas quand on la coupe
          apps.map((a) => (
            <div key={a.id} className={`li${a.enabled ? "" : " off"}`} title={a.command}>
              <div className="l">
                <b>{a.name}</b>
                <span>{[a.publisher, a.scope === "machine" ? t("tools.startup.machine") : null].filter(Boolean).join(" · ")}</span>
              </div>
              {a.keep && (
                <span className="keep" title={t("tools.startup.keep")}>
                  <I n="lock" />
                  {t("s5.tl.kept")}
                </span>
              )}
              <Sw on={a.enabled} label={a.name} disabled={!!busy || (a.keep && a.enabled)} onChange={(v) => void set(a, v)} />
            </div>
          ))
        )}
        <div className="pf">
          <span className={`sub${error ? " bad" : ""}`} style={{ maxWidth: "none" }} aria-live="polite">
            {error ?? t("s5.tl.startNote")}
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- applis préinstallées

function Apps() {
  const { t, lang } = useStore();
  const [apps, setApps] = useState<BloatApp[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let live = true;
    void api.toolsApps().then(
      (list) => {
        if (!live) return;
        setApps(list);
        setPicked(new Set(list.filter((a) => !APP_KEEP.has(a.id)).map((a) => a.id)));
      },
      () => live && setApps([]),
    );
    return () => {
      live = false;
    };
  }, []);

  const chosen = (apps ?? []).filter((a) => picked.has(a.id));
  const remove = async () => {
    setAsking(false);
    setBusy(true);
    try {
      const before = apps?.length ?? 0;
      const left = await api.toolsRemoveApps(chosen.map((a) => a.id));
      setApps(left);
      setRemoved(before - left.length);
      setPicked((s) => new Set([...s].filter((id) => left.some((a) => a.id === id))));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="wide">
      <div className="sh">
        <h2 className="h2 tape">{t("tools.apps.title")}</h2>
        {apps && apps.length > 0 && (
          <span className="cnt">
            {apps.length}
            <small>{t("s5.tl.found", { n: apps.length })}</small>
          </span>
        )}
      </div>
      <p className="lead2">{t("tools.apps.lead")}</p>
      <div className="panel lst">
        {!apps ? (
          <Wait text={t("tools.apps.loading")} />
        ) : apps.length === 0 ? (
          <Wait ok text={removed ? t("tools.apps.removedAll") : t("tools.apps.none")} />
        ) : (
          <div className="bgrid">
            {apps.map((a) => {
              const on = picked.has(a.id);
              const flip = () =>
                !busy &&
                setPicked((s) => {
                  const n = new Set(s);
                  if (n.has(a.id)) n.delete(a.id);
                  else n.add(a.id);
                  return n;
                });
              return (
                <span
                  key={a.id}
                  className={`bl${on ? "" : " off"}`}
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={busy}
                  tabIndex={0}
                  onClick={flip}
                  onKeyDown={keyToggle(flip)}
                >
                  <i className={`cb${on ? " on" : ""}`} />
                  {a.name[lang]}
                </span>
              );
            })}
          </div>
        )}
        <div className="pf">
          <span className="sub">{removed ? t("tools.apps.removed", { n: removed }) : t("tools.apps.note")}</span>
          {apps && apps.length > 0 &&
            (asking ? (
              <span className="ask">
                <button type="button" className="btn" onClick={() => setAsking(false)}>
                  {t("tools.cancel")}
                </button>
                <button type="button" className="btn red" onClick={() => void remove()}>
                  <I n="trash" />
                  {t("tools.apps.confirm", { n: chosen.length })}
                </button>
              </span>
            ) : (
              <button type="button" className="btn" disabled={busy || chosen.length === 0} onClick={() => setAsking(true)}>
                <I n={busy ? "loader" : "trash"} className={busy ? "spin" : undefined} />
                {busy ? t("tools.apps.running") : t("tools.apps.go", { n: chosen.length })}
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- réglages Windows

const PANELS: { id: WindowsPanel; icon: string }[] = [
  { id: "graphics", icon: "gpu" },
  { id: "display", icon: "monitor" },
  { id: "gamemode", icon: "pad" },
  { id: "sound", icon: "volume" },
  { id: "mouse", icon: "mouse" },
  { id: "network", icon: "wifi" },
  { id: "power", icon: "power" },
  { id: "devices", icon: "board" },
  { id: "visual", icon: "sparkles" },
  { id: "taskmgr", icon: "list" },
];

function Panels() {
  const { t } = useStore();
  return (
    // toute la largeur (25/11) : les dix raccourcis sur une ou deux lignes, sans voisine à attendre
    <section className="wide">
      <div className="sh">
        <h2 className="h2 tape">{t("s5.tl.panels")}</h2>
        <span className="cnt">{PANELS.length}</span>
      </div>
      <p className="lead2">{t("tools.panels.lead")}</p>
      <div className="panel lst">
        <div className="pgrid2">
          {PANELS.map((p) => (
            <button key={p.id} type="button" className="pn" onClick={() => void api.toolsOpen(p.id).catch(() => undefined)}>
              <span className="pi">
                <I n={p.icon} />
              </span>
              <div className="l">
                <b>{t(`tools.panel.${p.id}` as Key)}</b>
                <span>{t(`tools.panel.${p.id}.hint` as Key)}</span>
              </div>
              <I n="upright" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- pilotes

function Drivers() {
  const { t, lang } = useStore();
  const [info, setInfo] = useState<DriversInfo | null>(null);
  useEffect(() => {
    let live = true;
    void api.toolsDrivers().then(
      (d) => live && setInfo(d),
      () => live && setInfo({ drivers: [], maker: null, model: null }),
    );
    return () => {
      live = false;
    };
  }, []);

  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  /** Âge d'un pilote comme la maquette : « 38 days », « 3 years » (jours jusqu'à 2 mois, puis mois, puis années). */
  const age = useCallback(
    (date: string) => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000));
      const months = Math.round(days / 30.44);
      const [n, unit] = days < 60 ? [days, "day"] : months < 24 ? [months, "month"] : [Math.floor(months / 12), "year"];
      return { months, label: new Intl.NumberFormat(loc, { style: "unit", unit, unitDisplay: "long" }).format(n) };
    },
    [loc],
  );
  const fmt = (date: string) => dayMonth(lang, new Date(`${date}T12:00:00`).getTime(), true);
  const makerUrl = linkFor(MAKERS, info?.maker);
  const rows = (info?.drivers ?? []).map((d: Driver) => {
    const a = d.date ? age(d.date) : null;
    // carte graphique : un pilote de plus de 6 mois rate souvent des correctifs pour les jeux récents
    const old = a != null && a.months > (d.kind === "gpu" ? 6 : 24);
    const vendor = linkFor(VENDORS, `${d.provider} ${d.name}`);
    return { d, a, old, url: vendor ?? makerUrl, official: !!vendor };
  });
  const site = (url: string, official: boolean) => (
    <button type="button" className="site" onClick={() => void api.openUrl(url)}>
      <I n="external" />
      {t(official ? "tools.drivers.site" : "tools.drivers.makerSite")}
    </button>
  );

  return (
    <section className="blockh drv2">
      <div className="sh">
        <h2 className="h2 tape">{t("tools.drivers.title")}</h2>
        {info && rows.length > 0 && (
          <span className="cnt">
            {rows.filter((r) => r.old).length}
            <small>{t("s5.tl.drvCnt", { n: rows.length })}</small>
          </span>
        )}
        <button type="button" className="btn sm" onClick={() => void api.toolsWindowsUpdate()}>
          <I n="external" />
          {t("tools.drivers.optional")}
        </button>
      </div>
      <div className="panel lst">
        {!info ? (
          <Wait text={t("tools.drivers.loading")} />
        ) : (
          <>
            {rows.map(({ d, a, old, url, official }) => (
              <div key={d.name} className="li">
                <span className="k">{t(`tools.drivers.kind.${d.kind}` as Key)}</span>
                <div className="l">
                  <b>{d.name}</b>
                  <span>{[d.version, d.date ? fmt(d.date) : null].filter(Boolean).join(" · ")}</span>
                </div>
                {a && (
                  <span className={`age ${old ? "old" : "new"}`}>
                    <i />
                    {a.label}
                  </span>
                )}
                {url && site(url, official)}
              </div>
            ))}
            {info.maker && (
              <div className="li">
                <span className="k">{t("s5.tl.board")}</span>
                <div className="l">
                  <b>{[MAKERS.find(([r]) => r.test(info.maker!))?.[2] ?? info.maker, info.model].filter(Boolean).join(" ")}</b>
                  <span>{t("tools.drivers.board")}</span>
                </div>
                {makerUrl && site(makerUrl, false)}
              </div>
            )}
          </>
        )}
        <div className="pf">
          <span className="sub" style={{ maxWidth: "none" }}>
            {t("tools.drivers.note")}
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- tous les outils

/** Les réglages à bouton « run » (kind « action ») de tous les onglets, chacun une seule fois (deux jumeaux, même
 * script sous deux noms, ne comptent qu'une fois : le premier du catalogue) : même carreau, même verrou Premium et même
 * lancement que dans leur onglet, où ils restent. */
function AllTools() {
  const { t, lang, goTo } = useStore();
  const groups = useMemo(() => {
    const seen = new Set<string>();
    return catalog.modules
      .map((m) => {
        const list: Tweak[] = [];
        for (const tw of m.sections.flatMap((s) => sectionTweaks(s))) {
          if (tw.kind !== "action" || seen.has(distinctKey(tw.id))) continue;
          seen.add(distinctKey(tw.id));
          list.push(tw);
        }
        return { m, list };
      })
      .filter((g) => g.list.length > 0);
  }, []);

  return (
    <>
      <div className="allh">
        <div className="sh" style={{ margin: 0 }}>
          <h2 className="h2 tape">{t("tools.all.title")}</h2>
          <span className="cnt">{groups.reduce((n, g) => n + g.list.length, 0)}</span>
        </div>
        <p>{t("tools.all.lead")}</p>
      </div>
      {groups.map(({ m, list }) => (
        <div key={m.id} className="agrp">
          <div className="gh">
            <b>{m.name[lang]}</b>
            <em>{list.length}</em>
            <button type="button" className="go2" onClick={() => goTo(m.id)}>
              {t("s5.tl.open", { name: m.name[lang] })}
              <I n="right" />
            </button>
          </div>
          <div className="tgrid">
            {list.map((tw) => (
              <TweakRow key={tw.id} tweak={tw} adv={tw.risk === "advanced"} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
