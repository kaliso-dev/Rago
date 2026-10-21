import { motion } from "motion/react";
import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { catalog } from "../lib/catalog";
import { FREE, useStore } from "../lib/store";
import { totalTweaks } from "../lib/catalog";
import { MODULE_ICONS } from "./icons";
import { UpdateCard } from "./UpdateCard";
import type { Key } from "../lib/i18n";

/** Pages de la 1.2.0 : badge « Nouveau » jusqu'à la première visite. */
const NEW_PAGES: Record<string, Key> = { games: "nav.games", nettest: "nav.nettest", os: "nav.os" };

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem("rago.seenPages") ?? "[]") as string[];
  } catch {
    return [];
  }
}

const GROUPS: { label: Key | null; ids: string[] }[] = [
  { label: null, ids: ["dashboard", "os"] },
  { label: "nav.optimize", ids: ["network", "latency", "gpu", "windows"] },
  { label: "nav.play", ids: ["hitreg", "minecraft", "rbw", "gamemode", "games", "nettest"] },
  { label: "nav.advanced", ids: ["expert", "restore"] },
];

export function Sidebar() {
  const { t, lang, page, goTo, selected, sys, license, premium, setUpsell, isLocked, undoOnly } = useStore();
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));
  const [seen, setSeen] = useState(loadSeen);
  const visit = (id: string) => {
    goTo(id);
    if (id in NEW_PAGES && !seen.includes(id)) {
      const next = [...seen, id];
      setSeen(next);
      try {
        localStorage.setItem("rago.seenPages", JSON.stringify(next));
      } catch {
        /* stockage indisponible : le badge revient au prochain lancement */
      }
    }
  };

  const countIn = (id: string) => {
    const m = modules.get(id);
    if (!m) return 0;
    let n = 0;
    for (const s of m.sections) for (const tw of s.tweaks) if (!("ref" in tw) && selected.has(tw.id)) n++;
    return n;
  };
  // plan gratuit : cadenas dès qu'un réglage du module est réservé à Premium, même si d'autres sont gratuits (Windows,
  // Hitreg) ; pas de cadenas pour un module entièrement gratuit (Restaurer)
  const lockedModule = (id: string) => {
    const m = modules.get(id);
    if (premium || !m) return false;
    return m.sections.some((s) => s.tweaks.some((tw) => !("ref" in tw) && (isLocked(tw.id) || undoOnly(tw.id))));
  };

  const item = (id: string, label: string, icon: string) => {
    const Icon = MODULE_ICONS[icon];
    const n = countIn(id);
    // Partage et support s'ouvre depuis les paramètres : la barre reste sur Paramètres
    const active = page === id || (id === "settings" && page === "share");
    return (
      <button key={id} type="button" className={`nav-item${active ? " active" : ""}`} onClick={() => visit(id)}>
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 42 }} />}
        <Icon size={16} strokeWidth={1.75} />
        <span className="nav-label">{label}</span>
        {n > 0 && <span className="nav-count rg-metric">{n}</span>}
        {n === 0 && lockedModule(id) && <Lock size={12} className="nav-lock" />}
        {id in NEW_PAGES && !seen.includes(id) && <span className="nav-new">{t("nav.new")}</span>}
      </button>
    );
  };

  return (
    <nav className="sidebar">
      {GROUPS.map((g, i) => (
        <div key={i} className="nav-group">
          {g.label && <div className="rg-overline nav-group-label">{t(g.label)}</div>}
          {g.ids.map((id) =>
            id === "dashboard"
              ? item(id, t("nav.dashboard"), "dashboard")
              : id in NEW_PAGES
                ? item(id, t(NEW_PAGES[id]), id)
                : item(id, modules.get(id)!.name[lang], modules.get(id)!.icon),
          )}
        </div>
      ))}
      <div className="nav-spacer" />
      <UpdateCard />
      {license && !premium && (
        <button type="button" className="nav-upgrade" onClick={() => setUpsell("plan")}>
          <span className="nav-upgrade-top">
            <Sparkles size={13} />
            {t("free.plan")}
          </span>
          <span className="nav-upgrade-sub rg-metric">{t("free.status", { n: FREE.size, total: totalTweaks })}</span>
          <span className="nav-upgrade-cta">{t("free.upgrade")}</span>
        </button>
      )}
      {item("settings", t("nav.settings"), "settings")}
      <div className="nav-foot">
        <span className={`dot ${sys?.isAdmin ? "dot-ok" : "dot-warn"}`} />
        <span>{sys ? (sys.isAdmin ? t("nav.admin") : t("nav.notAdmin")) : "…"}</span>
        <span className="nav-foot-host rg-metric">{sys?.hostname}</span>
      </div>
    </nav>
  );
}
