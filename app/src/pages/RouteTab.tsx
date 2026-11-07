import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle, Power, Route } from "lucide-react";
import { api, type RoutePath, type RouteStatus } from "../lib/api";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { Button } from "../components/ui";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const } } };

const ms = (v: number | null | undefined) => (v == null ? "—" : String(Math.round(v)));

/** Message affiché quand Rago Route ne démarre pas (erreurs de route.rs : « port:25565 », « listen:… », « udp:… »). */
function errorKey(e: string): Key {
  if (e.startsWith("port:")) return "route.err.port";
  if (e.startsWith("udp:")) return "route.err.udp";
  return "route.err.other";
}

/** Rago Route dans Réseau : le tunnel anti-lag vers la sortie de Paris (route.rs). Exe de test seulement pour l'instant. */
export function RouteTab() {
  const { t } = useStore();
  const [st, setSt] = useState<RouteStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const running = !!st?.running;
  const playing = running && !!st?.playing;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (running) {
        await api.routeStop();
        setSt(await api.routeStatus());
      } else {
        setSt(await api.routeStart());
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
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

        {error && <p className="rt-error small">{t(errorKey(error), { e: error.replace(/^\w+:/, "") })}</p>}

        <div className="nt-actions">
          <Button
            variant={running ? "secondary" : "primary"}
            icon={busy ? <LoaderCircle size={16} className="spin" /> : <Power size={16} />}
            disabled={busy}
            onClick={toggle}
          >
            {running ? t("route.stop") : t("route.start")}
          </Button>
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
            <Stat label={t("route.resends")} value={String((st?.resendsHere ?? 0) + (st?.resendsExit ?? 0))} />
            <Stat label={t("route.lag")} value={ms(lag)} unit="ms" warn={lag != null && lag > 50} />
          </div>
          {!playing && <p className="muted small rt-note">{t("route.waiting")}</p>}
        </motion.section>
      )}
    </motion.div>
  );
}

function PathRow({ p, t }: { p: RoutePath; t: (k: Key, v?: Record<string, string | number>) => string }) {
  const name = p.kind === "direct" ? t("route.path.direct", { city: p.via }) : t("route.path.relay", { city: p.via });
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
