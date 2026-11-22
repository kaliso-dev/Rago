import { motion } from "motion/react";
import { Lock } from "./ri";
import { Mark } from "./Logo";
import { catalog } from "../lib/catalog";
import { FREE, FREE_SLOTS, useStore } from "../lib/store";
import { totalTweaks } from "../lib/catalog";
import { DiscordIcon, MODULE_ICONS } from "./icons";
import { DISCORD_URL } from "./LicenseGate";
import { api } from "../lib/api";
import { UpdateCard } from "./UpdateCard";
import type { Key } from "../lib/i18n";
import { markSeen, useSeen } from "../lib/seen";
import { isNetworkTab } from "../pages/Network";
import { TOOLS_SEEN } from "../pages/Tools";

/** Pages sans module du catalogue. */
const LABELS: Record<string, Key> = { games: "nav.games", display: "nav.display", mouse: "nav.mouse", tools: "nav.tools", analysis: "nav.analysis" };
/** Nouveautés derrière chaque entrée : badge « Nouveau » tant que l'une n'a pas été ouverte (Réseau : ses onglets
 * Packet Optimizer et Test réseau ; Couleurs et résolution : nouvelle après la 1.3.0). */
const NEW: Record<string, string[]> = { games: ["games"], display: ["display"], tools: ["tools", TOOLS_SEEN], network: ["netopt", "nettest"], analysis: ["analysis"], mouse: ["mouse"] };

// Réseau regroupe le Packet Optimizer et le test réseau dans ses onglets : deux entrées de moins
// ordre de la charte v5 (22/11/2026) : Optimize, Play, Pro
const GROUPS: { label: Key | null; ids: string[] }[] = [
  { label: "nav.optimize", ids: ["dashboard", "analysis", "network", "latency", "gpu", "windows", "tools"] },
  { label: "nav.play", ids: ["games", "display", "hitreg", "mouse", "gamemode", "minecraft", "rbw"] },
  { label: "nav.advanced", ids: ["expert", "restore"] },
];

export function Sidebar() {
  const { t, lang, page, goTo, sys, license, premium, setUpsell, isLocked, undoOnly, slotsUsed, isOn, applied } = useStore();
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));
  const seen = useSeen();
  const visit = (id: string) => {
    goTo(id);
    if (NEW[id]?.includes(id)) markSeen(id);
  };
  const isNew = (id: string) => !!NEW[id]?.some((p) => !seen.includes(p));

  // réglages allumés (appliqués ou choisis) sur le total du module : « 6/82 »
  const countIn = (id: string) => {
    const m = modules.get(id);
    if (!m) return null;
    let n = 0;
    let total = 0;
    for (const s of m.sections)
      for (const tw of s.tweaks)
        if (!("ref" in tw) && tw.kind !== "action") {
          total++;
          if (isOn(tw.id)) n++;
        }
    return total > 1 ? { n, total } : null;
  };
  let onPc = 0;
  for (const a of applied.values()) if (a.ok) onPc++;
  // plan gratuit : cadenas dès qu'un réglage du module est réservé à Premium, même si d'autres sont gratuits (Windows,
  // Hitreg) ; pas de cadenas pour un module entièrement gratuit (Restaurer)
  const lockedModule = (id: string) => {
    const m = modules.get(id);
    if (premium || !m) return false;
    return m.sections.some((s) => s.tweaks.some((tw) => !("ref" in tw) && (isLocked(tw.id) || undoOnly(tw.id))));
  };

  const item = (id: string, label: string, icon: string) => {
    const Icon = MODULE_ICONS[icon];
    const c = countIn(id);
    const Icon2 = Icon;
    // Partage et support s'ouvre depuis les paramètres, les onglets de Réseau depuis Réseau
    const active = page === id || (id === "settings" && page === "share") || (id === "network" && isNetworkTab(page));
    return (
      <button key={id} type="button" className={`nav-item${active ? " active" : ""}`} onClick={() => visit(id)}>
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 42 }} />}
        <Icon2 size={21} />
        <span className="nav-label">{label}</span>
        {lockedModule(id) ? <Lock size={13} className="nav-lock" /> : c && <span className="nav-count">{c.n}/{c.total}</span>}
        {isNew(id) &&
          // libellé long : un point, pour qu'il tienne sur une ligne
          (label.length > 14 ? <span className="nav-new dot" title={t("nav.new")} aria-label={t("nav.new")} /> : <span className="nav-new">{t("nav.new")}</span>)}
      </button>
    );
  };

  return (
    <nav className="sidebar">
      <div className="nav-logo" data-tauri-drag-region aria-label="Rago">
        <Mark size={22} />
        <b data-tauri-drag-region>ago</b>
      </div>
      <div className="nav-scroll">
        {GROUPS.map((g, i) => (
          <div key={i} className="nav-group">
            {g.label && <div className="nav-group-label">{t(g.label)}</div>}
            {g.ids.map((id) =>
              id === "dashboard"
                ? item(id, t("nav.dashboard"), "dashboard")
                : id in LABELS
                  ? item(id, t(LABELS[id]), id)
                  : item(id, modules.get(id)!.name[lang], modules.get(id)!.icon),
            )}
          </div>
        ))}
      </div>
      <div className="nav-foot">
        <UpdateCard />
        {license && !premium ? (
          <button type="button" className="nav-pc nav-upgrade" onClick={() => setUpsell("plan")}>
            <span className="nav-pc-k">{t("free.plan")}</span>
            <b>
              {FREE.size} <span>/ {totalTweaks}</span>
            </b>
            <small>
              {FREE_SLOTS > 0 ? t("free.slots", { used: Math.min(slotsUsed, FREE_SLOTS), n: FREE_SLOTS }) : t("free.status", { n: FREE.size, total: totalTweaks })}
            </small>
            <span className="nav-upgrade-cta">{t("free.upgrade")}</span>
          </button>
        ) : (
          <div className="nav-pc" title={sys ? `${sys.isAdmin ? t("nav.admin") : t("nav.notAdmin")} · ${sys.hostname}` : undefined}>
            <span className="nav-pc-k">{t("nav.thisPc")}</span>
            <b>
              {t("nav.tweaksOn", { n: onPc }).replace(/\s\S+$/, "")} <span>{t("nav.tweaksOn", { n: onPc }).split(" ").pop()}</span>
            </b>
            <small>{sys ? (sys.isAdmin ? t("nav.admin") : t("nav.notAdmin")) : "…"}</small>
          </div>
        )}
        {item("settings", t("nav.settings"), "settings")}
        <div className="nav-motto">
          <span>{t("nav.motto")}</span>
          <button type="button" className="nav-discord" title={t("nav.discord")} aria-label={t("nav.discord")} onClick={() => void api.openUrl(DISCORD_URL)}>
            <DiscordIcon size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
