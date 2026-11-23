// Outils du moteur réseau (netopt.rs) dans le Packet Optimizer (maquette v5 app-network-packet-pi.html, rangée « tools ») :
// test de stabilité, bufferbloat, MTU et état actuel. Ce fichier rend leur résultat ; la page lance l'outil.
import type { Key } from "../lib/i18n";
import { engineText } from "../lib/netopt";
import { useStore } from "../lib/store";
import { I } from "../s5/I";

export type ToolId = "quality" | "loaded" | "mtu" | "status";
/** Outils dans l'ordre de la maquette, avec leur icône. */
export const TOOLS: { id: ToolId; icon: string }[] = [
  { id: "quality", icon: "activity" },
  { id: "loaded", icon: "gauge" },
  { id: "mtu", icon: "maximize" },
  { id: "status", icon: "eye" },
];

export const validTarget = (t: string) => /^[A-Za-z0-9][A-Za-z0-9.:-]{0,252}$/.test(t);

/** Résultat d'un outil, tel que le moteur le renvoie (`result` de netopt_run). */
export function ToolResult({ id, result: r, onUnstable }: { id: ToolId; result: Record<string, unknown>; onUnstable?: () => void }) {
  const { t, lang } = useStore();
  const num = (x: unknown) => String(x ?? "–");
  if (id === "quality")
    return r.noAnswer ? (
      <p className="tx">{t("no.q.noAnswer")}</p>
    ) : (
      <>
        <b className={`vd ${r.stable ? "ok" : "ko"}`}>{r.stable ? t("no.q.stable") : t("no.q.unstable")}</b>
        <p className="mt">{t("no.q.line", { min: num(r.min), max: num(r.max), avg: num(r.avg), p95: num(r.p95) })}</p>
        <p className="mt">{t("no.q.line2", { jitter: num(r.jitter), loss: num(r.loss), spikes: num(r.spikes) })}</p>
        {!r.stable && onUnstable && (
          <button type="button" className="lnk" onClick={onUnstable}>
            {t("no.q.setNo")}
            <I n="right" />
          </button>
        )}
      </>
    );
  if (id === "loaded") {
    const good = r.grade === "A+" || r.grade === "A";
    return r.noAnswer ? (
      <p className="tx">{t("no.q.noAnswer")}</p>
    ) : (
      <>
        <b className={`vd ${good ? "ok" : "ko"}`}>{t("no.l.grade", { grade: num(r.grade) })}</b>
        <p className="mt">{t("no.l.line", { idle: num(r.idleMed), busy: num(r.busyMed), delta: num(r.delta) })}</p>
        <p className="tx">{good ? t("no.l.good") : t("no.l.bad")}</p>
      </>
    );
  }
  if (id === "mtu")
    return r.mtu ? (
      <>
        <b className="vd ok">{t("no.m.result", { mtu: num(r.mtu), alias: num(r.alias), cur: num(r.current) })}</b>
        <p className="tx">{t("no.m.note")}</p>
      </>
    ) : (
      <p className="tx">{t("no.m.fail")}</p>
    );
  return (
    <table className="stt">
      <tbody>
        {((r.rows ?? []) as { s: string; k: string; v: string }[]).map((row, i) => (
          <tr key={i} className={row.v === "" ? "hd" : undefined}>
            <td>{engineText(row.k, lang)}</td>
            <td>{engineText(row.v, lang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const toolName = (id: ToolId): Key => `s5.no.t.${id}` as Key;
