import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AppWindow, ArrowRight, ArrowUpRight, AudioLines, BatteryCharging, Check, CircuitBoard, Clock, Download, FileWarning, Gamepad2, Gauge, Globe,
  Gpu, Layers, ListTree, LoaderCircle, Lock, MemoryStick, Monitor, MonitorCog, Mouse, Network, PackageX, Power, RefreshCw, Sparkles, Trash2,
  Volume2, Wifi, Wrench,
} from "lucide-react";
import {
  api, type BloatApp, type CleanArea, type CleanAreaId, type CleanResult, type Driver, type DriversInfo, type PowerPlan, type StartupApp,
  type WindowsPanel,
} from "../lib/api";
import { catalog, distinctKey, sectionTweaks, type Tweak } from "../lib/catalog";
import { markSeen } from "../lib/seen";
import { useStore } from "../lib/store";
import { Button, Switch } from "../components/ui";
import { DiscordIcon } from "../components/icons";
import { TweakRow } from "../components/TweakRow";
import { formatNumber, type Key } from "../lib/i18n";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const AREA_ICONS: Record<CleanAreaId, ReactNode> = {
  temp: <Clock size={15} />,
  windows_temp: <Wrench size={15} />,
  update: <Download size={15} />,
  crash: <FileWarning size={15} />,
  browsers: <Globe size={15} />,
  discord: <DiscordIcon size={15} />,
  launchers: <Gamepad2 size={15} />,
  shaders: <Layers size={15} />,
  recycle: <Trash2 size={15} />,
};
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
const MAKERS: [RegExp, string][] = [
  [/asus/i, "https://www.asus.com/support/download-center/"],
  [/micro-star|\bmsi\b/i, "https://www.msi.com/support/download"],
  [/gigabyte|aorus/i, "https://www.gigabyte.com/Support"],
  [/asrock/i, "https://www.asrock.com/support/index.asp"],
  [/lenovo/i, "https://pcsupport.lenovo.com/"],
  [/\bhp\b|hewlett/i, "https://support.hp.com/drivers"],
  [/dell|alienware/i, "https://www.dell.com/support/home/"],
  [/acer|predator/i, "https://www.acer.com/support"],
  [/razer/i, "https://mysupport.razer.com/"],
  [/samsung/i, "https://www.samsung.com/support/"],
  [/microsoft/i, "https://support.microsoft.com/surface"],
];
const linkFor = (re: [RegExp, string][], s: string | null | undefined) => (s ? re.find(([r]) => r.test(s))?.[1] : undefined);

/** Badge « Nouveau » de la barre latérale tant que la page Outils n'a pas été rouverte depuis l'arrivée des outils réunis
 * (Sidebar.tsx). */
export const TOOLS_SEEN = "tools.v2";

export function Tools() {
  const { t } = useStore();
  useEffect(() => markSeen(TOOLS_SEEN), []);
  return (
    <motion.div className="page tools" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("tools.overline")}</div>
        <h1>{t("tools.title")}</h1>
        <p className="lead">{t("tools.lead")}</p>
      </motion.header>
      <QuickTools />
      <div className="tools-grid">
        <Cleaner />
        <Startup />
        <Apps />
        <Panels />
        <Drivers />
      </div>
      <AllTools />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------------- en un clic

type Status = { tone: "ok" | "muted" | "bad"; text: string } | null;

function Tile({
  icon,
  title,
  desc,
  action,
  status,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  action?: ReactNode;
  status?: Status;
  children?: ReactNode;
}) {
  return (
    <motion.section variants={rise} className="card tools-tile">
      <header className="tools-tile-head">
        <span className="tools-tile-icon">{icon}</span>
        <h3>{title}</h3>
      </header>
      <p className="muted small tools-tile-desc">{desc}</p>
      {children}
      <footer className="tools-tile-foot">
        <p className={`small tools-tile-status ${status?.tone ?? "muted"}`} aria-live="polite">
          {status?.tone === "ok" && <Check size={13} />}
          {status?.text}
        </p>
        {action}
      </footer>
    </motion.section>
  );
}

/** Outils immédiats : cache de la RAM (memory.rs, comme « Nettoyer » du tableau de bord), cache DNS, mode
 * d'alimentation et test réseau. */
function QuickTools() {
  const { t, lang, cleanTrim, goTo } = useStore();
  const gb = (bytes: number) => formatNumber(lang, bytes / 1024 ** 3, 1);

  const [ramBusy, setRamBusy] = useState(false);
  const [ram, setRam] = useState<Status>(null);
  const cleanRam = async () => {
    setRamBusy(true);
    setRam(null);
    try {
      const c = await api.cleanRam(cleanTrim);
      // moins de 50 Mo : rien à annoncer, comme sur le tableau de bord
      const parts = [c.standby >= 50 * 1024 ** 2 ? t("live.cleaned", { n: gb(c.standby) }) : t("live.cleanedEmpty")];
      if (c.apps > 0) parts.push(t("live.cleanedApps", { gb: gb(c.trimmed), n: c.apps }));
      setRam({ tone: c.standby >= 50 * 1024 ** 2 || c.apps > 0 ? "ok" : "muted", text: parts.join(" · ") });
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
  const [plan, setPlan] = useState<Status>(null);
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
    setPlan(null);
    try {
      setPlans(await api.toolsSetPowerPlan(p.guid));
    } catch {
      setPlan({ tone: "bad", text: t("tools.power.failed") });
      void api.toolsPowerPlans().then(setPlans, () => undefined);
    } finally {
      setPlanBusy(null);
    }
  };

  const run = (busy: boolean, label: string, onClick: () => void) => (
    <Button size="sm" icon={busy ? <LoaderCircle size={12} className="spin" /> : undefined} disabled={busy} onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <section className="tools-quick-wrap">
      <motion.h2 variants={rise} className="section-title rg-overline">
        {t("tools.quick.title")}
      </motion.h2>
      <div className="tools-quick">
        <Tile icon={<MemoryStick size={16} />} title={t("tools.ram.title")} desc={t("tools.ram.desc")} status={ram} action={run(ramBusy, t("tools.ram.go"), () => void cleanRam())} />
        <Tile icon={<Globe size={16} />} title={t("tools.dns.title")} desc={t("tools.dns.desc")} status={dns} action={run(dnsBusy, t("tools.dns.go"), () => void flushDns())} />
        <Tile icon={<BatteryCharging size={16} />} title={t("tools.power.title")} desc={t("tools.power.desc")} status={plan}>
          {!plans ? (
            <p className="tools-wait muted small">
              <LoaderCircle size={14} className="spin" /> {t("tools.power.loading")}
            </p>
          ) : plans.length === 0 ? (
            <p className="muted small">{t("tools.power.none")}</p>
          ) : (
            <ul className="tools-plans" role="radiogroup" aria-label={t("tools.power.title")}>
              {plans.map((p) => (
                <li key={p.guid}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={p.active}
                    className={`tools-plan${p.active ? " active" : ""}`}
                    disabled={!!planBusy}
                    onClick={() => void choosePlan(p)}
                  >
                    <span className="tools-plan-dot">{planBusy === p.guid ? <LoaderCircle size={11} className="spin" /> : p.active && <Check size={11} />}</span>
                    <span className="tools-plan-name">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tile>
        <Tile
          icon={<Gauge size={16} />}
          title={t("tools.net.title")}
          desc={t("tools.net.desc")}
          action={
            <Button size="sm" icon={<ArrowRight size={12} />} onClick={() => goTo("nettest")}>
              {t("tools.net.go")}
            </Button>
          }
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------- démarrage

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

  // ordre alphabétique (tools.rs), ceux qu'on garde à la fin : une ligne ne saute pas quand on la coupe
  const list = useMemo(() => [...(apps ?? [])].sort((a, b) => Number(a.keep) - Number(b.keep)), [apps]);
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
    <motion.section variants={rise} className="card tools-card tools-startup">
      <header className="card-head">
        <h3 className="rg-overline">{t("tools.startup.title")}</h3>
        {apps && apps.length > 0 && <span className="rg-metric muted small">{t("tools.startup.count", { on, n: apps.length })}</span>}
      </header>
      <p className="muted small tools-lead">{t("tools.startup.lead")}</p>
      {!apps ? (
        <p className="tools-wait muted small">
          <LoaderCircle size={14} className="spin" /> {t("tools.startup.loading")}
        </p>
      ) : apps.length === 0 ? (
        <div className="tools-empty">
          <span className="tools-empty-icon">
            <Check size={16} />
          </span>
          <span>{t("tools.startup.none")}</span>
        </div>
      ) : (
        <ul className="tools-startup-list">
          {list.map((a) => (
            <li key={a.id} className={`tools-startup-row${a.enabled ? "" : " off"}`} title={a.command}>
              <span className="tools-row-icon">
                <AppWindow size={15} />
              </span>
              <span className="tools-startup-text">
                <span className="tools-row-name">{a.name}</span>
                <small>
                  {a.keep ? (
                    <>
                      <Lock size={10} /> {t("tools.startup.keep")}
                    </>
                  ) : (
                    [a.publisher, a.scope === "machine" ? t("tools.startup.machine") : null].filter(Boolean).join(" · ")
                  )}
                </small>
              </span>
              {busy === a.id ? (
                <LoaderCircle size={14} className="spin muted" />
              ) : (
                <Switch checked={a.enabled} disabled={!!busy || (a.keep && a.enabled)} onChange={(v) => void set(a, v)} label={a.name} />
              )}
            </li>
          ))}
        </ul>
      )}
      <footer className="tools-foot">
        <p className={`small${error ? " tools-error" : " muted"}`} aria-live="polite">
          {error ?? t("tools.startup.note")}
        </p>
      </footer>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------------- réglages Windows

const PANELS: { id: WindowsPanel; icon: ReactNode }[] = [
  { id: "graphics", icon: <MonitorCog size={15} /> },
  { id: "display", icon: <Monitor size={15} /> },
  { id: "gamemode", icon: <Gamepad2 size={15} /> },
  { id: "sound", icon: <Volume2 size={15} /> },
  { id: "mouse", icon: <Mouse size={15} /> },
  { id: "network", icon: <Wifi size={15} /> },
  { id: "power", icon: <Power size={15} /> },
  { id: "devices", icon: <CircuitBoard size={15} /> },
  { id: "visual", icon: <Sparkles size={15} /> },
  { id: "taskmgr", icon: <ListTree size={15} /> },
];

function Panels() {
  const { t } = useStore();
  return (
    <motion.section variants={rise} className="card tools-card tools-panels-card">
      <header className="card-head">
        <h3 className="rg-overline">{t("tools.panels.title")}</h3>
      </header>
      <p className="muted small tools-lead">{t("tools.panels.lead")}</p>
      <ul className="tools-panels">
        {PANELS.map((p) => (
          <li key={p.id}>
            <button type="button" className="tools-panel" onClick={() => void api.toolsOpen(p.id).catch(() => undefined)}>
              <span className="tools-row-icon">{p.icon}</span>
              <span className="tools-panel-text">
                <span className="tools-row-name">{t(`tools.panel.${p.id}` as Key)}</span>
                <small>{t(`tools.panel.${p.id}.hint` as Key)}</small>
              </span>
              <ArrowUpRight size={13} className="tools-panel-go" />
            </button>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------------------------------- tous les outils

/** Les réglages à bouton « Lancer » (kind « action ») de tous les onglets, chacun une seule fois (deux jumeaux, même
 * script sous deux noms, ne comptent qu'une fois : le premier du catalogue) : même ligne, même verrou Premium et même
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
    <motion.section variants={rise} className="tools-all">
      <header className="tools-all-head">
        <h2 className="section-title">
          <Wrench size={15} />
          <span>{t("tools.all.title")}</span>
          <span className="rg-metric muted">{groups.reduce((n, g) => n + g.list.length, 0)}</span>
        </h2>
        <p className="muted small">{t("tools.all.lead")}</p>
      </header>
      {groups.map(({ m, list }) => (
        <section key={m.id} className="tweak-section tools-all-group">
          <h3 className="section-title">
            <span>{m.name[lang]}</span>
            <span className="rg-metric muted">{list.length}</span>
            <button type="button" className="link tools-all-open" onClick={() => goTo(m.id)}>
              {t("tools.all.open", { name: m.name[lang] })}
              <ArrowRight size={12} />
            </button>
          </h3>
          <div className="tweak-list">
            {list.map((tw) => (
              <TweakRow key={tw.id} tweak={tw} />
            ))}
          </div>
        </section>
      ))}
    </motion.section>
  );
}

function useSize() {
  const { lang } = useStore();
  return useCallback(
    (bytes: number) => {
      const gb = bytes / 1024 ** 3;
      const loc = lang === "fr" ? "fr-FR" : "en-US";
      if (gb >= 1) return `${gb.toLocaleString(loc, { maximumFractionDigits: 1 })} ${lang === "fr" ? "Go" : "GB"}`;
      const mb = bytes / 1024 ** 2;
      return `${Math.max(mb < 1 && bytes > 0 ? 1 : 0, Math.round(mb)).toLocaleString(loc)} ${lang === "fr" ? "Mo" : "MB"}`;
    },
    [lang],
  );
}

function Cleaner() {
  const { t } = useStore();
  const size = useSize();
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

  return (
    <motion.section variants={rise} className="card tools-card tools-clean">
      <header className="card-head">
        <h3 className="rg-overline">{t("tools.clean.title")}</h3>
        <Button size="sm" variant="ghost" icon={<RefreshCw size={13} className={busy === "scan" ? "spin" : undefined} />} disabled={!!busy} onClick={() => void scan()}>
          {t("tools.rescan")}
        </Button>
      </header>
      <div className="tools-hero">
        <span className="tools-hero-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <div className="tools-hero-value rg-metric">{areas ? size(total) : "…"}</div>
          <div className="muted small">{areas ? t("tools.clean.selected", { all: size(all) }) : t("tools.scanning")}</div>
        </div>
      </div>
      <ul className="tools-list">
        {(areas ?? AREA_DEFAULT.map((id) => ({ id, bytes: -1, files: 0 }))).map((a) => {
          const empty = a.bytes === 0;
          return (
            <li key={a.id}>
              <label className={`check tools-row${empty ? " empty" : ""}`}>
                <input
                  type="checkbox"
                  checked={picked.has(a.id) && !empty}
                  disabled={empty || a.bytes < 0 || !!busy}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(a.id);
                      else n.delete(a.id);
                      return n;
                    })
                  }
                />
                <span className="tools-row-icon">{AREA_ICONS[a.id]}</span>
                <span className="tools-row-text">
                  <span className="tools-row-name">{t(`tools.area.${a.id}` as Key)}</span>
                  <small>{t(`tools.area.${a.id}.hint` as Key)}</small>
                </span>
                <span className="tools-row-size rg-metric">{a.bytes < 0 ? "…" : empty ? t("tools.clean.nothing") : size(a.bytes)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <footer className="tools-foot">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.p key="done" className="tools-done small" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Check size={13} /> {t("tools.clean.done", { size: size(done.bytes) })}
              {done.skipped > 0 && <span className="muted"> {t("tools.clean.skipped", { n: done.skipped })}</span>}
            </motion.p>
          ) : (
            <motion.p key="note" className="muted small" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {t("tools.clean.note")}
            </motion.p>
          )}
        </AnimatePresence>
        <Button
          variant="primary"
          icon={busy === "clean" ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}
          disabled={!!busy || total === 0}
          onClick={() => void clean()}
        >
          {busy === "clean" ? t("tools.clean.running") : t("tools.clean.go", { size: areas ? size(total) : "…" })}
        </Button>
      </footer>
    </motion.section>
  );
}

function Apps() {
  const { t, lang } = useStore();
  const [apps, setApps] = useState<BloatApp[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let live = true;
    void api.toolsApps().then((list) => {
      if (!live) return;
      setApps(list);
      setPicked(new Set(list.filter((a) => !APP_KEEP.has(a.id)).map((a) => a.id)));
    });
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
    <motion.section variants={rise} className="card tools-card tools-apps">
      <header className="card-head">
        <h3 className="rg-overline">{t("tools.apps.title")}</h3>
        {apps && apps.length > 0 && <span className="rg-metric muted small">{t("tools.apps.found", { n: apps.length })}</span>}
      </header>
      <p className="muted small tools-lead">{t("tools.apps.lead")}</p>
      {!apps ? (
        <p className="tools-wait muted small">
          <LoaderCircle size={14} className="spin" /> {t("tools.apps.loading")}
        </p>
      ) : apps.length === 0 ? (
        <div className="tools-empty">
          <span className="tools-empty-icon">
            <Check size={16} />
          </span>
          <span>{removed ? t("tools.apps.removedAll") : t("tools.apps.none")}</span>
        </div>
      ) : (
        <ul className="tools-apps-list">
          {apps.map((a) => (
            <li key={a.id}>
              <label className="check tools-app">
                <input
                  type="checkbox"
                  checked={picked.has(a.id)}
                  disabled={busy}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(a.id);
                      else n.delete(a.id);
                      return n;
                    })
                  }
                />
                <span className="tools-app-name">{a.name[lang]}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <footer className="tools-foot">
        <p className="muted small">{removed ? t("tools.apps.removed", { n: removed }) : t("tools.apps.note")}</p>
        {apps && apps.length > 0 && (
          <AnimatePresence mode="wait" initial={false}>
            {asking ? (
              <motion.div key="ask" className="tools-ask" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
                  {t("tools.cancel")}
                </Button>
                <Button size="sm" variant="primary" icon={<PackageX size={13} />} onClick={() => void remove()}>
                  {t("tools.apps.confirm", { n: chosen.length })}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  variant="primary"
                  icon={busy ? <LoaderCircle size={14} className="spin" /> : <PackageX size={14} />}
                  disabled={busy || chosen.length === 0}
                  onClick={() => setAsking(true)}
                >
                  {busy ? t("tools.apps.running") : t("tools.apps.go", { n: chosen.length })}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </footer>
    </motion.section>
  );
}

const KIND_ICONS: Record<Driver["kind"], ReactNode> = { gpu: <Gpu size={16} />, network: <Network size={16} />, audio: <AudioLines size={16} /> };

function Drivers() {
  const { t, lang } = useStore();
  const [info, setInfo] = useState<DriversInfo | null>(null);
  useEffect(() => {
    let live = true;
    void api.toolsDrivers().then((d) => live && setInfo(d));
    return () => {
      live = false;
    };
  }, []);

  const loc = lang === "fr" ? "fr-FR" : "en-US";
  const age = useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
    return (date: string) => {
      const months = Math.round((Date.now() - new Date(`${date}T12:00:00`).getTime()) / (30.44 * 86_400_000));
      return { months, label: months < 1 ? rtf.format(0, "month") : months < 24 ? rtf.format(-months, "month") : rtf.format(-Math.floor(months / 12), "year") };
    };
  }, [loc]);
  const makerUrl = linkFor(MAKERS, info?.maker);

  return (
    <motion.section variants={rise} className="card tools-card tools-drivers">
      <header className="card-head">
        <h3 className="rg-overline">{t("tools.drivers.title")}</h3>
        <Button size="sm" variant="ghost" icon={<ArrowUpRight size={13} />} onClick={() => void api.toolsWindowsUpdate()}>
          {t("tools.drivers.optional")}
        </Button>
      </header>
      {!info ? (
        <p className="tools-wait muted small">
          <LoaderCircle size={14} className="spin" /> {t("tools.drivers.loading")}
        </p>
      ) : (
        <ul className="drivers">
          {info.drivers.map((d) => {
            const a = d.date ? age(d.date) : null;
            // carte graphique : un pilote de plus de 6 mois rate souvent des correctifs pour les jeux récents
            const old = a != null && a.months > (d.kind === "gpu" ? 6 : 24);
            const url = linkFor(VENDORS, `${d.provider} ${d.name}`) ?? makerUrl;
            return (
              <li key={d.name} className="driver">
                <span className="driver-icon">{KIND_ICONS[d.kind]}</span>
                <span className="driver-text">
                  <span className="driver-name">{d.name}</span>
                  <span className="muted small">
                    {t(`tools.drivers.kind.${d.kind}` as Key)} · {d.provider || "—"}
                  </span>
                </span>
                <span className="driver-version rg-metric">{d.version}</span>
                <span className={`driver-age small${old ? " old" : ""}`}>
                  {a ? (
                    <>
                      <span className={`dot ${old ? "dot-warn" : "dot-ok"}`} />
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString(loc, { dateStyle: "medium" })} · {a.label}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                {url ? (
                  <Button size="sm" icon={<ArrowUpRight size={13} />} onClick={() => void api.openUrl(url)}>
                    {t("tools.drivers.site")}
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
          {info.maker && (
            <li className="driver driver-board">
              <span className="driver-icon">
                <CircuitBoard size={16} />
              </span>
              <span className="driver-text">
                <span className="driver-name">{[info.maker, info.model].filter(Boolean).join(" ")}</span>
                <span className="muted small">{t("tools.drivers.board")}</span>
              </span>
              <span />
              <span />
              {makerUrl ? (
                <Button size="sm" icon={<ArrowUpRight size={13} />} onClick={() => void api.openUrl(makerUrl)}>
                  {t("tools.drivers.makerSite")}
                </Button>
              ) : (
                <span />
              )}
            </li>
          )}
        </ul>
      )}
      <p className="muted small tools-drivers-note">{t("tools.drivers.note")}</p>
    </motion.section>
  );
}
