// Player reviews, left from Rago Optimizer: one per account, edited in place, shown on the site.
// Text is stored as typed (trimmed). Pages and the site always render it as text, never as HTML.
import { avatarUrl, ProfileError } from './profile.js';

export const COMMENT_MAX = 600;

/** { rating, comment } ready to store, or a ProfileError saying what to fix. */
export function cleanReview({ rating, comment } = {}) {
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw new ProfileError('invalid_rating', 'Pick a rating from 1 to 5 stars.');
  const text = String(comment ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    // control characters out, except line breaks; no more than one empty line in a row
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) throw new ProfileError('empty_comment', 'Write a few words about Rago Optimizer.');
  if (text.length > COMMENT_MAX) throw new ProfileError('comment_too_long', `Keep your review under ${COMMENT_MAX} characters.`);
  return { rating: r, comment: text };
}

export const reviewOf = (db, userId) => db.get('SELECT * FROM reviews WHERE user_id = ?', [userId]);

/** Creates the account's review, or replaces it: an account never has two. */
export async function saveReview(db, userId, input, appVersion = null) {
  const { rating, comment } = cleanReview(input);
  const now = Date.now();
  await db.run(`INSERT INTO reviews (user_id, rating, comment, app_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, app_version = EXCLUDED.app_version, updated_at = EXCLUDED.updated_at`,
  [userId, rating, comment, appVersion ? String(appVersion).slice(0, 20) : null, now, now]);
  return reviewOf(db, userId);
}

/** The player deletes their review: it leaves the site at once. A new one can be left later. */
export async function deleteReview(db, userId) {
  const { changes } = await db.run('DELETE FROM reviews WHERE user_id = ?', [userId]);
  return changes > 0;
}

/** What the app shows about the player's own review. */
export const reviewView = (r) => (r ? { rating: r.rating, comment: r.comment, updated_at: new Date(Number(r.updated_at)).toISOString(), hidden: r.status !== 'published' } : null);

/** Reviews shown on the site, newest first. Only published ones, from accounts with a public name. */
export async function publicReviews(db, cfg, limit = 60) {
  const rows = await db.all(`SELECT r.rating, r.comment, r.updated_at, u.display_name, u.avatar_key FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.status = 'published' AND u.display_name IS NOT NULL ORDER BY r.updated_at DESC LIMIT ?`, [limit]);
  const stats = await db.get(`SELECT COUNT(*)::int AS count, ROUND(AVG(r.rating)::numeric, 1)::float AS average FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.status = 'published' AND u.display_name IS NOT NULL`);
  return {
    count: stats.count,
    average: stats.count ? Number(stats.average) : null,
    reviews: rows.map((r) => ({ name: r.display_name, rating: r.rating, comment: r.comment, avatar_url: avatarUrl(cfg, r.avatar_key), date: new Date(Number(r.updated_at)).toISOString().slice(0, 10) })),
  };
}

/** Support: hide a review from the site (abuse, spam) or show it again. */
export async function setReviewStatus(db, userId, status) {
  const { changes } = await db.run('UPDATE reviews SET status = ? WHERE user_id = ?', [status, userId]);
  return changes > 0;
}
