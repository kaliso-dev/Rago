import { motion } from "motion/react";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { catalog } from "../lib/catalog";
import { FREE, useStore } from "../lib/store";
import { totalTweaks } from "../lib/catalog";
import { DiscordIcon, MODULE_ICONS } from "./icons";
import { DISCORD_URL } from "./LicenseGate";
import { api } from "../lib/api";
import { UpdateCard } from "./UpdateCard";
import type { Key } from "../lib/i18n";
import { markSeen, useSeen } from "../lib/seen";
import { isNetworkTab } from "../pages/Network";

/** Pages sans module du catalogue. */
const LABELS: Record<string, Key> = { games: "nav.games", tools: "nav.tools" };
/** Nouveautés de la 1.2.0 derrière chaque entrée : badge « Nouveau » tant que l'une n'a pas été ouverte (Réseau :
 * ses onglets Packet Optimizer et Test réseau). */
const NEW: Record<string, string[]> = { games: ["games"], tools: ["tools"], network: ["netopt", "nettest"] };

// Réseau regroupe le Packet Optimizer et le test réseau dans ses onglets : deux entrées de moins
const GROUPS: { label: Key | null; ids: string[] }[] = [
  { label: null, ids: ["dashboard"] },
  { label: "nav.optimize", ids: ["network", "latency", "gpu", "windows", "tools"] },
  { label: "nav.play", ids: ["hitreg", "minecraft", "rbw", "gamemode", "games"] },
  { label: "nav.advanced", ids: ["expert", "restore"] },
];

export function Sidebar() {
  const { t, lang, page, goTo, selected, sys, license, premium, setUpsell, isLocked, undoOnly } = useStore();
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));
  const seen = useSeen();
  const visit = (id: string) => {
    goTo(id);
    if (NEW[id]?.includes(id)) markSeen(id);
  };
  const isNew = (id: string) => !!NEW[id]?.some((p) => !seen.includes(p));

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
    // Partage et support s'ouvre depuis les paramètres, les onglets de Réseau depuis Réseau
    const active = page === id || (id === "settings" && page === "share") || (id === "network" && isNetworkTab(page));
    return (
      <button key={id} type="button" className={`nav-item${active ? " active" : ""}`} onClick={() => visit(id)}>
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 42 }} />}
        <Icon size={16} strokeWidth={1.75} />
        <span className="nav-label">{label}</span>
        {n > 0 && <span className="nav-count rg-metric">{n}</span>}
        {n === 0 && lockedModule(id) && <Lock size={12} className="nav-lock" />}
        {isNew(id) &&
          // libellé long : un point, pour qu'il tienne sur une ligne
          (label.length > 14 ? <span className="nav-new dot" title={t("nav.new")} aria-label={t("nav.new")} /> : <span className="nav-new">{t("nav.new")}</span>)}
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
              : id in LABELS
                ? item(id, t(LABELS[id]), id)
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
      <button type="button" className="nav-item nav-discord" onClick={() => void api.openUrl(DISCORD_URL)}>
        <DiscordIcon size={16} />
        <span className="nav-label">{t("nav.discord")}</span>
        <ArrowUpRight size={13} className="nav-out" />
      </button>
      {item("settings", t("nav.settings"), "settings")}
      <div className="nav-foot">
        <span className={`dot ${sys?.isAdmin ? "dot-ok" : "dot-warn"}`} />
        <span>{sys ? (sys.isAdmin ? t("nav.admin") : t("nav.notAdmin")) : "…"}</span>
        <span className="nav-foot-host rg-metric">{sys?.hostname}</span>
      </div>
    </nav>
  );
}
