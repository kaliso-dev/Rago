// Onglet « tweaks » de Réseau, à l'identique de la maquette v5 app-network-pi.html : trois profils (hitreg, ping,
// paquets) en boutons d'options, puis les réglages un par un (carreaux TweakRow) et leurs avancés repliés.
import { useEffect, useRef, useState } from "react";
import { availability, catalog, sectionTweaks, tweaks, type Tweak } from "../lib/catalog";
import type { Key } from "../lib/i18n";
import { useStore } from "../lib/store";
import { I } from "../s5/I";
import { TweakRow } from "../components/TweakRow";

/** Les trois profils de la maquette : réglage, nombre de colonnes, texte court de chaque option (sinon le numéro). */
const PROFILES: { id: string; title: Key; cols: 2 | 3 | 4; short?: (v: string) => Key }[] = [
  { id: "ping_hitreg", title: "s5.net.p.hitreg", cols: 3, short: (v) => `s5.net.hit.${v}` as Key },
  { id: "ping_main", title: "s5.net.p.ping", cols: 4 },
  { id: "ping_packets", title: "s5.net.p.packets", cols: 2, short: (v) => `s5.net.pk.${v}` as Key },
];
/** Ordre des paquets dans la maquette (hitreg, knockback, qos), différent du catalogue. */
const PACKET_ORDER = ["hitreg", "knockback", "qos"];
/** Réglages de la grille « settings » : tout le module sauf les profils et l'action de redémarrage (bouton de la barre).
 * Le profil réseau par jeu (net_profile) vit sur la page Minecraft. */
const SKIP = new Set(["ping_hitreg", "ping_main", "ping_packets", "net_profile", "net_restart"]);
/** Nom court du carreau (maquette) ; la recherche et l'historique gardent le nom du catalogue. */
const short = (id: string) => `s5.net.nm.${id}` as Key;

function Profile({ tw, title, cols, short }: { tw: Tweak; title: Key; cols: 2 | 3 | 4; short?: (v: string) => Key }) {
  const { t, lang, selected, applied, pendingUndo, variantOf, setVariant, toggle, isLocked, variantLocked, setUpsell, focusTweak, focusSeq, setFocusTweak } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const id = tw.id;
  const done = applied.get(id);
  const sel = selected.has(id);
  const undoing = !!done && pendingUndo.includes(id);
  const locked = isLocked(id) && !done;
  // la variante « retour » (Default) n'est pas une option : c'est « off »
  let vs = (tw.variants ?? []).filter((v) => !v.revert);
  if (id === "ping_packets") vs = [...vs].sort((a, b) => PACKET_ORDER.indexOf(a.id) - PACKET_ORDER.indexOf(b.id));
  const cur = sel ? variantOf(tw) : done && !undoing ? done.variant : null;
  const focused = focusTweak === id;

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
    const h = setTimeout(() => setFocusTweak(null), 1800);
    return () => clearTimeout(h);
  }, [focused, focusSeq, setFocusTweak]);

  const choose = (v: string) => {
    if (locked || variantLocked(id, v)) return setUpsell("tweak", id);
    setVariant(id, v);
    if (!done && !sel) toggle(id, true);
    // appliqué puis « off » demandé : on le rallume
    if (undoing) toggle(id, true);
  };
  const off = () => {
    if (locked) return setUpsell("tweak", id);
    toggle(id, false);
  };

  const state = sel ? " is-pend" : done && !undoing ? " is-on" : "";
  // « off » : coché pour être annulé (pend), ou rien d'allumé ni de prévu (now)
  const offCls = undoing ? " pend" : !cur ? " now" : "";
  const label = (v: { id: string; label: { fr: string; en: string } }, i: number) => (short ? t(short(v.id)) : String(i + 1));
  return (
    <div ref={ref} className={`prof panel${state}${focused ? " focused" : ""}`} title={tw.name[lang]}>
      <div className="ph">
        <h3>{t(title)}</h3>
        {!tw.reboot && <I n="zap" />}
        {locked && <I n="lock" />}
      </div>
      <div className={`opts c${cols}`} role="radiogroup" aria-label={tw.name[lang]}>
        {vs.map((v, i) => {
          const on = v.id === cur;
          const c = `o${short ? "" : " n"}${on ? (sel ? " pend" : " on") : ""}${variantLocked(id, v.id) ? " lkd" : ""}`;
          return (
            <button key={v.id} type="button" role="radio" aria-checked={on} className={c} title={v.label[lang]} onClick={() => choose(v.id)}>
              {label(v, i)}
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={!cur} className={`o off${cols === 4 ? " w4" : ""}${offCls}`} onClick={off}>
          {t("s5.net.off")}
        </button>
      </div>
    </div>
  );
}

export function NetTweaks() {
  const { t, sys, applied, pendingUndo, isLocked, undoOnly, premium, selected, selectMany, setUpsell, focusTweak, focusSeq } = useStore();
  const mod = catalog.modules.find((m) => m.id === "network")!;
  const all = mod.sections.flatMap((s) => sectionTweaks(s)).filter((tw) => !SKIP.has(tw.id));
  const reg = all.filter((tw) => tw.risk !== "advanced");
  const adv = all.filter((tw) => tw.risk === "advanced");
  const sw = reg.filter((tw) => tw.kind === "tweak");
  const nOn = sw.filter((tw) => applied.has(tw.id) && !pendingUndo.includes(tw.id)).length;
  const safe = sw.filter((tw) => tw.risk === "safe" && availability(tw, sys).ok && !tw.confirm && !isLocked(tw.id) && !undoOnly(tw.id)).map((tw) => tw.id);
  const allSafeOn = safe.every((id) => selected.has(id) || (applied.has(id) && !pendingUndo.includes(id)));
  const [advOpen, setAdvOpen] = useState(false);
  // un réglage ajouté plus tard au catalogue sans nom court garde son nom
  const nm = (id: string) => (t(short(id)) === short(id) ? undefined : t(short(id)));

  // recherche vers un réglage avancé : on déplie les avancés pour que le carreau se montre
  useEffect(() => {
    if (focusTweak && adv.some((tw) => tw.id === focusTweak)) setAdvOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTweak, focusSeq]);

  return (
    <>
      <section className="profiles">
        <div className="sh">
          <h2 className="h2 tape">{t("s5.net.profiles")}</h2>
        </div>
        <div className="pgrid">
          {PROFILES.map((p) => {
            const tw = tweaks.get(p.id);
            return tw ? <Profile key={p.id} tw={tw} title={p.title} cols={p.cols} short={p.short} /> : null;
          })}
        </div>
      </section>

      <section className="settings">
        <div className="sh">
          <h2 className="h2 tape">{t("s5.net.settings")}</h2>
          <span className="cnt">
            {nOn}
            <small> / {sw.length}</small>
          </span>
          {!premium && safe.length === 0 ? (
            <button type="button" className="btn sm" onClick={() => setUpsell("plan")}>
              <I n="lock" />
              {t("free.lock")}
            </button>
          ) : (
            <button type="button" className="btn sm" disabled={allSafeOn} onClick={() => selectMany(safe)}>
              <I n="check" />
              {t("s5.mod.selectSafe")}
            </button>
          )}
        </div>
        <div className="tgrid">
          {reg.map((tw) => (
            <TweakRow key={tw.id} tweak={tw} mod="network" label={nm(tw.id)} />
          ))}
          {adv.length > 0 &&
            (advOpen ? (
              <>
                <div className="advh">
                  {t("s5.mod.advanced")}
                  <em>{adv.length}</em>
                  <small>{t("s5.mod.advLead")}</small>
                  <i className="ln" />
                  <button type="button" className="hd" onClick={() => setAdvOpen(false)}>
                    {t("module.hide")}
                    <I n="chev" />
                  </button>
                </div>
                {adv.map((tw) => (
                  <TweakRow key={tw.id} tweak={tw} mod="network" adv label={nm(tw.id)} />
                ))}
              </>
            ) : (
              <button type="button" className="tw adv" aria-expanded={false} onClick={() => setAdvOpen(true)}>
                <span className="nm">{t("s5.mod.advanced")}</span>
                <em>{adv.length}</em>
                <I n="chev" className="chev" />
              </button>
            ))}
        </div>
      </section>
    </>
  );
}
