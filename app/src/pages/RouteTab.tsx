// Onglet « rago route » de Réseau, à l'identique de la maquette v5 app-network-route-pi.html : l'état (on / off, adresse à
// rejoindre, bouton), le schéma des trajets jusqu'au serveur, quatre chiffres, et les trajets de secours (4G du téléphone,
// 2e connexion). Le tunnel anti-lag vers la sortie de Paris (route.rs), dans tous les exe depuis la 1.3.0, réservé au
// Premium avec l'option Rago Route (3 $ par mois en plus, 13/11) : la sortie refuse toute partie sans jeton signé par le
// serveur de licences, qui n'en donne qu'avec l'option.
import { useEffect, useState } from "react";
import { api, type RouteCheck, type RouteLinks, type RoutePath, type RouteStatus } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { ACCOUNT_URL } from "../components/LicenseGate";

/** Message affiché quand Rago Route ne démarre pas : erreurs de route.rs (« port:25565 », « listen:… », « udp:… »)
 *  et du jeton demandé au serveur de licences (« premium:no_license », « premium:route_closed »…, lib.rs). */
function errorKey(e: string): Key {
  if (e.startsWith("port:")) return "route.err.port";
  if (e.startsWith("udp:")) return "route.err.udp";
  if (e === "premium:no_license") return "route.err.premium";
  if (e === "premium:route_closed") return "route.err.closed";
  // Premium sans l'option Rago Route (3 $ par mois en plus, 13/11)
  if (e === "premium:route_option") return "route.err.option";
  if (e === "premium:network") return "route.err.network";
  if (e === "premium:rate_limited") return "route.err.busy";
  if (e.startsWith("premium:")) return "route.err.account";
  return "route.err.other";
}

// Exe de test (serveur staging) : le bouton qui copie le jeton pour le script du Mac
const STAGING = import.meta.env.VITE_RAGO_SERVER === "staging";

/** Les trois places du schéma (maquette, repère de 822 x 350) : en haut, au milieu, en bas. */
const SLOTS = [72, 175, 278];
const LINES = ["M146 175 C 230 175, 225 72, 318 72 S 405 175, 478 175", "M146 175 L 478 175", "M146 175 C 230 175, 225 278, 318 278 S 405 175, 478 175"];
const PACKETS = [0.16, 0.3, 0.72, 0.86];

export function RouteTab() {
  const { t, lang, license, premium, setUpsell } = useStore();
  const [st, setSt] = useState<RouteStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"addr" | "token" | null>(null);
  // 2e connexion (téléphone en USB ou en Wi-Fi, 2e box…) : proposée seulement quand Windows la voit. Un téléphone
  // est pris tout seul tant que le joueur n'a rien choisi ; son choix (nom de la carte, "" = aucune) est retenu sur ce PC
  const [found, setFound] = useState<RouteLinks | null>(null);
  const [stored, setStored] = useState<string | null>(() => {
    try {
      return localStorage.getItem("rago.route.link");
    } catch {
      return null;
    }
  });
  const links = found?.links ?? [];
  const chosen = stored === null ? (links.find((l) => l.phone)?.name ?? null) : stored || null;

  useEffect(() => {
    let alive = true;
    const read = () =>
      api
        .routeStatus()
        .then((s) => alive && setSt(s))
        .catch(() => {});
    read();
    const id = setInterval(read, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const look = () =>
      api
        .routeLinks()
        .then((l) => alive && setFound(l))
        .catch(() => {});
    look();
    const id = setInterval(look, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  function chooseLink(name: string | null) {
    setStored(name ?? "");
    try {
      localStorage.setItem("rago.route.link", name ?? "");
    } catch {
      /* le choix ne sera pas retenu */
    }
  }

  const running = !!st?.running;
  const playing = running && !!st?.playing;
  // pas de Premium (licence lue) : l'offre à la place du bouton ; si Rago Route tourne déjà, on peut toujours l'éteindre
  const locked = license !== null && !premium && !running;
  // la sortie a refusé le jeton (fin de Premium, jeton plus valable) : route.rs le dit dans l'état
  const shown = error ?? (running && st?.error === "token" ? "token" : null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (running) {
        await api.routeStop();
        setSt(await api.routeStatus());
      } else {
        setSt(await api.routeStart(links.some((l) => l.name === chosen) ? chosen : null));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: "addr" | "token") {
    try {
      await api.copyText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      setError(String(e));
    }
  }

  // mouvement réduit (Windows) : les paquets restent à leur place
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v: number) => v.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const lag = st ? Math.max(st.lagHereMs, st.lagExitMs) : null;

  // le schéma : direct en haut, le relais au milieu, le secours (téléphone, 2e connexion) en bas
  const paths = st?.paths ?? [];
  const direct = paths.find((p) => p.kind === "direct");
  const relay = paths.find((p) => p.kind === "relay");
  const backup = paths.find((p) => p.kind === "phone" || p.kind === "second");
  const lead = running ? paths.filter((p) => p.alive).reduce<RoutePath | null>((a, p) => (!a || p.firstPct > a.firstPct ? p : a), null) : null;
  const label = (p: RoutePath) => (p.kind === "direct" ? t("s5.rt.direct", { city: p.via }) : p.kind === "relay" ? t("s5.rt.via", { city: p.via }) : t(p.kind === "phone" ? "s5.rt.phone" : "s5.rt.second"));
  const line = (p: RoutePath | undefined) => (!running || !p || !p.alive ? "off" : p === lead ? "live" : "live2");
  const phoneLink = links.find((l) => l.phone);
  const secondLink = links.find((l) => !l.phone);

  return (
    <>
      <section className="route panel">
        <div className="state">
          <span className="chip ghost" style={{ alignSelf: "flex-start" }}>
            {t("s5.rt.beta")}
          </span>
          <div className={`st-on${running ? "" : " off"}`}>{t(running ? "s5.rt.on" : "s5.rt.off")}</div>
          <span className="sub">{t(playing ? "s5.rt.subPlaying" : running ? "s5.rt.subReady" : "s5.rt.subOff")}</span>
          {shown && <p className="err">{shown === "token" ? t("route.err.token") : t(errorKey(shown), { e: shown.replace(/^\w+:/, "") })}</p>}
          {running && (
            <div className="ad">
              <span className="lbl">{t("s5.rt.join")}</span>
              <div className="code">
                localhost
                <button type="button" title={t("s5.rt.copy")} aria-label={t("s5.rt.copy")} onClick={() => void copy("localhost", "addr")}>
                  <I n={copied === "addr" ? "check" : "copy"} />
                </button>
              </div>
              <span className="mm">{t("s5.rt.minemen")}</span>
            </div>
          )}
          <div className={`acts${running ? "" : " up"}`}>
            {locked ? (
              <button type="button" className="btn red" onClick={() => setUpsell("plan")}>
                <I n="lock" />
                {t("free.lock")}
              </button>
            ) : shown === "premium:route_option" ? (
              <button type="button" className="btn red" onClick={() => void api.openUrl(`${ACCOUNT_URL}/buy/route`).catch(() => {})}>
                <I n="plus" />
                {t("route.option.buy")}
              </button>
            ) : (
              <button type="button" className={`btn${running ? "" : " red"}`} disabled={busy || license === null} onClick={() => void toggle()}>
                <I n={busy ? "loader" : "power"} className={busy ? "spin" : undefined} />
                {t(running ? "s5.rt.turnOff" : "s5.rt.turnOn")}
              </button>
            )}
            {premium && STAGING && (
              <button type="button" className="btn sm" onClick={() => void api.routeToken().then((tk) => copy(tk, "token"), (e) => setError(String(e)))}>
                <I n={copied === "token" ? "check" : "copy"} />
                {copied === "token" ? t("route.copied") : t("route.copyToken")}
              </button>
            )}
          </div>
        </div>
        <div className={`dg${running ? "" : " idle"}`} role="img" aria-label={t("s5.rt.paths")}>
          <svg className="ln" viewBox="0 0 822 350" preserveAspectRatio="none">
            <path className={line(direct)} d={LINES[0]} />
            <path className={line(relay)} d={LINES[1]} />
            <path className={line(backup)} d={LINES[2]} />
            <path className={playing ? "live" : "off"} d="M628 175 L 690 175" />
            {/* petits paquets le long des trajets actifs (maquette : à 16, 30, 72 et 86 % du chemin), qui avancent pendant
                la partie */}
            {playing &&
              [direct, relay, backup].map((p, i) =>
                p && p.alive
                  ? PACKETS.map((k) => (
                      <rect key={`${i}-${k}`} x="-4" y="-4" width="8" height="8" rx="2">
                        {still ? (
                          <animateMotion path={LINES[i]} keyPoints={`${k};${k}`} keyTimes="0;1" calcMode="linear" dur="1s" fill="freeze" />
                        ) : (
                          <animateMotion path={LINES[i]} dur="2.4s" begin={`${-k * 2.4}s`} repeatCount="indefinite" />
                        )}
                      </rect>
                    ))
                  : null,
              )}
          </svg>
          <div className="nd pc" style={{ left: 88, top: 175 }}>
            <I n="monitor" />
            <b>{t("s5.rt.pc")}</b>
          </div>
          {[direct, relay, backup].map((p, i) =>
            p ? (
              <div key={i} className={`pl${p.alive ? "" : " down"}`} style={{ left: 318, top: SLOTS[i] }} title={p.rttMs != null ? `${Math.round(p.rttMs)} ms` : undefined}>
                <b>{label(p)}</b>
                <span>{!p.alive ? t("s5.rt.down") : t("s5.rt.first", { n: Math.round(p.firstPct) })}</span>
              </div>
            ) : (
              <div key={i} className="pl add" style={{ left: 318, top: SLOTS[i] }}>
                {i === 2 && <I n="plus" />}
                <b>{i === 0 ? t("s5.rt.direct", { city: "paris" }) : i === 1 ? t("s5.rt.via", { city: "frankfurt" }) : t(secondLink && !phoneLink ? "s5.rt.second" : "s5.rt.phone")}</b>
              </div>
            ),
          )}
          <div className="nd ex" style={{ left: 556, top: 175 }}>
            <b>rago</b>
            <small>{t("s5.rt.exit")}</small>
          </div>
          {running && st?.exitPingMs != null && (
            <div className="ms" style={{ left: 662, top: 160 }}>
              {Math.round(st.exitPingMs)}
              <small>ms</small>
            </div>
          )}
          <div className="nd sv2" style={{ left: 752, top: 175 }}>
            <b>hypixel</b>
            <small>{t("s5.rt.server")}</small>
          </div>
        </div>
      </section>

      <div className={`nums${running ? "" : " idle"}`}>
        <div className="num2">
          <b>{running ? fmt(st?.saved ?? 0) : "–"}</b>
          <span className="lbl">{t("s5.rt.saved")}</span>
        </div>
        <div className="num2">
          <b>{running ? fmt(st?.repaired ?? 0) : "–"}</b>
          <span className="lbl">{t("s5.rt.repaired")}</span>
        </div>
        <div className="num2">
          <b>{running ? fmt((st?.resendsHere ?? 0) + (st?.resendsExit ?? 0)) : "–"}</b>
          <span className="lbl">{t("s5.rt.resends")}</span>
        </div>
        <div className="num2">
          <b>
            {running && lag != null ? (Math.round(lag * 10) / 10).toLocaleString(lang === "fr" ? "fr-FR" : "en-US") : "–"}
            {running && lag != null && <small>ms</small>}
          </b>
          <span className="lbl">{t("s5.rt.lag")}</span>
        </div>
      </div>
      {running && !playing && <p className="note">{t("route.waiting")}</p>}

      <section className="backup">
        <div className="sh">
          <h2 className="h2 tape">{t("s5.rt.backup")}</h2>
        </div>
        <div className="bk">
          <Backup
            title={t("s5.rt.phone")}
            hint={phoneLink ? t("s5.rt.phoneD") : t("s5.rt.noPhone")}
            link={phoneLink?.name}
            chosen={!!phoneLink && chosen === phoneLink.name}
            locked={running}
            lockedWhy={t("s5.rt.whileOn")}
            onPick={(on) => chooseLink(on ? phoneLink!.name : null)}
            added={t("s5.rt.added")}
          />
          <Backup
            title={t("s5.rt.second")}
            hint={secondLink ? t("s5.rt.secondD") : t("s5.rt.noSecond")}
            link={secondLink?.name}
            chosen={!!secondLink && chosen === secondLink.name}
            locked={running}
            lockedWhy={t("s5.rt.whileOn")}
            onPick={(on) => chooseLink(on ? secondLink!.name : null)}
            added={t("s5.rt.added")}
          />
        </div>
        {!running && found?.check && <PhoneCheck c={found.check} />}
      </section>
    </>
  );
}

/** Un trajet de secours (carreau .tw.add de la maquette) : pâli tant que Windows ne voit pas la connexion ; un clic
 * l'ajoute ou le retire au prochain démarrage. */
function Backup({ title, hint, link, chosen, locked, lockedWhy, onPick, added }: { title: string; hint: string; link?: string; chosen: boolean; locked: boolean; lockedWhy: string; onPick: (on: boolean) => void; added: string }) {
  const off = !link;
  return (
    <button
      type="button"
      className={`tw add${off ? " dim" : ""}${chosen ? " on" : ""}`}
      disabled={off || locked}
      aria-pressed={chosen}
      title={locked && link ? lockedWhy : link}
      onClick={() => onPick(!chosen)}
    >
      <I n={chosen ? "check" : "plus"} />
      <span className="nm">{title}</span>
      <small>{chosen ? added : hint}</small>
    </button>
  );
}

/** Installeur d'iTunes sur le site d'Apple : il apporte les pilotes USB et de partage de l'iPhone. */
const ITUNES = "https://www.apple.com/itunes/download/win64";

/** Diagnostic du partage de connexion USB : chaque étape vérifiée, la première ratée explique quoi faire. */
function PhoneCheck({ c }: { c: RouteCheck }) {
  const { t } = useStore();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await api.copyText(c.details.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* rien à copier */
    }
  }
  return (
    <div className="rchk panel">
      <h3>{t(c.phone === "iphone" ? "route.check.iphone" : c.phone === "android" ? "route.check.android" : "route.check.none")}</h3>
      <ul>
        {c.steps.map((s) => (
          <li key={s.code} className={s.ok ? "ok" : "ko"}>
            <I n={s.ok ? "check" : "x"} />
            {t(`route.step.${s.code}`)}
          </li>
        ))}
      </ul>
      <p>{t(`route.why.${c.why}`)}</p>
      <div className="acts">
        {(c.why === "apple_usb" || c.why === "apple_net") && (
          <button type="button" className="btn sm" onClick={() => void api.openUrl(ITUNES).catch(() => {})}>
            <I n="external" />
            {t("route.check.itunes")}
          </button>
        )}
        <button type="button" className="btn sm" onClick={() => void copy()}>
          <I n={copied ? "check" : "copy"} />
          {copied ? t("route.check.copied") : t("route.check.copy")}
        </button>
      </div>
    </div>
  );
}
