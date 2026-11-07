import { useState } from "react";
import { ArrowRight, LoaderCircle, TriangleAlert } from "lucide-react";
import type { Key } from "../lib/i18n";
import { engineText } from "../lib/netopt";
import { useStore } from "../lib/store";
import { Button } from "./ui";

/** Outils du moteur réseau (netopt.rs) : test de stabilité, bufferbloat et MTU dans le test réseau, état actuel dans le
 * Packet Optimizer. */
export type ToolId = "quality" | "loaded" | "mtu" | "status";

export const validTarget = (t: string) => /^[A-Za-z0-9][A-Za-z0-9.:-]{0,252}$/.test(t);

export function Tool({
  id,
  running,
  disabled,
  result,
  progress,
  onRun,
  onUnstable,
}: {
  id: ToolId;
  running: boolean;
  disabled: boolean;
  result: Record<string, unknown> | undefined;
  progress: { step: number; total: number } | null;
  onRun: () => void;
  /** test de stabilité : ligne instable, le lien qui le dit au Packet Optimizer */
  onUnstable?: () => void;
}) {
  const { t, lang } = useStore();
  const [confirm, setConfirm] = useState(false);
  const r = result;
  const num = (x: unknown) => String(x ?? "—");
  return (
    <div className={`no-tool${running ? " running" : ""}`}>
      <div className="no-tool-row">
        <div className="no-toggle-text">
          <div className="no-toggle-title">{t(`no.tool.${id}` as Key)}</div>
          <div className="no-toggle-desc">{t(`no.tool.${id}.desc` as Key)}</div>
        </div>
        <Button
          size="sm"
          disabled={disabled}
          icon={running ? <LoaderCircle size={12} className="spin" /> : undefined}
          onClick={() => (id === "loaded" && !confirm ? setConfirm(true) : (setConfirm(false), onRun()))}
        >
          {running && progress?.total ? `${Math.round((progress.step / progress.total) * 100)} %` : t("no.tool.run")}
        </Button>
      </div>
      {confirm && !running && (
        <div className="no-tool-confirm small">
          <TriangleAlert size={13} />
          <span>{t("no.tool.loaded.confirm")}</span>
          <Button size="sm" variant="primary" onClick={() => (setConfirm(false), onRun())}>
            {t("no.tool.run")}
          </Button>
        </div>
      )}
      {r && !running && (
        <div className="no-tool-result small">
          {id === "quality" &&
            (r.noAnswer ? (
              <span className="muted">{t("no.q.noAnswer")}</span>
            ) : (
              <>
                <div className={`no-verdict ${r.stable ? "ok" : "warn"}`}>{r.stable ? t("no.q.stable") : t("no.q.unstable")}</div>
                <div className="muted rg-metric">{t("no.q.line", { min: num(r.min), max: num(r.max), avg: num(r.avg), p95: num(r.p95) })}</div>
                <div className="muted rg-metric">{t("no.q.line2", { jitter: num(r.jitter), loss: num(r.loss), spikes: num(r.spikes) })}</div>
                {!r.stable && onUnstable && (
                  <button type="button" className="link no-suggest" onClick={onUnstable}>
                    {t("no.q.setNo")}
                    <ArrowRight size={12} />
                  </button>
                )}
              </>
            ))}
          {id === "loaded" &&
            (r.noAnswer ? (
              <span className="muted">{t("no.q.noAnswer")}</span>
            ) : (
              <>
                <div className={`no-verdict ${r.grade === "A+" || r.grade === "A" ? "ok" : "warn"}`}>{t("no.l.grade", { grade: num(r.grade) })}</div>
                <div className="muted rg-metric">{t("no.l.line", { idle: num(r.idleMed), busy: num(r.busyMed), delta: num(r.delta) })}</div>
                <div className="muted">{r.grade === "A+" || r.grade === "A" ? t("no.l.good") : t("no.l.bad")}</div>
              </>
            ))}
          {id === "mtu" &&
            (r.mtu ? (
              <>
                <div className="no-verdict ok rg-metric">{t("no.m.result", { mtu: num(r.mtu), alias: num(r.alias), cur: num(r.current) })}</div>
                <div className="muted">{t("no.m.note")}</div>
              </>
            ) : (
              <span className="muted">{t("no.m.fail")}</span>
            ))}
          {id === "status" && (
            <table className="no-status rg-metric">
              <tbody>
                {(r.rows as { s: string; k: string; v: string }[]).map((row, i) => (
                  <tr key={i} className={row.v === "" ? "head" : undefined}>
                    <td>{engineText(row.k, lang)}</td>
                    <td>{engineText(row.v, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
