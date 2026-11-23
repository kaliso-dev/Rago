// Couleurs et résolution par jeu (display.rs), à l'identique de la maquette rendus-v5/src/app-display-pi.html (23/11/2026) :
// face à face Windows contre le jeu sur une capture du jeu, ligne déchirée à glisser, filtres calculés comme le moteur
// (saturation, puis rampe gamma de display.rs `ramp`), tuiles de résolution, réglages des pros avec leur photo.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { api, type DisplayColors, type DisplayInfo, type DisplayProfile, type DisplayResolution, type DisplayState, type Game } from "../lib/api";
import { initials } from "../lib/art";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import prosData from "../data/pros.json";
import { BigIcon, I, Rich } from "../s5/I";
import { Sw, Tabs } from "../s5/ui";
import { coverOf, proPhoto } from "../s5/art";
import { displayName } from "../s5/text";

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
  /** réglages de son écran (en info-bulle) */
  monitor?: string;
  /** réglages dans le jeu (en info-bulle) */
  ingame?: string;
}
const PROS_FILE = prosData as unknown as { updated: string; pros: Pro[] };
const PROS = PROS_FILE.pros;

/** Jeux dont Rago Optimizer connaît les pros et le fichier de réglages (display.rs `GameFile::of`). */
const proGameOf = (id: string): ProGame | null =>
  id === "riot:valorant" ? "valorant" : id === "steam:730" ? "cs2" : id.toLowerCase() === "epic:fortnite" ? "fortnite" : null;
const PRO_GAMES: { id: ProGame; label: string }[] = [
  { id: "valorant", label: "valorant" },
  { id: "cs2", label: "cs2" },
  { id: "fortnite", label: "fortnite" },
];

const WINDOWS: DisplayColors = { vibrance: 50, brightness: 0, contrast: 0, gamma: 100 };
/** Couleurs allumées pour la première fois : une saturation franche (70 %, celle de Peterbot et Veno sur Fortnite). */
const FIRST_COLORS: DisplayColors = { ...WINDOWS, vibrance: 70 };
/** Résolution allumée pour la première fois : la plus jouée par les pros du jeu (csdb.gg, prosettings.net). */
const FIRST_RES: Record<ProGame | "other", [number, number]> = { valorant: [1440, 1080], cs2: [1280, 960], fortnite: [1650, 1080], other: [1440, 1080] };
/** Tuiles de résolution après « native » : celles des pros (4:3 étirée, 5:4, 16:10), et les étirées de Fortnite. */
const FOUR_THREE: [number, number][] = [
  [1440, 1080],
  [1280, 960],
  [1024, 768],
  [1280, 1024],
  [1680, 1050],
];
const TILES: Record<ProGame | "other", [number, number][]> = {
  valorant: FOUR_THREE,
  cs2: FOUR_THREE,
  other: FOUR_THREE,
  fortnite: [
    [1650, 1080],
    [1720, 1080],
    [1750, 1080],
    [1440, 1080],
    [1680, 1050],
  ],
};
/** Taille du petit écran dessiné dans une tuile (celles de la maquette, sinon d'après la largeur). */
const RECT: Record<string, [number, number]> = { "1440x1080": [46, 34.5], "1280x960": [42, 31.5], "1024x768": [36, 27], "1280x1024": [40, 32], "1680x1050": [46, 28.8] };
const rectOf = (w: number, h: number): [number, number] => {
  if (RECT[`${w}x${h}`]) return RECT[`${w}x${h}`];
  const width = Math.min(50, Math.max(30, 36 + (w - 1024) * 0.024));
  return [width, Math.round((width * h * 10) / w) / 10];
};

const MC_JAVA = "mc:java";
const EMPTY: DisplayProfile = { colors: null, resolution: null, pro: null };
const PREVIEW_MS = 5000;
const SAVE_MS = 350;
const REMEMBER = "rago.displayGame";
/** Onglets de jeux montrés avant « +N ». */
const TABS_SHOWN = 5;
/** Pros montrés avant « les N pros ». */
const PROS_SHOWN = 3;
/** Filtre SVG de l'aperçu : la rampe gamma de display.rs (luminosité, contraste, gamma). */
const RAMP = "rg-display-ramp";

/** Un jeu de la page : Minecraft Java (tous ses launchers) n'en fait qu'un, comme dans Jeux. */
interface Entry {
  id: string;
  name: string;
  running: boolean;
  lastPlayed: number | null;
  /** jeu dont l'image sert (pour Minecraft : son launcher le plus joué) */
  art: Pick<Game, "id" | "name" | "kind">;
}

/** Les jeux de la page, dans l'ordre des onglets : lancé, déjà réglé, jeu des pros, puis le plus récent. */
function entries(games: Game[], profiles: Record<string, DisplayProfile>): Entry[] {
  const list: Entry[] = games
    .filter((g) => g.launcher !== "minecraft")
    .map((g) => ({ id: g.id, name: displayName(g.client ?? g.name), running: g.running, lastPlayed: g.lastPlayed, art: g }));
  const mc = games.filter((g) => g.launcher === "minecraft").sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  if (mc.length) list.push({ id: MC_JAVA, name: "Minecraft", running: mc.some((g) => g.running), lastPlayed: mc[0].lastPlayed, art: mc[0] });
  const set = (id: string) => Number(!!(profiles[id]?.colors || profiles[id]?.resolution));
  const pro = (id: string) => Number(proGameOf(id) !== null);
  return list.sort(
    (a, b) =>
      Number(b.running) - Number(a.running) ||
      set(b.id) - set(a.id) ||
      pro(b.id) - pro(a.id) ||
      (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) ||
      a.name.localeCompare(b.name),
  );
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

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const needsRamp = (c: DisplayColors) => c.brightness !== 0 || c.contrast !== 0 || c.gamma !== 100;
/** Nom de la carte graphique comme sur la maquette : « geforce rtx 4070 » (sans la marque ni ™ ®). */
const gpuName = (name: string) =>
  name
    .replace(/^(NVIDIA|AMD|Intel\(R\)|Intel)\s+/i, "")
    .replace(/\(TM\)|\(R\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toLowerCase();

export function Display() {
  const { t, lang, premium, setUpsell, goTo, focusTweak, setFocusTweak, sys } = useStore();
  const [games, setGames] = useState<Entry[] | null>(null);
  const [info, setInfo] = useState<DisplayInfo | null>(null);
  const [profiles, setProfiles] = useState<Record<string, DisplayProfile>>({});
  const [live, setLive] = useState<DisplayState>({ colors: null, resolution: null, error: null });
  const [hidden, setHidden] = useState<string | null>(null);
  // ouverte depuis la fiche d'un jeu (Jeux) : ce jeu, sinon le dernier réglé ici
  const [pick, setPick] = useState<string | null>(() => (focusTweak ? profileKey(focusTweak) : remembered()));
  const [allGames, setAllGames] = useState(false);
  const [proTab, setProTab] = useState<ProGame | null>(null);
  const [allPros, setAllPros] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [art, setArt] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (focusTweak) setFocusTweak(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([api.gamesList(false), api.displayProfiles().catch(() => ({}) as Record<string, DisplayProfile>)]).then(
      ([g, p]) => {
        if (!alive) return;
        setProfiles(p);
        setGames(entries(g, p));
      },
      () => alive && setGames([]),
    );
    void api.displayInfo().then((i) => alive && setInfo(i), () => {});
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

  // aperçu : 5 secondes sur l'écran principal, prolongées tant qu'on bouge les réglages
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
  // un autre jeu : ses pros, les trois premiers
  useEffect(() => {
    setProTab(null);
    setAllPros(false);
  }, [game?.id]);
  const choose = (id: string) => {
    setPick(id);
    try {
      localStorage.setItem(REMEMBER, id);
    } catch {
      /* rien à retenir */
    }
  };

  // capture du jeu pour l'aperçu : celle embarquée, sinon l'image officielle que le moteur a téléchargée
  const embedded = game ? (coverOf(game.art, "play") ?? coverOf(game.art, "hero") ?? coverOf(game.art, "wide")) : null;
  useEffect(() => {
    if (!game || embedded || game.id in art) return;
    let alive = true;
    void api.gameArt(game.art.id).then(
      (src) => alive && setArt((a) => ({ ...a, [game.id]: src })),
      () => alive && setArt((a) => ({ ...a, [game.id]: null })),
    );
    return () => {
      alive = false;
    };
  }, [game, embedded, art]);
  const shot = embedded ?? (game ? (art[game.id] ?? null) : null);

  const error = live.error && live.error !== hidden ? live.error : null;
  // erreur réglée depuis : la même, si elle revient, se montre de nouveau
  useEffect(() => {
    if (!live.error) setHidden(null);
  }, [live.error]);

  const loc = lang === "fr" ? "fr-FR" : "en-US";
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return d
      ? new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d))
      : new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  };
  const month = (s: string) => {
    const [y, m] = s.split("-").map(Number);
    return new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)).toLowerCase();
  };

  const head = (
    <section className="head">
      <div>
        <p className="kick">
          {t("s5.display.kick")} <b>//</b> {t("s5.display.kickLead")}
        </p>
        <h1 className="title" data-t={t("nav.display")}>
          {t("nav.display")}
        </h1>
      </div>
      {game && (
        <div className="acts">
          <button
            type="button"
            className="btn"
            disabled={!profiles[game.id]?.colors || previewing}
            title={t("s5.display.previewTitle")}
            onClick={() => {
              const c = profiles[game.id]?.colors;
              if (c) preview(c);
            }}
          >
            <I n="eye" />
            {previewing ? t("s5.display.previewing") : t("s5.display.preview")}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!profiles[game.id]}
            title={t("s5.display.defaultsTitle")}
            onClick={() => {
              const p = profiles[game.id];
              if (p?.colors) lastColors.current.set(game.id, p.colors);
              if (p?.resolution) lastRes.current.set(game.id, p.resolution);
              update(game.id, EMPTY, true);
            }}
          >
            <I n="rotate" />
            {t("s5.display.defaults")}
          </button>
        </div>
      )}
    </section>
  );

  if (games == null) return <div className="pg-display">{head}</div>;
  if (!game)
    return (
      <div className="pg-display">
        {head}
        <section className="empty panel">
          <span className="bg0">0</span>
          <span className="bgdots" />
          <BigIcon n="games" />
          <div className="tx">
            <h2>
              {t("s5.display.none1")}
              <br />
              {t("s5.display.none2")}
            </h2>
            <p>
              <Rich text={t("s5.display.noneLead")} />
            </p>
            <div className="acts">
              <button type="button" className="btn red lg" onClick={() => goTo("games")}>
                <I n="games" />
                {t("s5.display.openGames")}
              </button>
            </div>
          </div>
        </section>
      </div>
    );

  const profile = profiles[game.id] ?? EMPTY;
  const colors = profile.colors;
  const res = profile.resolution;
  const pg = proGameOf(game.id);
  const lname = game.name.toLowerCase();
  const mon = info?.monitor ?? null;
  const aspect = mon ? mon.width / mon.height : 16 / 9;
  const modes = mon?.modes ?? null;
  const has = (w: number, h: number) => !modes || modes.some(([mw, mh]) => mw === w && mh === h);
  // saturation : null tant que la page ne sait pas, false sans saturation sur cet écran (Intel : 50 % affiché, celle de Windows)
  const vib = info ? info.vibrance !== null : null;
  const shown = { ...(colors ?? WINDOWS), ...(vib === false ? { vibrance: WINDOWS.vibrance } : {}) };

  // un réglage changé à la main : ce n'est plus le preset du pro
  const setColors = (c: DisplayColors | null) => {
    update(game.id, { ...profile, colors: c, pro: null });
    if (c && previewing) preview(c);
  };
  /** Un curseur bougé, couleurs éteintes : elles s'allument avec celles de Windows plus ce réglage. */
  const editColors = (patch: Partial<DisplayColors>) => setColors({ ...(colors ?? WINDOWS), ...patch });
  const setRes = (r: DisplayResolution | null) => update(game.id, { ...profile, resolution: r, pro: null });
  const toggleColors = (on: boolean) => {
    // sans saturation sur cet écran (Intel) : les couleurs de Windows, la luminosité et le contraste restent réglables
    if (on) return setColors(lastColors.current.get(game.id) ?? (info?.vibrance === null ? WINDOWS : FIRST_COLORS));
    if (colors) lastColors.current.set(game.id, colors);
    setColors(null);
  };
  const toggleRes = (on: boolean) => {
    if (!on) {
      if (res) lastRes.current.set(game.id, res);
      return setRes(null);
    }
    const [width, height] = FIRST_RES[pg ?? "other"];
    setRes(lastRes.current.get(game.id) ?? { width, height, stretch: true, gameFile: pg !== null });
  };
  const pickRes = (w: number, h: number) => setRes(res ? { ...res, width: w, height: h } : { width: w, height: h, stretch: true, gameFile: pg !== null });

  // onglets de jeux : les premiers, le jeu choisi toujours visible
  let visible = allGames ? games : games.slice(0, TABS_SHOWN);
  if (!visible.includes(game)) visible = [...visible.slice(0, TABS_SHOWN - 1), game];
  const extra = games.length - TABS_SHOWN;

  const liveOn = live.colors === game.id || live.resolution === game.id;
  const chip = error ? (
    <span className="chip ghost err">
      <I n="alert" line />
      {t(`display.err.${error}` as Key)}
      <button type="button" className="lk" onClick={() => setHidden(error)}>
        {t("display.hide")}
      </button>
    </span>
  ) : (
    <span className="chip ghost" title={t("display.how")}>
      <i className="dot" style={{ color: live.colors === "preview" || liveOn || profiles[game.id] ? "var(--red)" : "var(--ink-3)" }} />
      {live.colors === "preview"
        ? t("s5.display.chipPreview")
        : liveOn
          ? t("s5.display.chipOn", { game: lname })
          : profile.colors || profile.resolution
            ? t("s5.display.chipSet", { game: lname })
            : t("s5.display.chipNone", { game: lname })}
    </span>
  );

  // tuiles : native, puis celles des pros ; une résolution choisie ailleurs prend la dernière place
  let tiles = TILES[pg ?? "other"];
  if (res && !tiles.some(([w, h]) => w === res.width && h === res.height)) tiles = [...tiles.slice(0, -1), [res.width, res.height]];
  const others = (modes ?? []).filter(([w, h]) => !tiles.some(([tw, th]) => tw === w && th === h) && !(mon && w === mon.width && h === mon.height));
  const missing = res ? !has(res.width, res.height) : false;
  const nativeRect: [number, number] = Math.abs(aspect - 16 / 9) < 0.02 ? [54, 30] : [54, Math.round((540 / aspect) * 1) / 10];

  const proGame = proTab ?? pg ?? "valorant";
  const proList = PROS.filter((p) => p.game === proGame);
  const sources = [...new Set(proList.map((p) => p.source))].sort().join(t("s5.display.and"));

  const gpu = sys?.gpus.find((g) => g.vendor === info?.vibrance) ?? sys?.gpus[0] ?? null;
  const drv: [string, string] =
    vib === null
      ? [" ", " "]
      : info?.vibrance === "amd"
        ? [t("s5.display.drvAmd"), t("s5.display.drvSubAmd", { gpu: gpu ? gpuName(gpu.name) : "radeon", n: 100 + (shown.vibrance - 50) * 2 })]
        : info?.vibrance === "nvidia"
          ? [t("s5.display.drvNvidia"), t("s5.display.drvSub", { gpu: gpu ? gpuName(gpu.name) : "geforce" })]
          : [t("s5.display.drvNone"), t("s5.display.drvSubNone")];

  const satText = (v: number) => (vib === false ? t("s5.display.customColors") : t("s5.display.sat", { n: v }));
  const left = (
    <>
      <b>{mon ? `${mon.width}×${mon.height}` : t("s5.display.native")}</b>
      {mon && ` / ${t("s5.display.hz", { n: mon.hz })}`} / {vib === false ? t("s5.display.winColors") : t("s5.display.sat", { n: 50 })}
    </>
  );
  const right = (
    <>
      <b>{res ? `${res.width}×${res.height}` : t("s5.display.native")}</b>
      {res && ` ${t(res.stretch ? "s5.display.stretched" : "s5.display.bars")}`} / {colors ? satText(colors.vibrance) : t("s5.display.winColors")}
    </>
  );

  return (
    <div className="pg-display">
      {head}

      <div className="bar">
        <Tabs<string>
          label={t("s5.display.game")}
          ariaLabel={t("display.games")}
          value={game.id}
          onChange={(id) => (id === "+" ? setAllGames(!allGames) : choose(id))}
          items={[...visible.map((g) => ({ id: g.id, label: g.name })), ...(extra > 0 ? [{ id: "+", label: allGames ? t("s5.display.fewer") : `+${extra}` }] : [])]}
        />
        {chip}
      </div>

      <div className="grid2">
        <Versus shot={shot} colors={colors} res={res} aspect={aspect} vibrance={vib !== false} name={game.name} left={left} right={right} />

        <section className={`col panel${colors ? "" : " off"}`}>
          <div className="hd">
            <h2 className="h2">{t("s5.display.colors")}</h2>
            <Sw on={!!colors} onChange={toggleColors} label={t("s5.display.colors")} />
          </div>
          <div className="big">
            <span className="lbl">
              {t("s5.display.satLbl")}
              <br />
              {info?.vibrance === "amd" ? t("s5.display.satAmd") : t("s5.display.satNvidia")}
            </span>
            <b>
              {shown.vibrance}
              <small>%</small>
            </b>
          </div>
          <div className={`satbar${vib === false ? " dis" : ""}`} title={vib === false ? undefined : t("s5.display.satTitle")}>
            <div className="seg">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} className={i < Math.round((shown.vibrance / 100) * 20) ? "f" : undefined} />
              ))}
            </div>
            <span className="mk" />
            <input
              type="range"
              className="rng"
              min={0}
              max={100}
              step={1}
              value={shown.vibrance}
              disabled={vib === false}
              aria-label={t("s5.display.satLbl")}
              onChange={(e) => editColors({ vibrance: Math.max(50, Number(e.target.value)) })}
            />
          </div>
          <div className="ends">
            <span className="lbl">{t("s5.display.gray")}</span>
            <span className="lbl">{t("s5.display.windows")}</span>
            <span className="lbl">{t("s5.display.max")}</span>
          </div>
          <div className="drv">
            <I n="gpu" />
            <div>
              <b>{drv[0]}</b>
              <span className="sub">{drv[1]}</span>
            </div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <Mini label={t("s5.display.brightness")} value={shown.brightness} scale={LINEAR} onChange={(v) => editColors({ brightness: v })} />
            <Mini label={t("s5.display.contrast")} value={shown.contrast} scale={LINEAR} onChange={(v) => editColors({ contrast: v })} />
            <Mini label={t("s5.display.gamma")} value={shown.gamma} scale={GAMMA} onChange={(v) => editColors({ gamma: v })} />
          </div>
        </section>
      </div>

      <section className={`res panel${res ? "" : " off"}`}>
        <div>
          <div className="hd">
            <h2 className="h2">{t("s5.display.resolution")}</h2>
            <span className="hd-r">
              {others.length > 0 && (
                <select
                  className="other"
                  value=""
                  title={t("s5.display.otherTitle")}
                  aria-label={t("s5.display.otherTitle")}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split("x").map(Number);
                    if (w && h) pickRes(w, h);
                  }}
                >
                  <option value="" disabled>
                    {t("s5.display.other")}
                  </option>
                  {others.map(([w, h]) => (
                    <option key={`${w}x${h}`} value={`${w}x${h}`}>
                      {w}×{h}
                    </option>
                  ))}
                </select>
              )}
              <Sw on={!!res} onChange={toggleRes} label={t("s5.display.resolution")} />
            </span>
          </div>
          <div className="tiles" role="radiogroup" aria-label={t("s5.display.resolution")}>
            <button
              type="button"
              role="radio"
              aria-checked={!res}
              className={`tile${res ? "" : " on"}`}
              data-on={t("s5.display.inGame")}
              title={mon ? `${mon.width}×${mon.height}` : undefined}
              onClick={() => res && toggleRes(false)}
            >
              <span className="rect" style={{ width: nativeRect[0], height: nativeRect[1] }} />
              {t("s5.display.native")}
            </button>
            {tiles.map(([w, h]) => {
              const on = !!res && res.width === w && res.height === h;
              const absent = !has(w, h);
              const [rw, rh] = rectOf(w, h);
              return (
                <button
                  key={`${w}x${h}`}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`tile${on ? " on" : ""}${absent ? " absent" : ""}`}
                  data-on={t("s5.display.inGame")}
                  title={absent ? t("s5.display.absent") : undefined}
                  onClick={() => pickRes(w, h)}
                >
                  <span className="rect" style={{ width: rw, height: rh }} />
                  {w}×{h}
                </button>
              );
            })}
          </div>
          {missing && res && (
            <p className="warn">
              <I n="alert" line />
              {t("display.missingHelp", { res: `${res.width}×${res.height}` })}
            </p>
          )}
        </div>
        <div className="opts">
          <Tabs<"stretch" | "bars">
            ariaLabel={t("s5.display.resolution")}
            value={res ? (res.stretch ? "stretch" : "bars") : null}
            onChange={(v) => res && setRes({ ...res, stretch: v === "stretch" })}
            items={[
              { id: "stretch", label: t("s5.display.stretched"), title: t("display.stretchHelp"), disabled: !res },
              { id: "bars", label: t("s5.display.bars"), disabled: !res },
            ]}
          />
          {pg && (
            <div className="line" title={t("display.gameFileHint")}>
              {t("s5.display.gameFile", { game: lname })}
              <Sw
                on={!!res?.gameFile}
                disabled={!res}
                label={t("s5.display.gameFile", { game: lname })}
                onChange={(v) => res && update(game.id, { ...profile, resolution: { ...res, gameFile: v } })}
              />
            </div>
          )}
        </div>
      </section>

      <section className="pros">
        <div className="gh">
          <div>
            <h2 className="h2">{t("s5.display.pros")}</h2>
            <p className="sub">{pg ? t("s5.display.prosFrom", { src: sources, date: month(PROS_FILE.updated) }) : t("s5.display.prosOther", { game: lname })}</p>
          </div>
          <div className="gh-r">
            {!pg && <Tabs<ProGame> label={t("s5.display.prosOf")} ariaLabel={t("s5.display.pros")} value={proGame} onChange={setProTab} items={PRO_GAMES} />}
            {proList.length > PROS_SHOWN && (
              <button type="button" className="btn" onClick={() => setAllPros(!allPros)}>
                {allPros ? t("s5.display.prosTop") : t("s5.display.prosAll", { n: proList.length, game: PRO_GAMES.find((p) => p.id === proGame)?.label ?? proGame })}
                <I n="chev" className={allPros ? "up" : undefined} />
              </button>
            )}
          </div>
        </div>
        <div className="roster">
          {(allPros ? proList : proList.slice(0, PROS_SHOWN)).map((p) => (
            <ProCard
              key={p.id}
              pro={p}
              on={profile.pro === p.id}
              locked={!premium}
              date={fmtDate(p.checked)}
              onImport={() => {
                if (!premium) return setUpsell("plan");
                // saturation pas publiée : les couleurs du joueur restent ; 50 % : celles de Windows
                const c = p.vibrance == null ? profile.colors : p.vibrance === 50 ? null : { ...WINDOWS, vibrance: p.vibrance };
                const r = p.resolution ? { width: p.resolution[0], height: p.resolution[1], stretch: p.stretch, gameFile: pg !== null } : null;
                update(game.id, { colors: c, resolution: r, pro: p.id }, true);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Face à face Windows contre le jeu : la même capture, à gauche telle quelle, à droite avec les réglages du jeu ;
 * la bande déchirée se glisse (souris, doigt, flèches du clavier sur le badge « vs »). */
function Versus({
  shot,
  colors,
  res,
  aspect,
  vibrance,
  name,
  left,
  right,
}: {
  shot: string | null;
  colors: DisplayColors | null;
  res: DisplayResolution | null;
  aspect: number;
  vibrance: boolean;
  name: string;
  left: ReactNode;
  right: ReactNode;
}) {
  const { t } = useStore();
  const box = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(748);
  const [at, setAt] = useState(0.5);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v));
  const move = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAt(clamp((e.clientX - r.left) / r.width));
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    const next = e.key === "ArrowLeft" ? at - step : e.key === "ArrowRight" ? at + step : e.key === "Home" ? 0 : e.key === "End" ? 1 : null;
    if (next === null) return;
    e.preventDefault();
    setAt(clamp(next));
  };

  // la résolution du jeu sur cet écran : étirée (l'image s'élargit), ou au milieu avec des bandes noires
  const a = res ? res.width / res.height : aspect;
  let geo: CSSProperties = {};
  if (res && a < aspect - 0.01) {
    if (res.stretch) geo = { backgroundSize: `${(aspect / a) * 100}% 100%` };
    else {
      const side = `${((1 - a / aspect) / 2) * 100}%`;
      geo = { left: side, right: side };
    }
  }
  // couleurs : saturation du pilote (50 % = Windows, 100 % = le double), puis la rampe gamma de display.rs
  const ramp = colors && needsRamp(colors);
  const filter = colors ? [vibrance && colors.vibrance !== 50 && `saturate(${1 + (colors.vibrance - 50) / 50})`, ramp && `url(#${RAMP})`].filter(Boolean).join(" ") : "";
  const img = shot ? `url(${shot})` : undefined;
  const g = colors ? colors.gamma / 100 : 1;
  const k = colors ? 1 + colors.contrast / 100 : 1;
  const b = colors ? colors.brightness / 200 : 0;

  return (
    <section
      ref={box}
      className="vs"
      style={{ "--xl": `${at * width - 75}px` } as CSSProperties}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e)}
    >
      <div className="half before">
        <div className="vp" style={{ backgroundImage: img, filter: "none" }} />
      </div>
      <div className="half after">
        <div className="vp" style={{ backgroundImage: img, filter: filter || "none", ...geo }} />
      </div>
      <div className="cut" />
      <div className="shade" />
      <span className="chip lb l" style={{ background: "rgba(10,10,15,.75)" }}>
        {t("s5.display.drag")}
      </span>
      <div
        className="badge"
        role="slider"
        tabIndex={0}
        aria-label={t("s5.display.dragLabel")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(at * 100)}
        style={{ left: `${at * 100}%` }}
        onKeyDown={key}
      >
        vs
      </div>
      <div className="side-l">
        <b>{t("s5.display.windows")}</b>
        <span className="sub">{left}</span>
      </div>
      <div className="side-r">
        <b className={name.length > 13 ? "long" : undefined}>{name}</b>
        <span className="sub">{right}</span>
      </div>
      {ramp && (
        <svg className="fx" width="0" height="0" aria-hidden="true">
          <filter id={RAMP} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude={1} exponent={1 / g} offset={0} />
              <feFuncG type="gamma" amplitude={1} exponent={1 / g} offset={0} />
              <feFuncB type="gamma" amplitude={1} exponent={1 / g} offset={0} />
            </feComponentTransfer>
            <feComponentTransfer>
              <feFuncR type="linear" slope={k} intercept={0.5 - 0.5 * k + b} />
              <feFuncG type="linear" slope={k} intercept={0.5 - 0.5 * k + b} />
              <feFuncB type="linear" slope={k} intercept={0.5 - 0.5 * k + b} />
            </feComponentTransfer>
          </filter>
        </svg>
      )}
    </section>
  );
}

/** Échelle d'une petite barre : 20 cases, la 10e = Windows ; pos 0 à 100 ↔ valeur. */
interface Scale {
  min: number;
  max: number;
  toPos: (v: number) => number;
  fromPos: (p: number) => number;
  text: (v: number) => string;
}
/** Luminosité et contraste : -30 à 30, 0 = Windows. */
const LINEAR: Scale = { min: -30, max: 30, toPos: (v) => ((v + 30) / 60) * 100, fromPos: (p) => Math.round((p / 100) * 60 - 30), text: signed };
/** Gamma : 0,70 à 1,50, Windows (1,00) au milieu de la barre ; affiché en écart (+20 = 1,20). */
const GAMMA: Scale = {
  min: 70,
  max: 150,
  toPos: (g) => (g <= 100 ? ((g - 70) / 30) * 50 : 50 + ((g - 100) / 50) * 50),
  fromPos: (p) => Math.round(p <= 50 ? 70 + (p / 50) * 30 : 100 + ((p - 50) / 50) * 50),
  text: (g) => signed(g - 100),
};

/** Petite barre de 20 cases (luminosité, contraste, gamma) avec son curseur invisible par-dessus. */
function Mini({ label, value, scale, onChange }: { label: string; value: number; scale: Scale; onChange: (v: number) => void }) {
  const pos = scale.toPos(value);
  const filled = Math.round(pos / 5);
  return (
    <div className="mini">
      {label}
      <div className="seg">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} className={i < filled ? "m" : undefined} />
        ))}
        <input
          type="range"
          className="rng"
          min={0}
          max={100}
          step={0.5}
          value={pos}
          aria-label={label}
          aria-valuetext={scale.text(value)}
          onChange={(e) => onChange(Math.min(scale.max, Math.max(scale.min, scale.fromPos(Number(e.target.value)))))}
        />
      </div>
      <em>{scale.text(value)}</em>
    </div>
  );
}

/** Carte d'un pro : sa photo, son écran, sa saturation et sa résolution ; son nom ouvre la source. */
function ProCard({ pro, on, locked, date, onImport }: { pro: Pro; on: boolean; locked: boolean; date: string; onImport: () => void }) {
  const { t } = useStore();
  const photo = proPhoto(pro.id);
  const screen = (pro.monitor?.split(" : ")[0] ?? pro.source).toLowerCase();
  const tip = [pro.monitor && `${t("display.monitorTip")} : ${pro.monitor}`, pro.ingame && `${t("display.ingameTip")} : ${pro.ingame}`].filter(Boolean).join("\n");
  return (
    <div className={`pcard${on ? " on" : ""}`}>
      <div className={`ph${photo ? "" : " none"}`} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
        {!photo && <span className="ini">{initials(pro.name)}</span>}
      </div>
      <div className="bd">
        <button type="button" className="nm" title={t("s5.display.source", { src: pro.source, date })} onClick={() => void api.openUrl(pro.url)}>
          {pro.name}
        </button>
        <span className="sub" title={tip || undefined}>
          {screen}
        </span>
        <div className="kv">
          <div>
            <span className="lbl">{t("s5.display.saturation")}</span>
            <b>{pro.vibrance == null ? "—" : `${pro.vibrance}%`}</b>
          </div>
          <div>
            <span className="lbl">{t("s5.display.resolution")}</span>
            <b>{pro.resolution ? `${pro.resolution[0]}×${pro.resolution[1]}` : t("s5.display.native")}</b>
          </div>
        </div>
        {on ? (
          <span className="btn red">
            <I n="check" />
            {t("s5.display.imported")}
          </span>
        ) : (
          <button type="button" className="btn" onClick={onImport}>
            {locked && <I n="lock" />}
            {t("s5.display.import")}
          </button>
        )}
      </div>
    </div>
  );
}
