import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Eye, Gamepad2, Info, Lock, MonitorCog, Palette, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { api, type DisplayColors, type DisplayInfo, type DisplayProfile, type DisplayResolution, type DisplayState, type Game } from "../lib/api";
import { hue, initials } from "../lib/art";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Badge, Button, Segmented, Switch } from "../components/ui";
import prosData from "../data/pros.json";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

type ProGame = "valorant" | "cs2" | "fortnite";
/** Un pro de data/pros.json (relevé à la main, voir son `_doc`). */
interface Pro {
  id: string;
  name: string;
  game: ProGame;
  /** Digital Vibrance du panneau NVIDIA (50 = Windows) ; null : pas publiée */
  vibrance: number | null;
  /** null : résolution native */
  resolution: [number, number] | null;
  stretch: boolean;
  source: string;
  url: string;
  checked: string;
  /** réglages de son écran (affichés seulement) */
  monitor?: string;
  /** réglages dans le jeu (affichés seulement) */
  ingame?: string;
}
const PROS_FILE = prosData as unknown as { updated: string; pros: Pro[] };
const PROS = PROS_FILE.pros;

/** Jeux dont Rago Optimizer connaît les pros et le fichier de réglages (display.rs `GameFile::of`). */
const proGameOf = (id: string): ProGame | null =>
  id === "riot:valorant" ? "valorant" : id === "steam:730" ? "cs2" : id.toLowerCase() === "epic:fortnite" ? "fortnite" : null;
const PRO_GAMES: { id: ProGame; label: string }[] = [
  { id: "valorant", label: "Valorant" },
  { id: "cs2", label: "CS2" },
  { id: "fortnite", label: "Fortnite" },
];

const WINDOWS: DisplayColors = { vibrance: 50, brightness: 0, contrast: 0, gamma: 100 };
/** Couleurs allumées pour la première fois : une saturation franche (70 %, celle de Peterbot et Veno sur Fortnite). */
const FIRST_COLORS: DisplayColors = { ...WINDOWS, vibrance: 70 };
/** Résolution allumée pour la première fois : la plus jouée par les pros du jeu (csdb.gg, prosettings.net). */
const FIRST_RES: Record<ProGame | "other", [number, number]> = { valorant: [1440, 1080], cs2: [1280, 960], fortnite: [1650, 1080], other: [1440, 1080] };

/** Résolutions des pros, en tête : 4:3 étirée (Valorant, CS2), 5:4, 16:10, et les étirées de Fortnite. */
const COMMON: { w: number; h: number; hint: string }[] = [
  { w: 1440, h: 1080, hint: "4:3" },
  { w: 1280, h: 960, hint: "4:3" },
  { w: 1024, h: 768, hint: "4:3" },
  { w: 1280, h: 1024, hint: "5:4" },
  { w: 1680, h: 1050, hint: "16:10" },
  { w: 1650, h: 1080, hint: "Fortnite" },
  { w: 1720, h: 1080, hint: "Fortnite" },
  { w: 1750, h: 1080, hint: "Fortnite" },
];

const MC_JAVA = "mc:java";
const EMPTY: DisplayProfile = { colors: null, resolution: null, pro: null };
const PREVIEW_MS = 5000;
const SAVE_MS = 350;
const REMEMBER = "rago.displayGame";

/** Un jeu de la page : Minecraft Java (tous ses launchers) n'en fait qu'un, comme dans Jeux. */
interface Entry {
  id: string;
  name: string;
  running: boolean;
  lastPlayed: number | null;
  /** jeu dont l'image sert (pour Minecraft : son launcher le plus joué) */
  art: string;
}

function entries(games: Game[]): Entry[] {
  const list: Entry[] = games
    .filter((g) => g.launcher !== "minecraft")
    .map((g) => ({ id: g.id, name: g.client ?? g.name, running: g.running, lastPlayed: g.lastPlayed, art: g.id }));
  const mc = games.filter((g) => g.launcher === "minecraft").sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  if (mc.length) list.push({ id: MC_JAVA, name: "Minecraft", running: mc.some((g) => g.running), lastPlayed: mc[0].lastPlayed, art: mc[0].id });
  return list.sort((a, b) => Number(b.running) - Number(a.running) || (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name));
}

/** Clé du profil d'un jeu (display.rs `profile_key`) : tous les launchers de Minecraft Java partagent le sien. */
const profileKey = (id: string) => (id.startsWith("mc:") && id !== "mc:bedrock" ? MC_JAVA : id);

const remembered = () => {
  try {
    return localStorage.getItem(REMEMBER);
  } catch {
    return null;
  }
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Display() {
  const { t, lang, license, premium, setUpsell, goTo, focusTweak, setFocusTweak } = useStore();
  const [games, setGames] = useState<Entry[] | null>(null);
  const [info, setInfo] = useState<DisplayInfo | null>(null);
  const [profiles, setProfiles] = useState<Record<string, DisplayProfile>>({});
  const [live, setLive] = useState<DisplayState>({ colors: null, resolution: null, error: null });
  const [hidden, setHidden] = useState<string | null>(null);
  // ouverte depuis la fiche d'un jeu (Jeux) : ce jeu, sinon le dernier réglé ici
  const [pick, setPick] = useState<string | null>(() => (focusTweak ? profileKey(focusTweak) : remembered()));
  const [art, setArt] = useState<Record<string, string | null>>({});
  const [proTab, setProTab] = useState<ProGame | null>(null);
  const [more, setMore] = useState<Record<string, boolean>>({});
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (focusTweak) setFocusTweak(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    void api.gamesList(false).then(
      (g) => alive && setGames(entries(g)),
      () => alive && setGames([]),
    );
    void api.displayInfo().then((i) => alive && setInfo(i), () => {});
    void api.displayProfiles().then((p) => alive && setProfiles(p), () => {});
    void api.displayState().then((s) => alive && setLive(s), () => {});
    const subs = [
      api.onDisplayState(setLive),
      api.onGamesRunning((ids) =>
        setGames(
          (list) =>
            list?.map((g) => {
              const running = g.id === MC_JAVA ? ids.some((id) => id.startsWith("mc:")) : ids.includes(g.id);
              return running === g.running ? g : { ...g, running };
            }) ?? list,
        ),
      ),
    ];
    return () => {
      alive = false;
      for (const s of subs) void s.then((un) => un());
    };
  }, []);

  // vignettes des jeux : les images de Jeux, déjà sur le disque (une fois par jeu, même quand un jeu se lance)
  const artKey = JSON.stringify(games?.map((g) => [g.id, g.art]) ?? []);
  useEffect(() => {
    const queue = JSON.parse(artKey) as [string, string][];
    let alive = true;
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [id, from] = next;
        const src = await api.gameArt(from).catch(() => null);
        if (alive) setArt((a) => ({ ...a, [id]: src }));
      }
    };
    void Promise.all([worker(), worker(), worker()]);
    return () => {
      alive = false;
    };
  }, [artKey]);

  // enregistrement : un curseur qui bouge n'écrit qu'une fois, à l'arrêt ; ce qui reste part en quittant la page
  const timers = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, DisplayProfile | null>());
  const send = useCallback(
    async (id: string, p: DisplayProfile | null) => {
      try {
        setLive(await api.displaySetProfile(id, p));
      } catch (e) {
        // Premium fini entre-temps : le moteur refuse le preset du pro, la page reprend ce qui est enregistré
        if (String(e) === "premium:no_license") setUpsell("plan");
        void api.displayProfiles().then(setProfiles, () => {});
      }
    },
    [setUpsell],
  );
  useEffect(() => {
    const t = timers.current;
    const p = pending.current;
    return () => {
      for (const [id, profile] of p) {
        clearTimeout(t.get(id));
        void api.displaySetProfile(id, profile).catch(() => {});
      }
    };
  }, []);
  const update = (id: string, p: DisplayProfile, now = false) => {
    const clean = p.colors || p.resolution || p.pro ? p : null;
    setProfiles((m) => {
      const next = { ...m };
      if (clean) next[id] = clean;
      else delete next[id];
      return next;
    });
    clearTimeout(timers.current.get(id));
    const fire = () => {
      timers.current.delete(id);
      pending.current.delete(id);
      void send(id, clean);
    };
    if (now) return fire();
    pending.current.set(id, clean);
    timers.current.set(id, window.setTimeout(fire, SAVE_MS));
  };

  // aperçu : 5 secondes sur l'écran principal, prolongées tant qu'on bouge les curseurs
  const previewTimer = useRef<number | undefined>(undefined);
  const previewOn = useRef(false);
  const preview = (c: DisplayColors) => {
    previewOn.current = true;
    setPreviewing(true);
    void api.displayPreview(c).catch(() => {});
    clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      previewOn.current = false;
      setPreviewing(false);
      void api.displayPreview(null).catch(() => {});
    }, PREVIEW_MS);
  };
  useEffect(
    () => () => {
      clearTimeout(previewTimer.current);
      if (previewOn.current) void api.displayPreview(null).catch(() => {});
    },
    [],
  );

  // valeurs d'avant un interrupteur éteint : rallumé, il les retrouve
  const lastColors = useRef(new Map<string, DisplayColors>());
  const lastRes = useRef(new Map<string, DisplayResolution>());

  const game = games?.find((g) => g.id === pick) ?? games?.[0] ?? null;
  // un autre jeu : les pros de ce jeu
  useEffect(() => setProTab(null), [game?.id]);
  const choose = (id: string) => {
    setPick(id);
    try {
      localStorage.setItem(REMEMBER, id);
    } catch {
      /* rien à retenir */
    }
  };

  const nameOf = (id: string) => games?.find((g) => g.id === id)?.name ?? id;
  const error = live.error && live.error !== hidden ? live.error : null;
  // erreur réglée depuis : la même, si elle revient, se montre de nouveau
  useEffect(() => {
    if (!live.error) setHidden(null);
  }, [live.error]);

  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const loc = lang === "fr" ? "fr-FR" : "en-US";
    return d
      ? new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d))
      : new Intl.DateTimeFormat(loc, { month: "short", year: "numeric" }).format(new Date(y, m - 1, 1));
  };

  return (
    <motion.div className="page display" variants={stagger} initial="initial" animate="animate">
      <motion.header className="page-head" variants={rise}>
        <div className="rg-overline">{t("display.overline")}</div>
        <h1>{t("display.title")}</h1>
        <p className="lead">{t("display.lead")}</p>
      </motion.header>

      <motion.div variants={rise} className={`display-live${live.colors || live.resolution ? " on" : ""}`} aria-live="polite">
        <span className={`dot${live.colors || live.resolution ? " dot-ok" : ""}`} />
        <span className="display-live-text">
          {live.colors || live.resolution
            ? [
                live.colors === "preview" ? t("display.live.preview") : live.colors ? t("display.live.colors", { game: nameOf(live.colors) }) : null,
                live.resolution ? t("display.live.resolution", { game: nameOf(live.resolution) }) : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : t("display.live.idle")}
        </span>
        {error && (
          <span className="display-live-error">
            <TriangleAlert size={13} />
            {t(`display.err.${error}` as Key)}
            <button type="button" className="link small" onClick={() => setHidden(error)}>
              {t("display.hide")}
            </button>
          </span>
        )}
      </motion.div>

      {games == null ? (
        <motion.div variants={rise} className="card display-skeleton skeleton">
          <div className="skeleton-line" />
        </motion.div>
      ) : !game ? (
        <motion.div variants={rise} className="card games-empty">
          <h3>{t("display.noGames")}</h3>
          <p className="muted small">{t("display.noGamesLead")}</p>
          <div className="share-actions">
            <Button size="sm" variant="primary" icon={<Gamepad2 size={13} />} onClick={() => goTo("games")}>
              {t("display.openGames")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.section variants={rise} className="display-games">
            <h2 className="section-title rg-overline">{t("display.games")}</h2>
            <div className="display-games-row" role="radiogroup" aria-label={t("display.games")}>
              {games.map((g) => {
                const on = g.id === game.id;
                const p = profiles[g.id];
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`display-game${on ? " on" : ""}`}
                    onClick={() => choose(g.id)}
                  >
                    <span className="display-game-art" style={{ "--h": hue(g.id === MC_JAVA ? "minecraft" : g.id) } as React.CSSProperties}>
                      {art[g.id] ? <img src={art[g.id]!} alt="" draggable={false} /> : g.id === MC_JAVA ? "MC" : initials(g.name)}
                    </span>
                    <span className="display-game-name">{g.name}</span>
                    {g.running ? (
                      <span className="dot dot-ok" title={t("games.playing")} />
                    ) : (
                      (p?.colors || p?.resolution) && <span className="display-game-set" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>

          <GamePanel
            key={game.id}
            game={game}
            info={info}
            profile={profiles[game.id] ?? EMPTY}
            more={more[game.id]}
            setMore={(v) => setMore((m) => ({ ...m, [game.id]: v }))}
            previewing={previewing}
            preview={preview}
            lastColors={lastColors.current}
            lastRes={lastRes.current}
            onChange={(p, now) => update(game.id, p, now)}
          />

          <motion.section variants={rise} className="card display-pros">
            <header className="card-head">
              <h3 className="rg-overline display-card-title">
                <Sparkles size={13} />
                {t("display.pros")}
                {license && !premium && (
                  <Badge tone="red">
                    <Lock size={10} />
                    {t("free.lock")}
                  </Badge>
                )}
              </h3>
              <Segmented layoutId="display-pro-game" value={proTab ?? proGameOf(game.id) ?? "valorant"} options={PRO_GAMES} onChange={setProTab} />
            </header>
            <p className="muted small display-lead">{t("display.prosLead", { date: fmtDate(PROS_FILE.updated), game: game.name })}</p>
            {!proGameOf(game.id) && <p className="display-note small">{t("display.prosOther")}</p>}
            <div className="display-pro-grid">
              {PROS.filter((p) => p.game === (proTab ?? proGameOf(game.id) ?? "valorant")).map((p) => (
                <ProCard
                  key={p.id}
                  pro={p}
                  on={profiles[game.id]?.pro === p.id}
                  locked={!premium}
                  date={fmtDate(p.checked)}
                  onImport={() => {
                    if (!premium) return setUpsell("plan");
                    const now = profiles[game.id] ?? EMPTY;
                    // saturation pas publiée : les couleurs du joueur restent ; 50 % : celles de Windows
                    const colors = p.vibrance == null ? now.colors : p.vibrance === 50 ? null : { ...WINDOWS, vibrance: p.vibrance };
                    const resolution = p.resolution
                      ? { width: p.resolution[0], height: p.resolution[1], stretch: p.stretch, gameFile: proGameOf(game.id) !== null }
                      : null;
                    update(game.id, { colors, resolution, pro: p.id }, true);
                  }}
                />
              ))}
            </div>
          </motion.section>

          <motion.p variants={rise} className="display-how muted small">
            <Info size={13} />
            {t("display.how")}
          </motion.p>
        </>
      )}
    </motion.div>
  );
}

/** Couleurs et résolution d'un jeu : deux cartes, un interrupteur chacune. */
function GamePanel({
  game,
  info,
  profile,
  more,
  setMore,
  previewing,
  preview,
  lastColors,
  lastRes,
  onChange,
}: {
  game: Entry;
  info: DisplayInfo | null;
  profile: DisplayProfile;
  more: boolean | undefined;
  setMore: (v: boolean) => void;
  previewing: boolean;
  preview: (c: DisplayColors) => void;
  lastColors: Map<string, DisplayColors>;
  lastRes: Map<string, DisplayResolution>;
  onChange: (p: DisplayProfile, now?: boolean) => void;
}) {
  const { t } = useStore();
  const colors = profile.colors;
  const res = profile.resolution;
  const pg = proGameOf(game.id);
  const modes = info?.monitor?.modes ?? null;
  const has = (w: number, h: number) => !modes || modes.some(([mw, mh]) => mw === w && mh === h);

  // un réglage changé à la main : ce n'est plus le preset du pro
  const setColors = (c: DisplayColors | null) => {
    onChange({ ...profile, colors: c, pro: null });
    if (c && previewing) preview(c);
  };
  const setRes = (r: DisplayResolution | null) => onChange({ ...profile, resolution: r, pro: null });

  const toggleColors = (on: boolean) => {
    // sans saturation sur cet écran (Intel) : les couleurs de Windows, la luminosité et le contraste restent réglables
    if (on) return setColors(lastColors.get(game.id) ?? (info?.vibrance === null ? WINDOWS : FIRST_COLORS));
    if (colors) lastColors.set(game.id, colors);
    setColors(null);
  };
  const toggleRes = (on: boolean) => {
    if (!on) {
      if (res) lastRes.set(game.id, res);
      return setRes(null);
    }
    const [width, height] = FIRST_RES[pg ?? "other"];
    setRes(lastRes.get(game.id) ?? { width, height, stretch: true, gameFile: pg !== null });
  };

  const advanced = more ?? (!!colors && (colors.brightness !== 0 || colors.contrast !== 0 || colors.gamma !== 100));
  const inCommon = res ? COMMON.some((c) => c.w === res.width && c.h === res.height) : false;
  const others = (modes ?? []).filter(([w, h]) => !COMMON.some((c) => c.w === w && c.h === h));
  const missing = res ? !has(res.width, res.height) : false;
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="display-grid">
      <motion.section variants={rise} className={`card display-card${colors ? "" : " off"}`}>
        <header className="card-head">
          <h3 className="rg-overline display-card-title">
            <Palette size={13} />
            {t("display.colors")}
          </h3>
          <Switch checked={!!colors} onChange={toggleColors} label={t("display.colors")} />
        </header>
        <p className="muted small display-lead">{colors ? t("display.colorsLead", { game: game.name }) : t("display.colorsOff", { game: game.name })}</p>
        {colors && (
          <>
            <Slider
              label={t("display.vibrance")}
              value={colors.vibrance}
              min={50}
              max={100}
              display={`${colors.vibrance} %`}
              hint={info?.vibrance === "amd" ? t("display.vibranceAmd", { n: 100 + (colors.vibrance - 50) * 2 }) : undefined}
              ends={[t("display.windows"), t("display.max")]}
              disabled={info !== null && info.vibrance === null}
              onChange={(v) => setColors({ ...colors, vibrance: v })}
            />
            {info !== null && info.vibrance === null && <p className="display-note small">{t("display.vibranceNone")}</p>}
            <button type="button" className="link small display-more" aria-expanded={advanced} onClick={() => setMore(!advanced)}>
              <ChevronDown size={13} className={advanced ? "flip" : undefined} />
              {t("display.more")}
            </button>
            {advanced && (
              <div className="display-more-body">
                <Slider
                  label={t("display.brightness")}
                  value={colors.brightness}
                  min={-30}
                  max={30}
                  display={signed(colors.brightness)}
                  ends={[t("display.darker"), t("display.lighter")]}
                  onChange={(v) => setColors({ ...colors, brightness: v })}
                />
                <Slider
                  label={t("display.contrast")}
                  value={colors.contrast}
                  min={-30}
                  max={30}
                  display={signed(colors.contrast)}
                  ends={["-30", "+30"]}
                  onChange={(v) => setColors({ ...colors, contrast: v })}
                />
                <Slider
                  label={t("display.gamma")}
                  value={colors.gamma}
                  min={70}
                  max={150}
                  display={(colors.gamma / 100).toFixed(2)}
                  ends={[t("display.darker"), t("display.lighter")]}
                  onChange={(v) => setColors({ ...colors, gamma: v })}
                />
              </div>
            )}
            <div className="display-actions">
              <Button size="sm" icon={<Eye size={13} />} disabled={previewing} onClick={() => preview(colors)}>
                {previewing ? t("display.previewing") : t("display.preview")}
              </Button>
              <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setColors(WINDOWS)}>
                {t("display.reset")}
              </Button>
            </div>
          </>
        )}
      </motion.section>

      <motion.section variants={rise} className={`card display-card${res ? "" : " off"}`}>
        <header className="card-head">
          <h3 className="rg-overline display-card-title">
            <MonitorCog size={13} />
            {t("display.resolution")}
          </h3>
          <Switch checked={!!res} onChange={toggleRes} label={t("display.resolution")} />
        </header>
        <p className="muted small display-lead">{res ? t("display.resolutionLead", { game: game.name }) : t("display.resolutionOff", { game: game.name })}</p>
        {info?.monitor && (
          <p className="display-screen small rg-metric">
            {t("display.screen", { w: info.monitor.width, h: info.monitor.height, hz: info.monitor.hz })}
          </p>
        )}
        {res && (
          <>
            <div className="display-res-grid" role="radiogroup" aria-label={t("display.resolution")}>
              {COMMON.map((c) => {
                const on = res.width === c.w && res.height === c.h;
                const absent = !has(c.w, c.h);
                return (
                  <button
                    key={`${c.w}x${c.h}`}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`display-res${on ? " on" : ""}${absent ? " absent" : ""}`}
                    onClick={() => setRes({ ...res, width: c.w, height: c.h })}
                  >
                    <span className="display-res-value rg-metric">
                      {c.w}×{c.h}
                    </span>
                    <span className="display-res-hint">{absent ? t("display.missing") : c.hint}</span>
                  </button>
                );
              })}
            </div>
            {others.length > 0 && (
              <label className="no-select display-other">
                <span className="no-select-label">{t("display.other")}</span>
                <span className="no-select-box">
                  <select
                    value={!inCommon && has(res.width, res.height) ? `${res.width}x${res.height}` : ""}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split("x").map(Number);
                      if (w && h) setRes({ ...res, width: w, height: h });
                    }}
                  >
                    <option value="" disabled>
                      {t("display.otherNone")}
                    </option>
                    {others.map(([w, h]) => (
                      <option key={`${w}x${h}`} value={`${w}x${h}`}>
                        {w}×{h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </span>
              </label>
            )}
            <div className="display-stretch">
              <Segmented
                layoutId="display-stretch"
                value={res.stretch ? "stretch" : "bars"}
                options={[
                  { id: "stretch", label: t("display.stretch") },
                  { id: "bars", label: t("display.bars") },
                ]}
                onChange={(v) => setRes({ ...res, stretch: v === "stretch" })}
              />
            </div>
            {missing && (
              <p className="display-note warn small">
                <TriangleAlert size={13} />
                {t("display.missingHelp", { res: `${res.width}×${res.height}` })}
              </p>
            )}
            {res.stretch && <p className="muted small display-help">{t("display.stretchHelp")}</p>}
            {pg && (
              <div className="no-toggle display-file" onClick={() => onChange({ ...profile, resolution: { ...res, gameFile: !res.gameFile } })}>
                <div className="no-toggle-text">
                  <div className="no-toggle-title">{t("display.gameFile", { game: game.name })}</div>
                  <div className="no-toggle-desc">{t("display.gameFileHint")}</div>
                </div>
                <Switch
                  checked={res.gameFile}
                  onChange={(v) => onChange({ ...profile, resolution: { ...res, gameFile: v } })}
                  label={t("display.gameFile", { game: game.name })}
                />
              </div>
            )}
            <p className="muted small display-help">{t("display.launchTip", { game: game.name })}</p>
          </>
        )}
      </motion.section>
    </div>
  );
}

/** Curseur de la page (style de Packet Optimizer). */
function Slider({
  label,
  value,
  min,
  max,
  display,
  hint,
  ends,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  hint?: string;
  ends: [string, string];
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`no-slider display-slider${disabled ? " disabled" : ""}`}>
      <div className="no-slider-head">
        <span className="no-slider-label">{label}</span>
        <span className="no-slider-value">
          {display}
          {hint && <span className="display-slider-hint">{hint}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="no-slider-ends muted">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

/** Carte d'un pro : ses couleurs et sa résolution, ce qu'il règle sur son écran et dans le jeu, sa source. */
function ProCard({ pro, on, locked, date, onImport }: { pro: Pro; on: boolean; locked: boolean; date: string; onImport: () => void }) {
  const { t } = useStore();
  const vibrance = pro.vibrance == null ? t("display.notPublished") : pro.vibrance === 50 ? t("display.windowsColors") : t("display.chipVibrance", { n: pro.vibrance });
  const res = pro.resolution ? `${pro.resolution[0]}×${pro.resolution[1]}` : null;
  const resolution = !res ? t("display.native") : t(pro.stretch ? "display.stretched" : "display.barsShort", { res });
  return (
    <div className={`display-pro${on ? " on" : ""}`}>
      <div className="display-pro-head">
        <span className="display-pro-avatar" style={{ "--h": hue(pro.id) } as React.CSSProperties}>
          {initials(pro.name)}
        </span>
        <div className="display-pro-who">
          <div className="display-pro-name">{pro.name}</div>
          <div className="display-pro-sum small">
            {cap(vibrance)} · {resolution}
          </div>
        </div>
      </div>
      {(pro.monitor || pro.ingame) && (
        <dl className="display-pro-tips small">
          {pro.monitor && (
            <div>
              <dt>{t("display.monitorTip")}</dt>
              <dd>{pro.monitor}</dd>
            </div>
          )}
          {pro.ingame && (
            <div>
              <dt>{t("display.ingameTip")}</dt>
              <dd>{pro.ingame}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="display-pro-foot">
        <button
          type="button"
          className="display-pro-source"
          // relevé au mois près (specs.gg) : « vérifié en nov. 2026 »
          title={`${pro.url} · ${t(pro.checked.length === 7 ? "display.checkedMonth" : "display.checked", { date })}`}
          onClick={() => void api.openUrl(pro.url)}
        >
          <span className="display-pro-site">
            {pro.source}
            <ArrowUpRight size={11} />
          </span>
          <span className="display-pro-date">{date}</span>
        </button>
        <Button
          size="sm"
          variant={on ? "secondary" : "primary"}
          icon={locked ? <Lock size={12} /> : on ? <Check size={13} /> : undefined}
          disabled={on}
          onClick={onImport}
        >
          {on ? t("display.imported") : t("display.import")}
        </Button>
      </div>
    </div>
  );
}
