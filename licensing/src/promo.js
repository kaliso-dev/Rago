// The site's discount pop-up. What it says is a setting (site_settings 'popup'), changed from /admin or
// `npm run admin -- popup`; the site reads it on every visit (GET /api/v1/promo). The discount itself is a
// Stripe promotion code: its percent, its number of uses and how many are taken come from Stripe, so the
// pop-up never offers more than Stripe gives, and hides itself once the code is used up.
// Messages are in French: only Sofiene reads them (/admin and the admin command).
import { ensureCoupon, stripeMode } from './billing.js';

export const POPUP_DEFAULTS = Object.freeze({
  enabled: true,
  code: 'RAGO15',
  eyebrow: 'Welcome offer',
  title: 'Get {percent}% off now!',
  text: 'Use this code on your first Premium payment, monthly or yearly.',
});
const TEXTS = { eyebrow: ['Le petit titre', 40], title: ['Le titre', 80], text: ['Le texte', 280] };
const CODE = /^[A-Z0-9-]{2,40}$/;
const MAX_LIMIT = 100000;

export class PopupError extends Error {}

export { stripeMode };

/** The saved settings, with the defaults for anything never saved. */
export async function getPopup(db) {
  const row = await db.get("SELECT value FROM site_settings WHERE name = 'popup'");
  let saved = {};
  try { saved = row ? JSON.parse(row.value) : {}; } catch { saved = {}; }
  const out = { ...POPUP_DEFAULTS };
  if (typeof saved.enabled === 'boolean') out.enabled = saved.enabled;
  for (const k of ['code', ...Object.keys(TEXTS)]) if (typeof saved[k] === 'string' && saved[k]) out[k] = saved[k];
  return out;
}

/**
 * The promotion code in Stripe (the active one when several share the code) with its coupon, or null.
 * total: how many times it can be used (null = no limit); used: how many times it was.
 */
export async function findStripeCode(stripe, code) {
  if (!CODE.test(String(code || '').toUpperCase())) return null;
  const { data } = await stripe.promotionCodes.list({ code, limit: 10 });
  const promo = data.find((p) => p.active) || data[0];
  if (!promo) return null;
  let coupon = promo.promotion?.coupon ?? promo.coupon ?? null;
  if (typeof coupon === 'string') coupon = await stripe.coupons.retrieve(coupon);
  const total = promo.max_redemptions ?? null;
  const used = promo.times_redeemed || 0;
  return {
    id: promo.id,
    code: promo.code,
    active: !!promo.active,
    percent: coupon?.percent_off ?? null,
    duration: coupon?.duration || null,
    total,
    used,
    left: total == null ? null : Math.max(0, total - used),
    full: total != null && used >= total,
    expired: !!promo.expires_at && promo.expires_at * 1000 <= Date.now(),
    firstTime: !!promo.restrictions?.first_time_transaction,
  };
}

/** Why the pop-up is hidden right now, or null when it shows. */
function hiddenReason(settings, promo, { stripe, error, mode }) {
  if (!settings.enabled) return 'Tu l’as désactivée.';
  if (!stripe) return 'STRIPE_SECRET_KEY manque sur le serveur.';
  if (error) return `Stripe n’a pas répondu (${error}).`;
  if (!promo) return `${settings.code} n’existe pas dans Stripe (mode ${mode}).`;
  if (promo.full) return `Les ${promo.total} utilisations de ${promo.code} sont prises.`;
  if (promo.expired) return `${promo.code} a expiré dans Stripe.`;
  if (!promo.active) return `${promo.code} est désactivé dans Stripe.`;
  if (!(promo.percent > 0)) return `Le coupon de ${promo.code} n’est pas un pourcentage : la pop-up ne sait pas l’afficher.`;
  return null;
}

/**
 * Everything /admin and the admin command show: the settings, the code in Stripe, and whether the site shows
 * the pop-up (reason when it doesn't). Never throws for Stripe: its error goes in `error`.
 */
export async function popupState(db, stripe, cfg) {
  const settings = await getPopup(db);
  const mode = stripeMode(cfg);
  let promo = null;
  let error = null;
  if (stripe && settings.code) {
    try { promo = await findStripeCode(stripe, settings.code); } catch (err) { error = err.message || String(err); }
  }
  const reason = hiddenReason(settings, promo, { stripe, error, mode });
  return { settings, promo, error, mode, shown: !reason, reason };
}

/** What the site's pop-up shows, or null when it's hidden. {placeholders} are filled in by the site. */
export function publicPopup(state) {
  if (!state.shown) return null;
  const { settings: s, promo: p } = state;
  return { code: p.code, percent: p.percent, eyebrow: s.eyebrow, title: s.title, text: s.text, total: p.total, left: p.left };
}

/** {percent}, {code}, {total} and {left} replaced, as the site does it (for the /admin preview). */
export function fillPopupText(text, { percent, code, total, left }) {
  const v = { percent, code, total: total ?? '', left: left ?? '' };
  return String(text).replace(/\{(percent|code|total|left)\}/g, (_, k) => String(v[k]));
}

/** "" or missing: null. "50", "50 %", 50: 50. Anything else: NaN (refused by the caller). */
function number(v) {
  if (v == null) return null;
  const s = String(v).replace(/[\s%]/g, '').replace(',', '.');
  return s === '' ? null : Number(s);
}

/**
 * Saves what the pop-up shows. Only the keys present in `input` change:
 * { enabled, code, percent, limit, eyebrow, title, text } (form strings or numbers).
 * A code Stripe doesn't have yet is created there: `percent` off the first payment, for new customers only,
 * usable `limit` times (empty = no limit). Stripe can't change the percent or the limit of an existing code:
 * a different value asks for a new code. Returns { settings, promo, created }.
 */
export async function savePopup(db, stripe, input) {
  const next = await getPopup(db);
  if ('enabled' in input) next.enabled = !!input.enabled;
  if ('code' in input) next.code = String(input.code ?? '').trim().toUpperCase();
  for (const [k, [label, max]] of Object.entries(TEXTS)) {
    if (!(k in input)) continue;
    const v = String(input[k] ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/ {2,}/g, ' ').trim();
    if (!v) throw new PopupError(`${label} est vide.`);
    if (v.length > max) throw new PopupError(`${label} fait ${v.length} caractères : ${max} au maximum.`);
    next[k] = v;
  }
  if (!CODE.test(next.code)) throw new PopupError('Le code doit faire de 2 à 40 caractères : lettres, chiffres et tirets seulement (ex. RAGO50).');
  const percent = number(input.percent);
  const limit = number(input.limit);
  if (percent != null && !(percent > 0 && percent < 100)) throw new PopupError('La réduction est un pourcentage de 1 à 99.');
  if (limit != null && !(Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT)) throw new PopupError('Le nombre de clients est un nombre entier à partir de 1. Laisse vide pour ne pas limiter.');

  let promo = null;
  let created = false;
  // Turning the pop-up off works even when Stripe is out of reach. Turning it back on checks the code.
  if (next.enabled) {
    if (!stripe) throw new PopupError('STRIPE_SECRET_KEY manque : impossible de vérifier le code dans Stripe.');
    try {
      promo = await findStripeCode(stripe, next.code);
      if (!promo) {
        if (percent == null) throw new PopupError(`${next.code} n’existe pas encore dans Stripe : indique la réduction en % pour le créer.`);
        if (!Number.isInteger(percent)) throw new PopupError('Pour créer un code, la réduction est un nombre entier de 1 à 99 (en %).');
        const coupon = await ensureCoupon(stripe, `rago-promo-${percent}-once`, percent, 'once', `${percent}% off`);
        await stripe.promotionCodes.create({
          promotion: { type: 'coupon', coupon },
          code: next.code,
          ...(limit != null ? { max_redemptions: limit } : {}),
          restrictions: { first_time_transaction: true },
          metadata: { rago: 'popup' },
        });
        promo = await findStripeCode(stripe, next.code);
        created = true;
      }
    } catch (err) {
      if (err instanceof PopupError) throw err;
      throw new PopupError(`Stripe a refusé : ${err.message || err}`);
    }
    if (!created) {
      const fresh = 'Stripe ne permet pas de la changer sur un code existant : choisis un nouveau code.';
      if (percent != null && percent !== promo.percent) {
        throw new PopupError(`${promo.code} existe déjà dans Stripe avec ${promo.percent == null ? 'une réduction en montant fixe' : `${promo.percent} % de réduction`}. ${fresh}`);
      }
      if (limit != null && limit !== promo.total) {
        throw new PopupError(`${promo.code} existe déjà dans Stripe ${promo.total == null ? 'sans limite d’utilisations' : `pour ${promo.total} clients`}. ${fresh.replace('la changer', 'changer la limite')}`);
      }
      if (!promo.active && !promo.full) throw new PopupError(`${promo.code} est désactivé dans Stripe. Réactive-le dans Stripe, ou choisis un nouveau code.`);
    }
  }
  await db.run(`INSERT INTO site_settings (name, value, updated_at) VALUES ('popup', ?, ?)
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`, [JSON.stringify(next), Date.now()]);
  return { settings: next, promo, created };
}
