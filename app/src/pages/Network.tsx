import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Gauge, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { catalog } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { markSeen, useSeen } from "../lib/seen";
import { ModulePage } from "./ModulePage";
import { NetOpt } from "./NetOpt";
import { NetTest } from "./NetTest";

/** Les trois onglets de Réseau : les réglages du module, le Packet Optimizer et le test réseau. Chacun garde sa page
 * (« network », « netopt », « nettest ») : la recherche et les liens y mènent directement. */
export const NETWORK_TABS = ["network", "netopt", "nettest"] as const;
export type NetworkTab = (typeof NETWORK_TABS)[number];
export const isNetworkTab = (p: string): p is NetworkTab => (NETWORK_TABS as readonly string[]).includes(p);

const TABS: { id: NetworkTab; label: Key; icon: LucideIcon }[] = [
  { id: "network", label: "hub.tab.tweaks", icon: SlidersHorizontal },
  { id: "netopt", label: "hub.tab.packet", icon: Activity },
  { id: "nettest", label: "hub.tab.test", icon: Gauge },
];

export function Network({ tab }: { tab: NetworkTab }) {
  const { t, goTo, selected, pendingUndo } = useStore();
  const seen = useSeen();
  useEffect(() => markSeen(tab), [tab]);

  const mod = catalog.modules.find((m) => m.id === "network")!;
  const ids = mod.sections.flatMap((s) => s.tweaks.flatMap((tw) => ("ref" in tw ? [] : [tw.id])));
  const pending = ids.filter((id) => selected.has(id) || pendingUndo.includes(id)).length;

  return (
    <div className="page hub">
      <motion.header className="page-head" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
        <div className="rg-overline">{t("hub.overline")}</div>
        <h1>{t("hub.title")}</h1>
        <p className="lead">{t("hub.lead")}</p>
      </motion.header>

      <div className="hub-bar">
        <div className="hub-tabs" role="tablist" aria-label={t("hub.title")}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button key={id} type="button" role="tab" aria-selected={on} className={`hub-tab${on ? " on" : ""}`} onClick={() => goTo(id)}>
                {on && <motion.span layoutId="hub-pill" className="hub-pill" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                <span className="hub-tab-label">
                  <Icon size={15} strokeWidth={1.75} />
                  {t(label)}
                  {id === "network" && pending > 0 && <span className="nav-count rg-metric">{pending}</span>}
                  {id !== "network" && !seen.includes(id) && <span className="hub-new">{t("nav.new")}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "network" ? <ModulePage id="network" embedded /> : tab === "netopt" ? <NetOpt /> : <NetTest />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
