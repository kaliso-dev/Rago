// Page Réseau, à l'identique des maquettes v5 app-network-*-pi.html : en-tête (ping en direct), onglets, et un onglet
// par page (« network », « netopt », « nettest », « route ») : la recherche et les liens y mènent directement.
// Styles : s5/pages/module.css (socle commun des maquettes de Réseau) et s5/pages/net.css (règles propres aux onglets).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "../lib/api";
import { catalog } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { markSeen } from "../lib/seen";
import { I } from "../s5/I";
import { Tabs } from "../s5/ui";
import { NetTweaks } from "./NetTweaks";
import { NetOpt } from "./NetOpt";
import { NetTest } from "./NetTest";
import { RouteTab } from "./RouteTab";

export const NETWORK_TABS = ["network", "netopt", "nettest", "route"] as const;
export type NetworkTab = (typeof NETWORK_TABS)[number];
export const isNetworkTab = (p: string): p is NetworkTab => (NETWORK_TABS as readonly string[]).includes(p);

const TABS: { id: NetworkTab; label: Key }[] = [
  { id: "network", label: "hub.tab.tweaks" },
  { id: "netopt", label: "hub.tab.packet" },
  { id: "nettest", label: "hub.tab.test" },
  { id: "route", label: "hub.tab.route" },
];

const SPARK = 24;
// barres grises de la maquette hors ligne (le dernier relevé n'a plus de sens)
const IDLE = [0.42, 0.38, 0.45, 0.4, 0.36, 0.44, 0.95, 0.41, 0.37, 0.4, 0.43, 0.38, 0.36, 0.42, 0.39, 0.4, 0.45, 0.37, 0.41, 0.38, 0.4, 0.43, 0.39, 0.4];

/** Ping en direct vers Cloudflare (live_stats, stats.rs), relu chaque seconde : les 24 derniers relevés. Hors ligne
 * après 3 relevés sans réponse. */
export function useLivePing() {
  const [pings, setPings] = useState<number[]>([]);
  const [offline, setOffline] = useState(false);
  const miss = useRef(0);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const s = await api.liveStats();
        if (!live || !s.ready) return;
        if (s.ping == null) {
          miss.current++;
          if (miss.current >= 3) setOffline(true);
          return;
        }
        miss.current = 0;
        setOffline(false);
        setPings((p) => [...p, s.ping!].slice(-SPARK));
      } catch {
        /* relevé manqué : le suivant */
      }
    };
    void tick();
    const h = window.setInterval(() => void tick(), 1000);
    return () => {
      live = false;
      window.clearInterval(h);
    };
  }, []);
  return { ping: offline ? null : (pings[pings.length - 1] ?? null), pings, offline };
}

function PingBlock({ ping, pings, offline }: ReturnType<typeof useLivePing>) {
  const { t } = useStore();
  const avg = pings.length ? pings.reduce((a, b) => a + b, 0) / pings.length : 0;
  const top = Math.max(1, ...pings, avg * 2.2);
  // 24 places : les premières secondes, les relevés arrivent par la droite
  const bars =
    offline || !pings.length
      ? IDLE.map((h) => ({ h, pk: h > 0.9 }))
      : [...Array<null>(SPARK - pings.length).fill(null), ...pings].map((v) => (v == null ? { h: 0, pk: false } : { h: Math.max(0.08, v / top), pk: pings.length > 4 && v > avg * 1.5 && v - avg > 8 }));
  return (
    <div className="ping">
      <div className="pv">
        <b>{ping == null ? "–" : Math.round(ping)}</b>
        <span>
          ms<small>{offline ? t("s5.net.offline") : t("s5.net.cloudflare")}</small>
        </span>
      </div>
      <div className="spark" style={offline || !pings.length ? { opacity: 0.25 } : undefined}>
        {bars.map((b, i) => (
          <i key={i} className={b.pk ? "pk" : undefined} style={{ "--h": b.h.toFixed(2) } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export function Network({ tab }: { tab: NetworkTab }) {
  const { t, lang, goTo, selected, pendingUndo, applied, isLocked, setUpsell, requestApply, run } = useStore();
  useEffect(() => markSeen(tab), [tab]);
  const live = useLivePing();

  const mod = catalog.modules.find((m) => m.id === "network")!;
  const ids = mod.sections.flatMap((s) => s.tweaks.flatMap((tw) => ("ref" in tw ? [] : [tw.id])));
  const pending = ids.filter((id) => selected.has(id) || (pendingUndo.includes(id) && applied.has(id))).length;
  const name = mod.name[lang].toLowerCase();
  const tag = mod.tagline[lang].replace(/\.$/, "").toLowerCase();
  const restartLocked = isLocked("net_restart");

  return (
    <div className="pg-mod pg-net is-page" data-tab={tab}>
      <section className="head">
        <div>
          <p className="kick">
            {name} <b>//</b> {tag}
          </p>
          <h1 className="title" data-t={name} style={{ fontSize: name.length <= 8 ? 150 : Math.floor((150 * 8.4) / name.length) }}>
            {name}
          </h1>
        </div>
        <PingBlock {...live} />
      </section>

      <div className="bar">
        <Tabs
          items={TABS.map((x) => ({ id: x.id, label: t(x.label), n: x.id === "network" && pending > 0 ? pending : undefined }))}
          value={tab}
          onChange={(id) => goTo(id)}
          ariaLabel={t("hub.title")}
        />
        {tab === "network" && (
          <button type="button" className="btn sm" disabled={!!run} onClick={() => (restartLocked ? setUpsell("tweak", "net_restart") : requestApply(["net_restart"]))}>
            <I n={restartLocked ? "lock" : "refresh"} />
            {t("s5.net.restartCard")}
          </button>
        )}
      </div>

      {tab === "network" ? <NetTweaks /> : tab === "netopt" ? <NetOpt /> : tab === "route" ? <RouteTab /> : <NetTest offline={live.offline} />}
    </div>
  );
}
