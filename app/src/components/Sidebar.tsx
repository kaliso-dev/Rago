import { useEffect, useState } from "react";
import { catalog } from "../lib/catalog";
import { useStore } from "../lib/store";
import { api } from "../lib/api";
import { saved } from "../lib/analysis";
import type { Key } from "../lib/i18n";
import { markSeen } from "../lib/seen";
import { isNetworkTab } from "../pages/Network";
import { I, LogoR } from "../s5/I";
import { ago } from "../s5/text";
import { UpdateCard } from "./UpdateCard";

/** Barre latérale de la maquette v5 (shell5.js, printicons.js) : mêmes groupes, mêmes icônes imprimées, mêmes compteurs. */
const GROUPS: { label: Key; items: [id: string, icon: string][] }[] = [
  { label: "nav.optimize", items: [["dashboard", "dashboard"], ["analysis", "analysis"], ["network", "network"], ["latency", "latency"], ["gpu", "graphics"], ["windows", "windows"], ["tools", "tools"]] },
  { label: "nav.play", items: [["games", "library"], ["display", "display"], ["hitreg", "hitreg"], ["mouse", "mouse"], ["gamemode", "games"], ["minecraft", "minecraft"], ["rbw", "rbw"]] },
  { label: "nav.advanced", items: [["expert", "expert"], ["restore", "restore"]] },
];
/** Pages sans module du catalogue. */
const LABELS: Record<string, Key> = { dashboard: "nav.dashboard", games: "nav.games", display: "nav.display", mouse: "nav.mouse", tools: "nav.tools", analysis: "nav.analysis", settings: "nav.settings" };
/** compteur « allumés / total » des modules, comme la maquette (Réseau et Minecraft n'en ont pas) */
const COUNTED = new Set(["latency", "gpu", "windows", "hitreg", "expert"]);
/** interrupteur unique : « on » / « off » */
const SWITCH: Record<string, string> = { gamemode: "game_mode", rbw: "rbw_mode" };

export function Sidebar() {
  const { t, lang, page, goTo, applied, pendingUndo, lastRun } = useStore();
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));
  const [games, setGames] = useState<number | null>(null);
  // jeux réglés dans Display (couleurs ou résolution), comme « 2/9 » sur la maquette
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void api.gamesList(false).then((g) => live && setGames(g.length), () => {});
    void api.displayProfiles().then((p) => live && setShown(Object.values(p).filter((x) => x.colors || x.resolution).length), () => {});
    return () => {
      live = false;
    };
  }, [page === "games", page === "display"]);

  const count = (id: string): string => {
    // Mode jeu, RBW Mod : l'état de leur dernier passage, comme leur page
    if (id in SWITCH) {
      const last = lastRun.get(SWITCH[id]);
      return last?.ok && last.variant === "on" ? "on" : "off";
    }
    if (id === "games") return games == null ? "" : String(games);
    if (id === "display") return !games || shown == null ? "" : `${Math.min(shown, games)}/${games}`;
    if (!COUNTED.has(id)) return "";
    const m = modules.get(id);
    if (!m) return "";
    let n = 0;
    let total = 0;
    for (const s of m.sections)
      for (const tw of s.tweaks)
        if (!("ref" in tw) && tw.kind !== "action") {
          total++;
          // allumés sur le PC (appliqués, pas en cours d'annulation), comme le bloc en tête de la page du module
          if (applied.has(tw.id) && !pendingUndo.includes(tw.id)) n++;
        }
    return `${n}/${total}`;
  };
  const label = (id: string) => (id in LABELS ? t(LABELS[id]) : (modules.get(id)?.name[lang] ?? id));

  const item = (id: string, icon: string) => {
    const on = page === id || (id === "settings" && page === "share") || (id === "network" && isNetworkTab(page));
    const n = count(id);
    return (
      <a
        key={id}
        className={on ? "on" : undefined}
        role="button"
        tabIndex={0}
        aria-current={on ? "page" : undefined}
        onClick={() => {
          goTo(id);
          markSeen(id);
        }}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), goTo(id))}
      >
        <I n={icon} />
        <span className="t">{label(id)}</span>
        {n && <em>{n}</em>}
      </a>
    );
  };

  let onPc = 0;
  for (const a of applied.values()) if (a.ok) onPc++;
  const last = saved();
  const lastAt = (last.after ?? last.before)?.at;

  return (
    <aside className="side">
      <div className="logo" aria-label="Rago" data-tauri-drag-region>
        <LogoR />
        <b data-tauri-drag-region>ago</b>
      </div>
      <nav className="nav">
        {GROUPS.map((g) => (
          <div key={g.label} style={{ display: "contents" }}>
            <div className="grp">{t(g.label)}</div>
            {g.items.map(([id, icon]) => item(id, icon))}
          </div>
        ))}
      </nav>
      <div className="foot">
        <UpdateCard />
        <div className="pc">
          <span className="k">{t("nav.thisPc")}</span>
          <b>
            {t("s5.nav.tweaks", { n: onPc })} <span>{t("dash.on")}</span>
          </b>
          <small>{onPc === 0 ? t("s5.nav.nothingYet") : lastAt ? t("s5.nav.lastCheck", { ago: ago(lang, lastAt) }) : t("s5.nav.noCheck")}</small>
        </div>
        {item("settings", "settings")}
        <div className="motto">{t("nav.motto")}</div>
      </div>
    </aside>
  );
}
