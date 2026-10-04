import { motion } from "motion/react";
import { catalog } from "../lib/catalog";
import { useStore } from "../lib/store";
import { MODULE_ICONS } from "./icons";
import type { Key } from "../lib/i18n";

const GROUPS: { label: Key | null; ids: string[] }[] = [
  { label: null, ids: ["dashboard"] },
  { label: "nav.optimize", ids: ["network", "latency", "gpu", "windows"] },
  { label: "nav.play", ids: ["hitreg", "minecraft", "rbw", "gamemode"] },
  { label: "nav.advanced", ids: ["expert", "restore"] },
];

export function Sidebar() {
  const { t, lang, page, goTo, selected, sys } = useStore();
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));

  const countIn = (id: string) => {
    const m = modules.get(id);
    if (!m) return 0;
    let n = 0;
    for (const s of m.sections) for (const tw of s.tweaks) if (!("ref" in tw) && selected.has(tw.id)) n++;
    return n;
  };

  const item = (id: string, label: string, icon: string) => {
    const Icon = MODULE_ICONS[icon];
    const n = countIn(id);
    const active = page === id;
    return (
      <button key={id} type="button" className={`nav-item${active ? " active" : ""}`} onClick={() => goTo(id)}>
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 42 }} />}
        <Icon size={16} strokeWidth={1.75} />
        <span className="nav-label">{label}</span>
        {n > 0 && <span className="nav-count rg-metric">{n}</span>}
      </button>
    );
  };

  return (
    <nav className="sidebar">
      {GROUPS.map((g, i) => (
        <div key={i} className="nav-group">
          {g.label && <div className="rg-overline nav-group-label">{t(g.label)}</div>}
          {g.ids.map((id) =>
            id === "dashboard" ? item(id, t("nav.dashboard"), "dashboard") : item(id, modules.get(id)!.name[lang], modules.get(id)!.icon),
          )}
        </div>
      ))}
      <div className="nav-spacer" />
      {item("settings", t("nav.settings"), "settings")}
      <div className="nav-foot">
        <span className={`dot ${sys?.isAdmin ? "dot-ok" : "dot-warn"}`} />
        <span>{sys ? (sys.isAdmin ? t("nav.admin") : t("nav.notAdmin")) : "…"}</span>
        <span className="nav-foot-host rg-metric">{sys?.hostname}</span>
      </div>
    </nav>
  );
}
