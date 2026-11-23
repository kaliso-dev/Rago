// Lanceur de jeux, à l'identique de la maquette v5 (rendus-v5/src/app-games-pi.html, vide : app-games-empty.html) :
// le jeu en tête avec sa grande illustration au bord déchiré, son preset, ses graphismes, sa résolution et sa saturation,
// puis la bibliothèque en vignettes. Le preset se choisit dans PresetPicker (une cover verticale par jeu).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type DisplayInfo, type DisplayProfile, type Game, type GraphicsLevel, type GraphicsStatus } from "../lib/api";
import { catalog, presetForGame } from "../lib/catalog";
import { useStore } from "../lib/store";
import { GFX_DETAILS, GFX_LEVELS, graphicsForGame } from "../lib/graphics";
import { BigIcon, I, Rich } from "../s5/I";
import { Tabs } from "../s5/ui";
import { ago, displayName } from "../s5/text";
import { coverOf } from "../s5/art";
import { PresetPicker, presetCount } from "../components/PresetPicker";

type Filter = "all" | "shooter" | "minecraft" | "other";
type Sort = "launcher" | "recent" | "az";

/** Preset proposé d'office : celui du jeu s'il en a un (Fortnite, Valorant, Minecraft Bedrock…), sinon PvP pour
 * Minecraft Java et ses clients, latence pour les jeux de tir, FPS pour le reste. */
const DEFAULT_PRESET: Record<string, string> = { minecraft: "builtin:mc_pvp", shooter: "builtin:latency", other: "builtin:fps" };
const defaultPreset = (g: Game) => {
  const own = presetForGame(g.name);
  return own ? `builtin:${own.id}` : (DEFAULT_PRESET[g.kind] ?? "builtin:fps");
};

/** Minecraft Java : une seule vignette, quel que soit le nombre de launchers installés (Lunar Client, Badlion, l'officiel…).
 * Le launcher se choisit sur la vignette du jeu en tête ; c'est lui qui est lancé. */
const MC_JAVA = "mc:java";
type Entry = Game & { clients?: Game[]; via?: Game };
/** Le jeu réellement lancé : pour Minecraft, celui du launcher choisi. */
const real = (g: Entry): Game => g.via ?? g;
/** Launcher à ouvrir depuis la puce de la vignette (Steam, Lunar Client…). */
const launcherId = (g: Game) => (g.launcher !== "minecraft" ? g.launcher : g.id === "mc:official" || g.id === "mc:store" ? "minecraft" : g.id.slice(3));

const LAUNCHERS: Record<string, string> = {
  steam: "Steam",
  epic: "Epic Games",
  riot: "Riot Client",
  battlenet: "Battle.net",
  ubisoft: "Ubisoft Connect",
  xbox: "Xbox",
  ea: "EA app",
  roblox: "Roblox",
};
/** Ordre du tri « par launcher » (celui de la maquette). */
const LAUNCHER_ORDER = ["riot", "steam", "epic", "minecraft", "battlenet", "ubisoft", "ea", "xbox", "roblox", "manual"];
/** Nom affiché : sans « Tom Clancy's » ni ™ ® (« Rainbow Six Siege »). */
const kindOf = (g: Game): Exclude<Filter, "all"> => (g.kind === "shooter" || g.kind === "minecraft" ? g.kind : "other");

let lastSort: Sort = "launcher";

/** Graphismes d'un jeu (gamecfg.rs) : état, choix d'un niveau, retour à la copie d'avant. */
function useGraphics(game: string | null, title: string, running: boolean) {
  const { t } = useStore();
  const [status, setStatus] = useState<GraphicsStatus | null>(null);
  const [busy, setBusy] = useState<GraphicsLevel | "restore" | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string; undo?: boolean } | null>(null);
  const refresh = () => (game ? api.graphicsStatus(game).then(setStatus, () => setStatus(null)) : Promise.resolve(setStatus(null)));
  useEffect(() => {
    setStatus(null);
    setNote(null);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, running]);
  const explain = (e: unknown): string => {
    const code = String(e);
    if (code === "running") return t("gfx.running", { game: title });
    if (code === "not_found") return t("gfx.notFound", { game: title });
    if (code === "locked") return t("gfx.locked", { game: title });
    if (code === "unknown_format") return t("gfx.unknown");
    if (code === "no_backup") return t("gfx.noBackup");
    return t("gfx.error", { msg: code });
  };
  const apply = async (level: GraphicsLevel) => {
    if (!game) return;
    setBusy(level);
    setNote(null);
    try {
      const out = await api.graphicsApply(game, level);
      const locked = out.locked > 0 ? ` ${t("gfx.lockedSome", { n: out.locked })}` : "";
      setNote({ tone: "ok", text: (out.changed === 0 ? t("gfx.already") : t("gfx.applied", { game: title })) + locked, undo: out.changed > 0 });
    } catch (e) {
      setNote({ tone: "warn", text: explain(e) });
    } finally {
      setBusy(null);
      void refresh();
    }
  };
  const restore = async () => {
    if (!game) return;
    setBusy("restore");
    setNote(null);
    try {
      await api.graphicsRestore(game);
      setNote({ tone: "ok", text: t("gfx.restored") });
    } catch (e) {
      setNote({ tone: "warn", text: explain(e) });
    } finally {
      setBusy(null);
      void refresh();
    }
  };
  const isRunning = running || !!status?.running;
  const missing = status != null && status.files === 0;
  const allLocked = status != null && status.files > 0 && status.locked === status.files;
  const why = isRunning ? t("gfx.running", { game: title }) : missing ? t("gfx.notFound", { game: title }) : allLocked ? t("gfx.locked", { game: title }) : null;
  return { status, busy, note, apply, restore, blocked: !status || !!why || busy != null, why };
}

export function Games() {
  const { t, lang, premium, setUpsell, applied, gamePresets, setGamePresets, mcLauncher, setMcLauncher, myPresets, optimizeAndPlay, launchGame, playing, requestUndo, run, toApply, goTo } =
    useStore();
  const [games, setGames] = useState<Game[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSortState] = useState<Sort>(lastSort);
  const setSort = (s: Sort) => setSortState((lastSort = s));
  const [pick, setPick] = useState<string | null>(null);
  const [picker, setPicker] = useState<Entry | null>(null);
  const [art, setArt] = useState<Record<string, string | null>>({});
  const [asking, setAsking] = useState(false);
  /** couleurs et résolution réglées par jeu (page Display) */
  const [display, setDisplay] = useState<Record<string, DisplayProfile>>({});
  const [screen, setScreen] = useState<DisplayInfo | null>(null);
  useEffect(() => {
    void api.displayProfiles().then(setDisplay, () => {});
    void api.displayInfo().then(setScreen, () => {});
  }, []);

  const load = async (refresh: boolean) => {
    setScanning(true);
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
      setGames(
        (list) =>
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

  // image officielle (téléchargée une fois par le moteur) des jeux sans image embarquée, trois à la fois
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!games) return;
    const queue = games.filter((g) => !coverOf(g, "wide") && !asked.current.has(g.id)).map((g) => g.id);
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

  const presetRef = (g: Entry) => {
    // Minecraft : le choix fait avant la vignette unique, sur celle du launcher, reste valable
    const ref = gamePresets[g.id] ?? (g.via && gamePresets[g.via.id]) ?? defaultPreset(g);
    // preset perso supprimé depuis, ou preset du catalogue qui n'existe plus : celui d'office
    const gone = ref.startsWith("mine:") ? !myPresets.some((p) => `mine:${p.id}` === ref) : ref.startsWith("builtin:") && !catalog.presets.some((p) => `builtin:${p.id}` === ref);
    return gone ? defaultPreset(g) : ref;
  };
  const resolve = (ref: string): { name: string; entries: string[]; game: boolean } | null => {
    if (ref.startsWith("builtin:")) {
      const p = catalog.presets.find((x) => `builtin:${x.id}` === ref);
      return p ? { name: p.name[lang], entries: p.tweaks, game: !!p.game || p.id === "mc_pvp" } : null;
    }
    const p = myPresets.find((x) => `mine:${x.id}` === ref);
    return p ? { name: p.name, entries: p.t, game: false } : null;
  };

  // les launchers Minecraft ne sont pas des jeux : une vignette « Minecraft », lancée par celui choisi
  const entries = useMemo(() => {
    const clients = (games ?? []).filter((g) => g.launcher === "minecraft");
    const list: Entry[] = (games ?? []).filter((g) => g.launcher !== "minecraft");
    if (clients.length) {
      const byUse = [...clients].sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
      const via = clients.find((c) => c.id === mcLauncher) ?? byUse[0];
      list.push({ ...via, id: MC_JAVA, name: "Minecraft", client: null, running: clients.some((c) => c.running), lastPlayed: byUse[0].lastPlayed, clients, via });
    }
    return list;
  }, [games, mcLauncher]);
  const recent = useMemo(
    () => [...entries].sort((a, b) => Number(b.running) - Number(a.running) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name)),
    [entries],
  );
  const hero = recent.find((g) => g.id === pick) ?? recent[0] ?? null;
  const counts: Record<Filter, number> = { all: entries.length, shooter: 0, minecraft: 0, other: 0 };
  for (const g of entries) counts[kindOf(g)]++;
  const lchOf = (g: Entry) => (g.launcher === "minecraft" ? "minecraft" : g.launcher);
  const shown = (filter === "all" ? recent : recent.filter((g) => kindOf(g) === filter)).slice().sort((a, b) => {
    if (sort === "az") return (a.client ?? a.name).localeCompare(b.client ?? b.name);
    if (sort === "launcher") {
      const ia = LAUNCHER_ORDER.indexOf(lchOf(a));
      const ib = LAUNCHER_ORDER.indexOf(lchOf(b));
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0);
    }
    return 0;
  });
  const launcherCount = new Set(entries.flatMap((g) => (g.clients ?? [g]).map((x) => (x.launcher === "minecraft" ? x.id : x.launcher)))).size;

  const heroPreset = hero ? resolve(presetRef(hero)) : null;
  const heroN = heroPreset ? presetCount(heroPreset.entries) : 0;
  // réglages du preset encore appliqués sur ce PC : ils restent après la fermeture du jeu, on les retire d'ici
  const heroApplied = heroPreset ? heroPreset.entries.map((e) => e.split(":")[0]).filter((id, i, a) => a.indexOf(id) === i && applied.has(id)) : [];
  const heroPending = heroPreset ? toApply(heroPreset.entries).ids.length : 0;
  const busy = !!run;
  const heroTitle = hero ? displayName(hero.client ?? hero.name) : "";
  const gfxGame = hero && hero.kind !== "minecraft" ? graphicsForGame(hero.name) : null;
  const gfx = useGraphics(gfxGame, heroTitle, !!hero?.running);

  /** Nom du jeu lancé, dans le suivi du lancement : « Minecraft (Lunar Client) ». */
  const title = (g: Entry) => (g.via?.client ? `${g.name} (${g.via.client})` : (g.client ?? g.name));
  const play = (g: Entry) => {
    const preset = resolve(presetRef(g));
    if (!preset) return void launchGame(real(g).id, title(g));
    if (!premium) return setUpsell("plan");
    optimizeAndPlay({ id: real(g).id, name: title(g) }, preset.entries);
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
  const remove = async (g: Entry) => {
    const ids = (g.clients ?? [g]).map((x) => x.id);
    for (const id of ids) await api.gameRemove(id);
    setAsking(false);
    setPick(null);
    setGames((list) => list?.filter((x) => !ids.includes(x.id)) ?? list);
  };
  const openLauncher = (g: Game) => void api.launcherLaunch(launcherId(g)).catch(() => {});
  const launcherName = (g: Entry) => (g.via ? (g.via.client ?? "Minecraft") : g.launcher === "manual" ? t("games.manual") : (LAUNCHERS[g.launcher] ?? g.launcher));
  const mine = (g: Entry) => (g.clients ?? [g]).some((x) => x.id === playing?.id);
  const failed = hero && mine(hero) && playing?.status === "failed";
  const starting = hero && mine(hero) && playing?.status === "waiting" && !run;

  /** Image d'un jeu : embarquée (recadrée pour l'emplacement), sinon l'officielle entière sur fond flouté. */
  const cover = (g: Entry, kind: "wide" | "hero", className: string, children?: ReactNode) => {
    const own = coverOf(g, kind);
    const src = own ?? art[real(g).id] ?? art[g.id];
    return (
      <div className={`${className}${!own && src ? " fit" : ""}${!src ? " none" : ""}`} style={src ? { backgroundImage: `url(${src})` } : undefined}>
        {!own && src && <img src={src} alt="" draggable={false} />}
        {!src && <span className="ini">{(g.client ?? g.name).replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 3)}</span>}
        {children}
      </div>
    );
  };

  // préférences d'affichage du jeu en tête (page Display)
  const prof = hero ? (display[real(hero).id] ?? display[hero.id]) : undefined;
  const amd = screen?.vibrance === "amd";
  const base = amd ? 100 : 50;
  const vib = prof?.colors?.vibrance ?? base;
  const longName = heroTitle.length > 13;

  return (
    <div className="pg-games">
      <section className="head">
        <div>
          <p className="kick">
            {t("games.overline")} <b>//</b> {entries.length ? t("s5.games.kick", { n: entries.length, l: launcherCount }) : t("s5.games.kick0")}
          </p>
          <h1 className="title" data-t={t("nav.games")}>
            {t("nav.games")}
          </h1>
        </div>
        {(games == null || entries.length > 0) && (
          <div className="acts">
            <button type="button" className="btn" disabled={scanning} onClick={() => void load(true)}>
              <I n="refresh" className={scanning ? "spin" : undefined} />
              {t("s5.games.rescan")}
            </button>
            <button type="button" className="btn red" onClick={() => void add()}>
              <I n="plus" />
              {t("games.add")}
            </button>
          </div>
        )}
      </section>

      {games == null ? (
        <section className="hero panel loading">
          <div className="art" />
          <div className="body" />
        </section>
      ) : !hero ? (
        <section className="empty panel">
          <span className="bg0">0</span>
          <span className="bgdots" />
          <BigIcon n="games" />
          <div className="tx">
            <h2>
              {t("s5.games.none1")}
              <br />
              {t("s5.games.none2")}
            </h2>
            <p>
              <Rich text={t("s5.games.noneLead")} />
            </p>
            <div className="acts">
              <button type="button" className="btn red lg" onClick={() => void add()}>
                <I n="plus" />
                {t("games.add")}
              </button>
              <button type="button" className="btn lg" disabled={scanning} onClick={() => void load(true)}>
                <I n="refresh" className={scanning ? "spin" : undefined} />
                {t("s5.games.scanAgain")}
              </button>
            </div>
            <p className="hint">{t("s5.games.noneHint")}</p>
          </div>
        </section>
      ) : (
        <section className="hero panel" key={hero.id}>
          {cover(
            hero,
            "hero",
            "art",
            hero.clients && hero.clients.length > 1 ? (
              <button
                type="button"
                className="chip lc"
                title={t("s5.games.viaHint")}
                onClick={() => {
                  const list = hero.clients!;
                  const i = list.findIndex((c) => c.id === hero.via?.id);
                  setMcLauncher(list[(i + 1) % list.length].id);
                }}
              >
                {launcherName(hero)}
                <I n="refresh" line />
              </button>
            ) : (
              <span className="chip lc">{launcherName(hero)}</span>
            ),
          )}
          <div className="body">
            <div className="r1">
              {hero.running ? (
                <span className="chip red">
                  <i className="dot" />
                  {t("games.playing")}
                </span>
              ) : failed ? (
                <span className="chip red">{t("s5.games.failedChip")}</span>
              ) : (
                <span className="chip red">
                  <i className="dot" />
                  {starting ? t("games.starting") : t("s5.games.ready")}
                </span>
              )}
              <span className="chip ghost">{hero.lastPlayed ? t("s5.games.lastPlayed", { ago: ago(lang, hero.lastPlayed, true) }) : t("games.never")}</span>
              <button
                type="button"
                className={`del${asking ? " ask" : ""}`}
                title={t("games.remove")}
                aria-label={t("games.remove")}
                onBlur={() => setAsking(false)}
                onClick={() => (asking ? void remove(hero) : setAsking(true))}
              >
                {asking && <span>{t("games.removeConfirm")}</span>}
                <I n="trash" />
              </button>
            </div>
            <h2 className={`gname${longName ? " long" : ""}`}>{hero.kind === "minecraft" ? "Minecraft" : heroTitle}</h2>
            <div className="score">
              <div className="cell" role="button" tabIndex={0} title={t("s5.games.changePreset")} onClick={() => setPicker(hero)} onKeyDown={(e) => e.key === "Enter" && setPicker(hero)}>
                <span className="lbl">{t("s5.games.preset")}</span>
                <b>{heroPreset ? heroPreset.name : t("games.noPresetShort")}</b>
                <span className="sub">{heroPreset ? t("s5.nav.tweaks", { n: heroN }) : t("s5.games.asIs")}</span>
              </div>
              <div>
                <span className="lbl">{t("s5.games.gfx")}</span>
                {gfxGame ? (
                  <Tabs<GraphicsLevel>
                    value={gfx.busy && gfx.busy !== "restore" ? gfx.busy : (gfx.status?.level ?? null)}
                    onChange={(l) => void gfx.apply(l)}
                    ariaLabel={t("s5.games.gfx")}
                    items={GFX_LEVELS.map((l) => ({ id: l, label: t(`s5.games.gfx.${l}`), disabled: gfx.blocked, title: gfx.why ?? GFX_DETAILS[gfxGame]?.[l]?.[lang] }))}
                  />
                ) : (
                  <>
                    <b>–</b>
                    <span className="sub">{t("s5.games.gfxNone")}</span>
                  </>
                )}
              </div>
              <div className="cell" role="button" tabIndex={0} onClick={() => goTo("display", real(hero).id)} onKeyDown={(e) => e.key === "Enter" && goTo("display", real(hero).id)}>
                <span className="lbl">{t("s5.games.res")}</span>
                {prof?.resolution ? (
                  <>
                    <b>
                      {prof.resolution.width}×{prof.resolution.height}
                    </b>
                    <span className="sub">{prof.resolution.stretch ? t("s5.games.stretched") : t("s5.games.bars")}</span>
                  </>
                ) : (
                  <>
                    <b>{t("s5.games.native")}</b>
                    <span className="sub">{screen?.monitor ? `${screen.monitor.width}×${screen.monitor.height}` : t("s5.games.screen")}</span>
                  </>
                )}
              </div>
              <div className="cell" role="button" tabIndex={0} onClick={() => goTo("display", real(hero).id)} onKeyDown={(e) => e.key === "Enter" && goTo("display", real(hero).id)}>
                <span className="lbl">{t("s5.games.sat")}</span>
                {screen && !screen.vibrance ? (
                  <>
                    <b>–</b>
                    <span className="sub">{t("s5.games.satNone")}</span>
                  </>
                ) : (
                  <>
                    <b>
                      {vib}
                      <small>%</small>
                    </b>
                    <span className="sub">{t("s5.games.satBase", { n: base })}</span>
                  </>
                )}
              </div>
            </div>
            <div className="go">
              {heroPreset && (premium ? heroPending > 0 : true) ? (
                <>
                  <button type="button" className="btn red lg" disabled={busy} onClick={() => play(hero)}>
                    <I n="play" className="play" />
                    {t("games.optimizePlay")}
                  </button>
                  <button type="button" className="btn lg" disabled={busy} onClick={() => void launchGame(real(hero).id, title(hero))}>
                    {t("games.playOnly")}
                  </button>
                </>
              ) : (
                <button type="button" className="btn red lg" disabled={busy} onClick={() => void launchGame(real(hero).id, title(hero))}>
                  <I n="play" className="play" />
                  {t("games.play")}
                </button>
              )}
              <span className={`sub${failed || gfx.note?.tone === "warn" ? " bad" : ""}`}>
                {failed ? (
                  t("games.failed")
                ) : gfx.note ? (
                  <>
                    {gfx.note.text}{" "}
                    {gfx.note.undo && gfx.status?.saved && (
                      <button type="button" className="lk" onClick={() => void gfx.restore()}>
                        {t("gfx.restore")}
                      </button>
                    )}
                  </>
                ) : heroApplied.length > 0 && heroPending === 0 ? (
                  <>
                    {t("games.stayOn", { n: heroApplied.length })}{" "}
                    <button type="button" className="lk" disabled={busy} onClick={() => requestUndo(heroApplied)}>
                      {t("games.removeTweaks")}
                    </button>
                  </>
                ) : heroPreset && premium ? (
                  t("games.applyFirst", { n: heroPending })
                ) : heroPreset ? (
                  t("s5.games.premiumPlay", { n: heroN })
                ) : (
                  t("s5.games.asIsLead")
                )}
              </span>
            </div>
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <>
          <div className="bar">
            <div>
              <h2 className="h2">{t("s5.games.all")}</h2>
              <Tabs<Filter>
                value={filter}
                onChange={setFilter}
                ariaLabel={t("s5.games.all")}
                items={(["all", "shooter", "minecraft", "other"] as const)
                  .filter((f) => f === "all" || counts[f] > 0)
                  .map((f) => ({ id: f, label: t(`s5.games.f.${f}`), n: counts[f] }))}
              />
            </div>
            <Tabs<Sort>
              label={t("s5.games.sort")}
              value={sort}
              onChange={setSort}
              ariaLabel={t("s5.games.sort")}
              items={[
                { id: "launcher", label: t("s5.games.byLauncher") },
                { id: "recent", label: t("s5.games.recent") },
                { id: "az", label: "a-z" },
              ]}
            />
          </div>
          <section className="lib">
            {shown.map((g) => {
              const preset = resolve(presetRef(g));
              const sel = hero?.id === g.id;
              const pname = preset ? (preset.game ? t("s5.pick.presetName", { name: preset.name }) : preset.name) : t("s5.games.noPresetYet");
              return (
                <div key={g.id} className={`gcard${sel ? " sel" : ""}`} onClick={() => setPick(g.id)}>
                  {cover(
                    g,
                    "wide",
                    "cv",
                    <button
                      type="button"
                      className="chip lc"
                      title={t("s5.games.openLauncher", { name: launcherName(g) })}
                      onClick={(e) => {
                        e.stopPropagation();
                        openLauncher(real(g));
                      }}
                    >
                      {launcherName(g)}
                    </button>,
                  )}
                  {g.running && (
                    <span className="chip red tag">
                      <i className="dot" />
                      {t("games.playing")}
                    </span>
                  )}
                  <div className="info">
                    <div>
                      <b>{displayName(g.client ?? g.name)}</b>
                      <span className="sub">{[pname, g.lastPlayed ? ago(lang, g.lastPlayed, true) : null].filter(Boolean).join(" / ").toLowerCase()}</span>
                    </div>
                    <div className="acts2">
                      <button
                        type="button"
                        className="pl ghost"
                        title={t("s5.games.changePreset")}
                        aria-label={t("s5.games.changePreset")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPicker(g);
                        }}
                      >
                        <I n="sliders" />
                      </button>
                      <button
                        type="button"
                        className="pl"
                        title={premium && preset ? t("games.optimizePlay") : t("games.play")}
                        aria-label={t("games.play")}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (premium && preset) play(g);
                          else void launchGame(real(g).id, title(g));
                        }}
                      >
                        <I n="play" className="play" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {picker && (
        <PresetPicker
          game={picker.kind === "minecraft" ? "Minecraft" : displayName(picker.client ?? picker.name)}
          value={presetRef(picker)}
          games={games ?? []}
          onClose={() => setPicker(null)}
          onPick={(ref) => {
            setGamePresets((m) => ({ ...m, [picker.id]: ref }));
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

