import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, LoaderCircle, Lock, Power, Route, X } from "lucide-react";
import { api, type RouteCheck, type RouteLinks, type RoutePath, type RouteStatus } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button, Switch } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const ms = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));

/** Message affiché quand Rago Route ne démarre pas : erreurs de route.rs (« port:25565 », « listen:… », « udp:… »)
 *  et du jeton demandé au serveur de licences (« premium:no_license », « premium:route_closed »…, lib.rs). */
function errorKey(e: string): Key {
  if (e.startsWith("port:")) return "route.err.port";
  if (e.startsWith("udp:")) return "route.err.udp";
  if (e === "premium:no_license") return "route.err.premium";
  if (e === "premium:route_closed") return "route.err.closed";
  if (e === "premium:network") return "route.err.network";
  if (e === "premium:rate_limited") return "route.err.busy";
  if (e.startsWith("premium:")) return "route.err.account";
  return "route.err.other";
}

// Exe de test (serveur staging) : le bouton qui copie le jeton pour le script du Mac
const STAGING = import.meta.env.VITE_RAGO_SERVER === "staging";

/** Rago Route dans Réseau : le tunnel anti-lag vers la sortie de Paris (route.rs). Dans tous les exe depuis la 1.3.0.
 *  Réservé au Premium : la sortie de Paris refuse toute partie sans jeton signé par le serveur de licences. */
export function RouteTab() {
  const { t, license, premium, setUpsell } = useStore();
  const [st, setSt] = useState<RouteStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  /** Exe de test seulement. Essais sur le Mac : le jeton du compte, à coller après --jeton dans le script (il dure 6 h). */
  async function copyToken() {
    setError(null);
    try {
      await api.copyText(await api.routeToken());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(String(e));
    }
  }

  const orb = playing ? "great" : running ? "good" : "";
  const verdict: Key = playing ? "route.playing" : running ? "route.ready" : "route.off";
  const lag = st ? Math.max(st.lagHereMs, st.lagExitMs) : null;

  return (
    <motion.div className="nettest" variants={stagger} initial="initial" animate="animate">
      <motion.section variants={rise} className="card nt-hero">
        <header className="card-head">
          <h3 className="rg-overline">Rago Route</h3>
          <span className="badge">{t("route.badge")}</span>
        </header>
        <div className="nt-head">
          <div className={`net-orb nt-orb${orb ? ` ${orb}` : ""}${busy ? " busy" : ""}`}>
            <Route size={26} strokeWidth={1.5} />
          </div>
          <div className="nt-head-text">
            <div className="net-verdict">{t(verdict)}</div>
            <div className="net-sub muted small">{running ? t("route.howto") : t("route.lead")}</div>
          </div>
        </div>

        {running && (
          <div className="rt-servers">
            <code className="rt-addr">localhost</code>
            <span className="muted small">Hypixel</span>
            <code className="rt-addr">localhost:25566</code>
            <span className="muted small">Minemen</span>
          </div>
        )}

        {locked && <p className="muted small rt-note">{t("route.premium")}</p>}
        {!locked &&
          !running &&
          links.map((l) => {
            const on = chosen === l.name;
            const title = l.phone ? t("route.phone") : t("route.second", { name: l.name });
            return (
              <div key={l.name} className="no-toggle rt-phone" onClick={() => chooseLink(on ? null : l.name)}>
                <div className="no-toggle-text">
                  <div className="no-toggle-title">{title}</div>
                  <div className="no-toggle-desc">{l.phone ? t("route.phone.desc") : t("route.second.desc")}</div>
                </div>
                <Switch checked={on} onChange={(v) => chooseLink(v ? l.name : null)} label={title} />
              </div>
            );
          })}
        {!locked && !running && found?.check && <PhoneCheckBox c={found.check} t={t} />}
        {shown && (
          <p className="rt-error small">{shown === "token" ? t("route.err.token") : t(errorKey(shown), { e: shown.replace(/^\w+:/, "") })}</p>
        )}

        <div className="nt-actions">
          {locked ? (
            <Button variant="primary" icon={<Lock size={16} />} onClick={() => setUpsell("plan")}>
              {t("free.upgrade")}
            </Button>
          ) : (
            <Button
              variant={running ? "secondary" : "primary"}
              icon={busy ? <LoaderCircle size={16} className="spin" /> : <Power size={16} />}
              disabled={busy || license === null}
              onClick={toggle}
            >
              {running ? t("route.stop") : t("route.start")}
            </Button>
          )}
          {premium && STAGING && (
            <Button variant="ghost" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={copyToken}>
              {copied ? t("route.copied") : t("route.copyToken")}
            </Button>
          )}
        </div>
      </motion.section>

      {running && (
        <motion.section variants={rise} className="card nt-hero">
          <header className="card-head">
            <h3 className="rg-overline">{t("route.paths")}</h3>
          </header>
          <div className="rt-paths">
            {(st?.paths ?? []).map((p, i) => (
              <PathRow key={i} p={p} t={t} />
            ))}
          </div>
          <div className="nt-stats rt-stats">
            <Stat label={t("route.exitPing")} value={ms(st?.exitPingMs)} unit="ms" />
            <Stat label={t("route.saved")} value={String(st?.saved ?? 0)} />
            <Stat label={t("route.repaired")} value={String(st?.repaired ?? 0)} />
            <Stat label={t("route.resends")} value={String((st?.resendsHere ?? 0) + (st?.resendsExit ?? 0))} />
            <Stat label={t("route.lag")} value={ms(lag)} unit="ms" warn={lag != null && lag > 50} />
          </div>
          {!playing && <p className="muted small rt-note">{t("route.waiting")}</p>}
        </motion.section>
      )}
    </motion.div>
  );
}

/** Installeur d'iTunes sur le site d'Apple : il apporte les pilotes USB et de partage de l'iPhone. */
const ITUNES = "https://www.apple.com/itunes/download/win64";

/** Diagnostic du partage de connexion USB : chaque étape vérifiée, la première ratée explique quoi faire. */
function PhoneCheckBox({ c, t }: { c: RouteCheck; t: (k: Key, v?: Record<string, string | number>) => string }) {
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
    <div className="rt-check small">
      <div className="rt-check-title">{t(c.phone === "iphone" ? "route.check.iphone" : c.phone === "android" ? "route.check.android" : "route.check.none")}</div>
      <ul className="rt-check-steps">
        {c.steps.map((s) => (
          <li key={s.code} className={s.ok ? "ok" : "ko"}>
            {s.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
            <span>{t(`route.step.${s.code}`)}</span>
          </li>
        ))}
      </ul>
      <p className="rt-check-why">{t(`route.why.${c.why}`)}</p>
      <div className="rt-check-actions">
        {(c.why === "apple_usb" || c.why === "apple_net") && (
          <button type="button" className="rt-help-link" onClick={() => api.openUrl(ITUNES).catch(() => {})}>
            {t("route.check.itunes")}
          </button>
        )}
        <button type="button" className="rt-help-link muted" onClick={copy}>
          {copied ? t("route.check.copied") : t("route.check.copy")}
        </button>
      </div>
    </div>
  );
}

function PathRow({ p, t }: { p: RoutePath; t: (k: Key, v?: Record<string, string | number>) => string }) {
  const name =
    p.kind === "direct"
      ? t("route.path.direct", { city: p.via })
      : p.kind === "phone"
        ? t("route.path.phone", { city: p.via })
        : p.kind === "second"
          ? t("route.path.second", { city: p.via })
          : t("route.path.relay", { city: p.via });
  return (
    <div className={`rt-path${p.alive ? "" : " down"}`}>
      <span className="rt-dot" aria-hidden />
      <div className="rt-path-name">
        <div>{name}</div>
        <div className="muted small">
          {t("route.first", { n: Math.round(p.firstPct) })} · {t("route.loss", { n: p.lossPct.toFixed(1) })} · {t("route.mb", { n: p.mb.toFixed(1) })}
        </div>
      </div>
      <div className="rt-path-rtt rg-metric">
        {p.alive ? ms(p.rttMs) : t("route.down")}
        {p.alive && <span>ms</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, warn }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className="net-stat">
      <div className={`net-stat-value rg-metric${warn ? " warn" : ""}`}>
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <div className="net-stat-label">{label}</div>
    </div>
  );
}
