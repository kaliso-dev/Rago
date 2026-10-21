import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, LoaderCircle, Lock, Play, Plus, RefreshCw, RotateCcw, Trash2, Zap } from "lucide-react";
import { api, type Game, type Launcher } from "../lib/api";
import { hue, initials } from "../lib/art";
import { catalog, presetForGame, tweaks } from "../lib/catalog";
import { useStore } from "../lib/store";
import { SessionChecks, useSession } from "../components/SessionCard";
import { Button, Segmented } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

type Filter = "all" | "minecraft" | "shooter" | "other";

/** Preset proposé d'office : celui du jeu s'il en a un (Fortnite, Valorant, Minecraft Bedrock…), sinon PvP pour
 * Minecraft Java et ses clients, latence pour les jeux de tir, FPS pour le reste. */
const DEFAULT_PRESET: Record<string, string> = { minecraft: "builtin:mc_pvp", shooter: "builtin:latency", other: "builtin:fps" };
const defaultPreset = (g: Game) => {
  const own = presetForGame(g.name);
  return own ? `builtin:${own.id}` : (DEFAULT_PRESET[g.kind] ?? "builtin:fps");
};

const LAUNCHERS: Record<string, string> = {
  steam: "Steam",
  epic: "Epic Games",
  riot: "Riot Client",
  battlenet: "Battle.net",
  ubisoft: "Ubisoft Connect",
  xbox: "Xbox",
  roblox: "Roblox",
};

function Art({ game, src, className }: { game: Game; src: string | null | undefined; className?: string }) {
  const title = game.client ?? game.name;
  const h = hue(game.kind === "minecraft" ? "minecraft" : game.id);
  return (
    <div className={`game-art${className ? ` ${className}` : ""}`} style={{ "--h": h } as React.CSSProperties}>
      <span className="game-art-initials">{game.kind === "minecraft" ? "MC" : initials(title)}</span>
      <AnimatePresence>
        {src && (
          // l'image entière, jamais rognée : ce qui manque autour est rempli par la même image, floutée
          <motion.div key="img" className="game-art-img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <img className="game-art-fill" src={src} alt="" draggable={false} />
            <img src={src} alt="" draggable={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Launchers installés : leur icône (celle de leur exe) sur un fond flouté de la même icône ; un clic les ouvre. */
function Launchers({ list }: { list: Launcher[] }) {
  const { t } = useStore();
  const [icons, setIcons] = useState<Record<string, string | null>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    for (const l of list) {
      if (l.id in icons) continue;
      void api.launcherIcon(l.id).then(
        (src) => live && setIcons((m) => ({ ...m, [l.id]: src })),
        () => live && setIcons((m) => ({ ...m, [l.id]: null })),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const start = async (l: Launcher) => {
    setOpening(l.id);
    setFailed(null);
    try {
      await api.launcherLaunch(l.id);
      setOpen((s) => new Set(s).add(l.id));
    } catch {
      setFailed(l.id);
    } finally {
      setOpening(null);
    }
  };

  return (
    <motion.section variants={rise} className="launchers">
      <div className="launchers-head">
        <h2 className="section-title rg-overline">{t("games.launchers")}</h2>
        <span className="muted small">{t("games.launchersLead")}</span>
      </div>
      <div className="launchers-row">
        {list.map((l) => {
          const src = icons[l.id];
          const running = l.running || open.has(l.id);
          return (
            <motion.button
              key={l.id}
              type="button"
              className={`launcher${running ? " running" : ""}`}
              style={{ "--h": hue(l.id) } as React.CSSProperties}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              disabled={opening === l.id}
              onClick={() => void start(l)}
            >
              <span className="launcher-glow" style={src ? { backgroundImage: `url(${src})` } : undefined} />
              <span className="launcher-icon">
                {src ? <img src={src} alt="" draggable={false} /> : <span className="launcher-initials">{initials(l.name)}</span>}
              </span>
              <span className="launcher-name">{l.name}</span>
              <span className="launcher-state">
                {opening === l.id ? (
                  <LoaderCircle size={11} className="spin" />
                ) : failed === l.id ? (
                  t("games.launcherFailed")
                ) : running ? (
                  <>
                    <span className="dot dot-ok" />
                    {t("games.launcherOpen")}
                  </>
                ) : (
                  <>
                    {t("games.launcherStart")}
                    <ArrowUpRight size={11} />
                  </>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

export function Games() {
  const { t, lang, premium, setUpsell, applied, gamePresets, setGamePresets, myPresets, optimizeAndPlay, launchGame, playing, requestUndo, run, toApply } =
    useStore();
  const [games, setGames] = useState<Game[] | null>(null);
  const [launchers, setLaunchers] = useState<Launcher[]>([]);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [pick, setPick] = useState<string | null>(null);
  const [art, setArt] = useState<Record<string, string | null>>({});
  const [menu, setMenu] = useState(false);
  const [asking, setAsking] = useState(false);
  const session = useSession();

  const load = async (refresh: boolean) => {
    setScanning(true);
    void api.launchersList(refresh).then(setLaunchers, () => {});
    try {
      setGames(await api.gamesList(refresh));
    } catch {
      setGames((g) => g ?? []);
    } finally {
      setScanning(false);
    }
  };
  useEffect(() => {
    void load(false);
    const sub = api.onGamesRunning((ids) =>
      setGames((list) =>
        list?.map((g) => {
          const running = ids.includes(g.id);
          return running === g.running ? g : { ...g, running, lastPlayed: Date.now() };
        }) ?? list,
      ),
    );
    return () => void sub.then((un) => un());
  }, []);
  // le jeu lancé depuis Rago passe en tête
  useEffect(() => {
    if (playing?.status === "started") setGames((list) => list?.map((g) => (g.id === playing.id ? { ...g, lastPlayed: Date.now() } : g)) ?? list);
  }, [playing]);

  // images officielles, trois à la fois (téléchargées une fois, puis lues sur le disque)
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!games) return;
    const queue = games.map((g) => g.id).filter((id) => !asked.current.has(id));
    queue.forEach((id) => asked.current.add(id));
    let live = true;
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const src = await api.gameArt(id).catch(() => null);
        if (live) setArt((a) => ({ ...a, [id]: src }));
      }
    };
    void Promise.all([worker(), worker(), worker()]);
    return () => {
      live = false;
    };
  }, [games]);

  const presetRef = (g: Game) => {
    const ref = gamePresets[g.id] ?? defaultPreset(g);
    // preset perso supprimé depuis, ou preset du catalogue qui n'existe plus : celui d'office
    const gone = ref.startsWith("mine:") ? !myPresets.some((p) => `mine:${p.id}` === ref) : ref.startsWith("builtin:") && !catalog.presets.some((p) => `builtin:${p.id}` === ref);
    return gone ? defaultPreset(g) : ref;
  };
  const resolve = (ref: string): { name: string; entries: string[] } | null => {
    if (ref.startsWith("builtin:")) {
      const p = catalog.presets.find((x) => `builtin:${x.id}` === ref);
      return p ? { name: p.name[lang], entries: p.tweaks } : null;
    }
    const p = myPresets.find((x) => `mine:${x.id}` === ref);
    return p ? { name: p.name, entries: p.t } : null;
  };

  const sorted = useMemo(
    () =>
      [...(games ?? [])].sort(
        (a, b) => Number(b.running) - Number(a.running) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || (a.client ?? a.name).localeCompare(b.client ?? b.name),
      ),
    [games],
  );
  const hero = sorted.find((g) => g.id === pick) ?? sorted[0] ?? null;
  const counts = { all: sorted.length, minecraft: 0, shooter: 0, other: 0 } as Record<Filter, number>;
  for (const g of sorted) counts[(g.kind in counts ? g.kind : "other") as Filter]++;
  const shown = filter === "all" ? sorted : sorted.filter((g) => (g.kind in counts ? g.kind : "other") === filter);
  const found = [...new Set(sorted.map((g) => (g.launcher === "minecraft" ? g.client : g.launcher === "manual" ? null : LAUNCHERS[g.launcher])).filter(Boolean))];

  const ago = (ts: number) => {
    const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { numeric: "auto", style: "short" });
    const min = Math.round((ts - Date.now()) / 60_000);
    if (Math.abs(min) < 60) return rtf.format(min, "minute");
    const h = Math.round(min / 60);
    if (Math.abs(h) < 24) return rtf.format(h, "hour");
    return rtf.format(Math.round(h / 24), "day");
  };

  const heroPreset = hero ? resolve(presetRef(hero)) : null;
  const heroUsable = heroPreset ? heroPreset.entries.filter((e) => tweaks.get(e.split(":")[0])?.kind === "tweak") : [];
  // réglages du preset encore appliqués sur ce PC : ils restent après la fermeture du jeu, on les retire d'ici
  const heroApplied = heroUsable.map((e) => e.split(":")[0]).filter((id) => applied.has(id));
  const heroPending = heroPreset ? toApply(heroPreset.entries).ids.length : 0;
  const busy = !!run;

  const play = (g: Game) => {
    setAsking(false);
    const preset = resolve(presetRef(g));
    if (!preset) return void launchGame(g.id, g.client ?? g.name);
    if (!premium) return setUpsell("plan");
    optimizeAndPlay({ id: g.id, name: g.client ?? g.name }, preset.entries);
  };

  const add = async () => {
    try {
      const id = await api.gameAdd(t("games.addTitle"));
      if (!id) return;
      setPick(id);
      await load(false);
    } catch {
      /* pas un programme : rien n'est ajouté */
    }
  };

  const remove = async (g: Game) => {
    await api.gameRemove(g.id);
    setAsking(false);
    setPick(null);
    setGames((list) => list?.filter((x) => x.id !== g.id) ?? list);
  };

  const status = (g: Game) =>
    playing?.id === g.id && playing.status === "failed"
      ? t("games.failed")
      : playing?.id === g.id && playing.status === "waiting" && !run
        ? t("games.starting")
        : null;

  return (
    <motion.div className="page games" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head games-head" variants={rise}>
        <div>
          <div className="rg-overline">{t("games.overline")}</div>
          <h1>{t("games.title")}</h1>
          <p className="lead">{t("games.lead")}</p>
        </div>
        <div className="games-head-actions">
          <button type="button" className="icon-btn" title={t("games.rescan")} aria-label={t("games.rescan")} onClick={() => void load(true)}>
            <RefreshCw size={14} className={scanning ? "spin" : undefined} />
          </button>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => void add()}>
            {t("games.add")}
          </Button>
        </div>
      </motion.header>

      {games == null ? (
        <motion.div variants={rise} className="card games-hero skeleton">
          <div className="game-art hero-art" />
          <div className="skeleton-line" />
        </motion.div>
      ) : !hero ? (
        <motion.div variants={rise} className="card games-empty">
          <h3>{t("games.empty")}</h3>
          <p className="muted small">{t("games.emptyLead")}</p>
          <div className="share-actions">
            <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => void load(true)}>
              {t("games.rescan")}
            </Button>
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => void add()}>
              {t("games.add")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.section variants={rise} className="card games-hero" key={hero.id}>
          <Art game={hero} src={art[hero.id]} className="hero-art" />
          <div className="games-hero-body">
            <div className="rg-overline games-when">
              {hero.running ? (
                <>
                  <span className="dot dot-ok" /> {t("games.playing")}
                </>
              ) : hero.lastPlayed ? (
                `${t("games.last")} · ${ago(hero.lastPlayed)}`
              ) : (
                t("games.never")
              )}
            </div>
            <h2 className="games-hero-title">
              {hero.kind === "minecraft" && hero.client ? `Minecraft · ${hero.client}` : hero.name}
            </h2>
            <div className="games-chips">
              <div className="games-picker">
                <button type="button" className="chip chip-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                  {heroPreset ? t("games.presetChip", { name: heroPreset.name, n: heroUsable.length }) : t("games.noPreset")}
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {menu && (
                    <PresetMenu
                      value={presetRef(hero)}
                      onPick={(ref) => {
                        setGamePresets((m) => ({ ...m, [hero.id]: ref }));
                        setMenu(false);
                      }}
                      onClose={() => setMenu(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
              {hero.launcher !== "minecraft" && <span className="chip">{hero.launcher === "manual" ? t("games.manual") : LAUNCHERS[hero.launcher]}</span>}
              <button
                type="button"
                className={`chip chip-btn games-remove${asking ? " danger" : ""}`}
                title={asking ? t("games.removeAsk") : t("games.remove")}
                aria-label={t("games.remove")}
                onBlur={() => setAsking(false)}
                onClick={() => (asking ? void remove(hero) : setAsking(true))}
              >
                <Trash2 size={12} />
                {asking && <span>{t("games.removeConfirm")}</span>}
              </button>
            </div>
            {hero.running && session && <SessionChecks session={session} t={t} />}
          </div>
          <div className="games-hero-actions">
            <div className="games-hero-buttons">
              {heroPreset ? (
                <Button
                  variant="primary"
                  icon={!premium ? <Lock size={13} /> : heroPending > 0 ? <Zap size={14} /> : <Play size={13} />}
                  disabled={busy}
                  onClick={() => play(hero)}
                >
                  {heroPending > 0 || !premium ? t("games.optimizePlay") : t("games.play")}
                </Button>
              ) : null}
              {/* tout le preset est déjà appliqué : un seul bouton « Jouer » */}
              {!(heroPreset && premium && heroPending === 0) && (
                <Button variant={heroPreset ? "secondary" : "primary"} icon={<Play size={13} />} disabled={busy} onClick={() => void launchGame(hero.id, hero.client ?? hero.name)}>
                  {heroPreset ? t("games.playOnly") : t("games.play")}
                </Button>
              )}
            </div>
            {status(hero) ? (
              <p className={`games-note small${playing?.status === "failed" ? " error" : ""}`}>{status(hero)}</p>
            ) : heroApplied.length > 0 ? (
              <p className="games-note small">
                {t("games.stayOn", { n: heroApplied.length })}{" "}
                <button type="button" className="link small" disabled={busy} onClick={() => requestUndo(heroApplied)}>
                  <RotateCcw size={11} />
                  {t("games.removeTweaks")}
                </button>
              </p>
            ) : heroPreset && premium ? (
              <p className="games-note small muted">{t("games.applyFirst", { n: heroPending })}</p>
            ) : null}
          </div>
        </motion.section>
      )}

      {launchers.length > 0 && <Launchers list={launchers} />}

      {sorted.length > 0 && (
        <>
          <motion.div variants={rise} className="games-bar">
            <Segmented
              layoutId="games-filter"
              value={filter}
              onChange={setFilter}
              options={(["all", "minecraft", "shooter", "other"] as const)
                .filter((f) => f === "all" || counts[f] > 0)
                .map((f) => ({ id: f, label: f === "all" ? t("games.all", { n: counts.all }) : t(`games.kind.${f}`) }))}
            />
            {found.length > 0 && <span className="muted small">{t("games.found", { list: found.join(", ") })}</span>}
          </motion.div>
          <motion.div variants={rise} className="games-grid">
            {shown.map((g) => {
              const preset = resolve(presetRef(g));
              return (
                <div key={g.id} className={`game-card${hero?.id === g.id ? " on" : ""}`}>
                  <button type="button" className="preset-hit" aria-label={g.client ?? g.name} onClick={() => setPick(g.id)} />
                  <Art game={g} src={art[g.id]} />
                  {g.running && (
                    <span className="game-live">
                      <span className="dot dot-ok" />
                      {t("games.playing")}
                    </span>
                  )}
                  <div className="game-body">
                    <div className="game-name">{g.client ?? g.name}</div>
                    <div className="game-sub muted small">{g.client ? "Minecraft" : g.launcher === "manual" ? t("games.manual") : LAUNCHERS[g.launcher]}</div>
                    <div className="game-foot">
                      <span className="chip">{preset ? preset.name : t("games.noPresetShort")}</span>
                      <Button size="sm" disabled={busy} onClick={() => void launchGame(g.id, g.client ?? g.name)}>
                        {t("games.play")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

/** Choix du preset d'un jeu : ceux du catalogue, Mes presets, ou aucun (le jeu se lance tel quel). */
function PresetMenu({ value, onPick, onClose }: { value: string; onPick: (ref: string) => void; onClose: () => void }) {
  const { t, lang, myPresets } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest(".chip-btn") && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  const item = (id: string, label: string) => (
    <button key={id} type="button" role="menuitemradio" aria-checked={value === id} className={value === id ? "on" : undefined} onClick={() => onPick(id)}>
      <span>{label}</span>
      {value === id && <Check size={13} />}
    </button>
  );
  return (
    <motion.div
      ref={ref}
      role="menu"
      className="games-menu"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14 }}
    >
      <div className="rg-overline games-menu-label">{t("dash.presets")}</div>
      {catalog.presets.filter((p) => !p.game).map((p) => item(`builtin:${p.id}`, p.name[lang]))}
      <div className="rg-overline games-menu-label">{t("games.menuGames")}</div>
      {catalog.presets.filter((p) => p.game).map((p) => item(`builtin:${p.id}`, p.name[lang]))}
      {myPresets.length > 0 && <div className="rg-overline games-menu-label">{t("dash.mine")}</div>}
      {myPresets.map((p) => item(`mine:${p.id}`, p.name))}
      <div className="games-menu-sep" />
      {item("none", t("games.noPresetShort"))}
    </motion.div>
  );
}
