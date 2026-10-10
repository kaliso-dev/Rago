// Support tools. Usage: npm run admin -- <command> [args]
//   show <email>                 account, license, device and recent events, plus purchases with this
//                                email that no account holds yet
//   attach <email> [license-id]  put a paid license nobody claimed on this account (tab closed, account
//                                made on another device or after 48 h). license-id: when it was paid
//                                with another email (see show <purchase email>)
//   claim-link <email>           new "create your account" link for an unclaimed purchase (old link stops)
//   reset-link <email>           a "choose a new password" link (1 hour), when the email doesn't arrive
//   reset-device <email>         free the device so the license can be activated on another PC
//   revoke <email> [reason]      disable the license (Rago Optimizer goes back to free at its next check)
//   restore <email>              re-enable a revoked license
//   grant <email> [note]         create a license by hand (e.g. Discord buyers of the .bat Premium)
//   grant-months <months> <email> [email…]
//                                Premium for that many months from today, then it stops by itself (e.g.
//                                grant-months 6 a@x.com b@y.com). Emails with Premium already are skipped
//   create-user <email> <pass>   create an account (testing)
//   affiliate <email>            affiliate code, referrals and why each counts or not
//   create-promo <CODE> <percent> [once|forever]
//                                a Stripe promotion code people type at checkout or get from the site
//                                (/buy?promo=CODE), e.g. create-promo RAGO15 15 for the site's pop-up.
//                                Made in the mode of STRIPE_SECRET_KEY (test or live)
//   popup                        what the site's discount pop-up shows, and how many uses are left (also on /admin)
//   popup <CODE> [percent] [customers]
//                                the pop-up's code, e.g. popup RAGO50 50 15: 50% off the first payment for the
//                                first 15 customers (created in Stripe when new; customers left out = no limit)
//   popup title|eyebrow|text "…" the pop-up's words; {percent} {code} {total} {left} are filled in
//   popup off | on               hide or show the pop-up
//   delete-user <email>          GDPR erasure: cancel the subscription, delete the account, PC and
//                                sessions, anonymize the license kept for accounting
//   export-keys                  print LICENSE_SIGNING_KEY and SESSION_SECRET to save outside the database
//   reviews                      the latest reviews, with their author's email and whether the site shows them
//   hide-review <email>          take that account's review off the site (spam, abuse); show-review puts it back
//   remove-photo <email>         delete that account's profile photo (inappropriate picture)
//   set-name <email> <name>      change the public name shown with that account's review
//   discord <email>              the Discord account linked to it and its Pro role, given again or taken back now
//   discord                      the same for every linked account (the server does it every 5 minutes)
//   discord-unlink <email>       take the Pro role back and unlink their Discord account
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import * as L from '../src/licensing.js';
import * as A from '../src/affiliates.js';
import * as P from '../src/profile.js';
import * as R from '../src/reviews.js';
import { createDiscord, DiscordError } from '../src/discord.js';
import Stripe from 'stripe';

const cfg = loadConfig({ ...process.env, NODE_ENV: 'development' });
if (!cfg.databaseUrl) { console.error('Set DATABASE_URL (Supabase connection string) first.'); process.exit(1); }
const db = await openDb(cfg.databaseUrl);
const [cmd, email, ...rest] = process.argv.slice(2);
const fmt = (ms) => (ms ? new Date(ms).toISOString() : '-');
// Profile photos live in Supabase Storage: without its keys the file would stay there after the account forgets it.
function photoStore() {
  const store = P.createAvatarStore(cfg);
  if (store.kind !== 'supabase') { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY too (same as Railway): the photo file is deleted from Supabase Storage.'); process.exit(1); }
  return store;
}

async function licenseOf(email) {
  if (!email) { console.error('Give the email.'); process.exit(1); }
  const user = await L.findUserByEmail(db, email);
  const lic = (user && await L.licenseForUser(db, user.id)) || (await L.unclaimedLicenses(db, email))[0];
  if (!lic) { console.error(`No license for ${email}`); process.exit(1); }
  return { user, lic };
}
// The Pro role bot, with the same DISCORD_ variables as Railway.
function discordBot() {
  const bot = createDiscord(cfg, { db });
  if (!bot) { console.error('Set the five DISCORD_ variables (same as Railway) first.'); process.exit(1); }
  return bot;
}
const discordLine = (d) => (d ? `@${d.discord_name} (${d.discord_id}), Pro role ${d.role ? 'given' : 'not given'}${d.error ? `, last problem: ${d.error}` : ''}, linked ${fmt(d.linked_at)}` : 'not linked');
const unclaimedLine = (l) => `${l.id}  ${l.email}  ${l.status}  ${l.plan}  ${l.source}  paid ${fmt(l.created_at)}${l.referral_code ? `  code ${l.referral_code}` : ''}`;

switch (cmd) {
  case 'show': {
    const { user, lic } = await licenseOf(email);
    const dev = await L.getDevice(db, lic.id);
    console.log({ account: user ? { id: user.id, email: user.email, created: fmt(user.created_at) } : 'none (unclaimed)',
      license: { id: lic.id, key: lic.key, status: lic.status, reason: lic.status_reason, source: lic.source, plan: lic.plan, paid_until: fmt(lic.current_period_end), cancel_at_period_end: lic.cancel_at_period_end,
        subscription: lic.stripe_subscription_id, created: fmt(lic.created_at), payment_intent: lic.stripe_payment_intent },
      device: dev ? { name: dev.name, os: dev.os, bound: fmt(dev.bound_at), last_seen: fmt(dev.last_seen_at), ip: dev.last_ip } : 'not activated',
      discord: user ? discordLine(await db.get('SELECT * FROM discord_links WHERE user_id = ?', [user.id])) : '-' });
    for (const e of await db.all('SELECT * FROM audit WHERE license_id = ? ORDER BY id DESC LIMIT 15', [lic.id])) console.log(fmt(e.at), e.type, e.detail || '');
    const loose = (await L.unclaimedLicenses(db, email)).filter((l) => l.id !== lic.id || user);
    if (loose.length) {
      console.log(`\nNot on any account yet (${user ? 'attach' : 'claim-link'} ${email}):`);
      for (const l of loose) console.log(' ', unclaimedLine(l));
    }
    break;
  }
  case 'attach': {
    const user = await L.findUserByEmail(db, email);
    if (!user) { console.error(`No account for ${email}: send them a claim-link instead, or ask them to create the account first.`); process.exit(1); }
    let lic;
    if (rest[0]) lic = await L.getLicense(db, rest[0]);
    else {
      const loose = await L.unclaimedLicenses(db, email);
      if (loose.length > 1) { console.error('Several unclaimed licenses, add the id:'); for (const l of loose) console.error(' ', unclaimedLine(l)); process.exit(1); }
      lic = loose[0];
    }
    if (!lic) { console.error(`No unclaimed license for ${email}. Paid with another email? Run show <that email>, then attach ${email} <license-id>.`); process.exit(1); }
    try {
      await L.claimLicense(db, lic.id, user.id);
    } catch (err) {
      const why = { already_claimed: 'that license is already on another account', already_has_license: `${email} already has an active license (duplicate purchase? refund it in Stripe, then revoke the extra one)`, not_found: 'no license with that id' }[err.code];
      if (!why) throw err;
      console.error(`Not attached: ${why}.`); process.exit(1);
    }
    console.log(`License ${lic.key} is now on ${email}. They see it on their account page and can activate it in the app.`);
    if (lic.referral_code) console.log(`The purchase came with referral code ${lic.referral_code}: it isn't applied by hand (run affiliate <affiliate email> to check that player's status).`);
    break;
  }
  case 'claim-link': {
    const loose = await L.unclaimedLicenses(db, email || '');
    if (!loose.length) { console.error(`No unclaimed license for ${email}.`); process.exit(1); }
    const lic = rest[0] ? loose.find((l) => l.id === rest[0]) : loose[0];
    if (!lic) { console.error('That id is not one of them.'); process.exit(1); }
    console.log(`Send this link to ${lic.email} (create the account or sign in, the license follows):\n${cfg.publicUrl}/claim/${await L.newClaimToken(db, lic.id)}`);
    break;
  }
  case 'reset-link': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    console.log(`Send this link to ${user.email} only (works for 1 hour):\n${cfg.publicUrl}/reset/${await L.createPasswordReset(db, user.id)}`);
    break;
  }
  case 'reset-device': await L.resetDevice(db, (await licenseOf(email)).lic.id, 'support'); console.log('Device freed.'); break;
  case 'revoke':
  case 'restore': {
    const { user, lic } = await licenseOf(email);
    await L.setLicenseStatus(db, lic.id, cmd === 'revoke' ? 'revoked' : 'active', cmd === 'revoke' ? rest[0] || 'manual' : null);
    // The Discord Pro role follows now rather than at the server's next pass (5 minutes).
    const bot = user && createDiscord(cfg, { db });
    const d = bot && await bot.syncUser(user.id);
    console.log(`${cmd === 'revoke' ? 'Revoked' : 'Restored'}.${d ? ` Discord: ${discordLine(d)}.` : ''}`);
    break;
  }
  case 'grant': {
    const { license, claimToken } = await L.grantLicense(db, email, rest.join(' '));
    console.log(`License ${license.key} for ${email}.`);
    console.log(claimToken ? `Send this link so they create their account: ${cfg.publicUrl}/claim/${claimToken}` : 'Added to their existing account.');
    break;
  }
  case 'grant-months': {
    // A pasted list works too: emails separated by spaces, commas or semicolons. Run twice, nobody gets two.
    const months = Number(email);
    const emails = [...new Set(rest.join(' ').split(/[\s,;]+/).map((e) => e.toLowerCase()).filter(Boolean))];
    if (!(Number.isInteger(months) && months >= 1 && months <= 120) || !emails.length) { console.error('Usage: grant-months 6 player@mail.com [other@mail.com …]'); process.exit(1); }
    const day = (ms) => new Date(Number(ms)).toISOString().slice(0, 10);
    let given = 0;
    for (const to of emails) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { console.log(`${to}: not an email, skipped.`); continue; }
      const user = await L.findUserByEmail(db, to);
      const owned = user && await L.current(db, await L.licenseForUser(db, user.id));
      if (owned?.status === 'active') { console.log(`${to}: already Premium (${owned.plan}${owned.plan !== 'lifetime' && owned.current_period_end ? ` until ${day(owned.current_period_end)}` : ''}), nothing given.`); continue; }
      const waiting = (await L.unclaimedLicenses(db, to)).find((l) => l.status === 'active');
      if (waiting) { console.log(`${to}: a license already waits for this email (${waiting.id}), nothing given. claim-link ${to} prints a new link.`); continue; }
      const { license, claimToken } = await L.grantLicense(db, to, `grant-months ${months}`, { months });
      given++;
      console.log(`${to}: license ${license.key}, Premium until ${day(license.current_period_end)}.`);
      console.log(claimToken ? `  Send this link so they create their account: ${cfg.publicUrl}/claim/${claimToken}` : '  Added to their existing account.');
    }
    if (emails.length > 1) console.log(`\n${given} of ${emails.length} given.`);
    break;
  }
  case 'affiliate': {
    const user = await L.findUserByEmail(db, email);
    if (!user) { console.error(`No account for ${email}`); process.exit(1); }
    await A.evaluateAffiliate(db, cfg, user.id, { stripe: cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null });
    const sum = await A.affiliateSummary(db, cfg, user.id);
    if (!sum) { console.log('Not in the affiliate program.'); break; }
    console.log({ code: sum.code, counted: sum.counted, towards_next: `${sum.progress}/${sum.goal}`, rewards: `${sum.rewards} x ${sum.months} months` });
    const failed = await db.get("SELECT * FROM audit WHERE user_id = ? AND type = 'affiliate.reward_failed' ORDER BY id DESC LIMIT 1", [user.id]);
    if (failed) console.log(`Last reward that could not be given (retried every hour): ${fmt(failed.at)} ${failed.detail || ''}`);
    for (const r of await db.all(`SELECT r.status, r.void_reason, r.created_at, r.machine_guid IS NOT NULL AS activated, l.email
      FROM referrals r JOIN licenses l ON l.id = r.license_id WHERE r.affiliate_user_id = ? ORDER BY r.created_at`, [user.id])) {
      console.log(fmt(r.created_at), r.email, r.status, r.void_reason || '', r.activated ? 'activated' : 'not activated');
    }
    const risk = await db.all("SELECT * FROM audit WHERE user_id = ? AND type = 'affiliate.reward_at_risk' ORDER BY id", [user.id]);
    if (risk.length) {
      console.log(`\nWarning: ${risk.length} counted player(s) refunded or disputed after a reward. The reward stays;`);
      console.log(`to take it back: revoke ${email} affiliate_fraud (only if it's the reward license, see show ${email}).`);
      for (const e of risk) console.log(' ', fmt(e.at), e.detail || '');
    }
    break;
  }
  case 'create-promo': {
    const code = String(email || '').toUpperCase();
    const pct = Number(rest[0]);
    const duration = rest[1] === 'forever' ? 'forever' : 'once';
    if (!/^[A-Z0-9-]{2,40}$/.test(code) || !(pct > 0 && pct < 100)) { console.error('Usage: create-promo RAGO15 15 [once|forever]'); process.exit(1); }
    if (!cfg.stripeSecretKey) { console.error('Set STRIPE_SECRET_KEY first.'); process.exit(1); }
    const stripe = new Stripe(cfg.stripeSecretKey);
    const { ensureCoupon, findPromotionCode } = await import('../src/billing.js');
    const existing = await findPromotionCode(stripe, code);
    if (existing) { console.log(`${code} already exists (${existing.id}).`); break; }
    const coupon = await ensureCoupon(stripe, `rago-promo-${pct}-${duration}`, pct, duration, `${pct}% off`);
    const promo = await stripe.promotionCodes.create({ promotion: { type: 'coupon', coupon }, code, restrictions: { first_time_transaction: true } });
    console.log(`${code}: ${pct}% off ${duration === 'once' ? 'the first payment' : 'every payment'}, new customers only (${promo.id}, ${/^(sk|rk)_live_/.test(cfg.stripeSecretKey) ? 'live' : 'test'} mode).`);
    break;
  }
  case 'popup': {
    const Popup = await import('../src/promo.js');
    const stripe = cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
    const [what, ...more] = [email, ...rest].filter((a) => a != null && a !== '');
    let input = null;
    if (what === 'off' || what === 'on') input = { enabled: what === 'on' };
    else if (['title', 'eyebrow', 'text'].includes(what)) input = { [what]: more.join(' ') };
    else if (what) input = { enabled: true, code: what, percent: more[0] ?? '', limit: more[1] ?? '' };
    if (input) {
      try {
        const out = await Popup.savePopup(db, stripe, input);
        console.log(out.created ? `${out.promo.code} créé dans Stripe et enregistré.` : 'Enregistré.');
      } catch (err) {
        if (!(err instanceof Popup.PopupError)) throw err;
        console.error(err.message); process.exit(1);
      }
    }
    const st = await Popup.popupState(db, stripe, cfg);
    const { settings: s, promo: p } = st;
    console.log(`Pop-up : ${st.shown ? 'affichée sur le site' : `masquée. ${st.reason}`}${st.shown ? ' (le site suit en moins d’une minute)' : ''}`);
    if (p) {
      console.log(`Code : ${p.code}, ${p.percent == null ? 'montant fixe' : `${p.percent} %`} ${{ once: 'sur le premier paiement', forever: 'sur chaque paiement' }[p.duration] || ''}${p.firstTime ? ', nouveaux clients' : ''} (Stripe ${st.mode})`);
      console.log(`Utilisations : ${p.total == null ? `${p.used}, sans limite` : `${p.used} sur ${p.total}, ${p.left} restantes`}`);
    } else console.log(`Code : ${s.code}`);
    console.log(`Petit titre : ${s.eyebrow}\nTitre : ${s.title}\nTexte : ${s.text}`);
    break;
  }
  case 'create-user': await L.createUser(db, email, rest[0]); console.log('User created.'); break;
  case 'delete-user': {
    const target = String(email || '').toLowerCase();
    const user = await L.findUserByEmail(db, target);
    const lics = await db.all('SELECT * FROM licenses WHERE email = ? OR (user_id IS NOT NULL AND user_id = ?)', [target, user?.id ?? '']);
    if (!user && !lics.length) { console.error(`Nothing stored for ${target}`); process.exit(1); }
    // The profile photo goes first (Storage); the review goes with the account below.
    if (user?.avatar_key) await P.removeAvatar(db, photoStore(), user.id);
    // The Discord Pro role too (the link itself goes with the account).
    if (user && (await db.get('SELECT role FROM discord_links WHERE user_id = ?', [user.id]))?.role) await discordBot().unlink(user.id);
    const stripe = cfg.stripeSecretKey ? new Stripe(cfg.stripeSecretKey) : null;
    for (const l of lics) {
      if (l.stripe_subscription_id && l.status === 'active') {
        if (!stripe) { console.error('Active subscription: set STRIPE_SECRET_KEY so it can be canceled first.'); process.exit(1); }
        try { await stripe.subscriptions.cancel(l.stripe_subscription_id); console.log(`Subscription ${l.stripe_subscription_id} canceled.`); }
        catch (err) { if (!/No such subscription|canceled/i.test(err.message)) throw err; }
      }
    }
    await db.tx(async (t) => {
      for (const l of lics) {
        await t.run('DELETE FROM devices WHERE license_id = ?', [l.id]);
        // Kept for accounting (amount, Stripe ids), without the person.
        await t.run(`UPDATE licenses SET user_id = NULL, email = ?, claim_token_hash = NULL, status = 'revoked', status_reason = 'deleted' WHERE id = ?`,
          [`deleted-${l.id}@deleted.invalid`, l.id]);
        await t.run('UPDATE audit SET detail = NULL WHERE license_id = ?', [l.id]);
      }
      if (user) {
        await t.run('UPDATE audit SET detail = NULL WHERE user_id = ?', [user.id]);
        await t.run('DELETE FROM users WHERE id = ?', [user.id]); // sessions, resets, affiliate, referrals, review follow
      }
    });
    console.log(`Deleted ${target}: account ${user ? 'removed' : 'none'}, ${lics.length} license(s) anonymized.`);
    break;
  }
  case 'reviews': {
    const rows = await db.all(`SELECT r.*, u.email, u.display_name FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.updated_at DESC LIMIT ?`, [Number(email) || 30]);
    if (!rows.length) console.log('No review yet: the site hides its Reviews section.');
    for (const r of rows) console.log(`${fmt(r.updated_at)}  ${'*'.repeat(r.rating)}${' '.repeat(5 - r.rating)}  ${r.status === 'published' ? 'shown ' : 'HIDDEN'}  ${r.display_name || '(no name, not shown)'} <${r.email}>\n    ${r.comment.replace(/\n/g, '\n    ')}`);
    break;
  }
  case 'hide-review':
  case 'show-review': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user || !(await R.setReviewStatus(db, user.id, cmd === 'hide-review' ? 'hidden' : 'published'))) { console.error(`No review from ${email}.`); process.exit(1); }
    console.log(cmd === 'hide-review' ? 'Review hidden from the site (within a minute). The player still sees it in the app, marked as hidden.' : 'Review shown on the site again.');
    break;
  }
  case 'remove-photo': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    await P.removeAvatar(db, photoStore(), user.id);
    console.log('Photo removed: the first letter of their name shows instead.');
    break;
  }
  case 'set-name': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    try { await P.setName(db, user.id, rest.join(' ')); } catch (err) { console.error(err.message); process.exit(1); }
    console.log('Public name changed.');
    break;
  }
  case 'discord': {
    const bot = discordBot();
    if (!email) {
      await bot.syncAll({ all: true });
      const s = await db.get('SELECT COUNT(*)::int AS linked, COUNT(*) FILTER (WHERE role)::int AS with_role, COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS failing FROM discord_links');
      console.log(`${s.linked} linked account(s), ${s.with_role} with the Pro role, ${s.failing} with a problem (see /admin).`);
      for (const r of await db.all('SELECT d.*, u.email FROM discord_links d JOIN users u ON u.id = d.user_id WHERE d.error IS NOT NULL ORDER BY d.linked_at')) console.log(' ', r.email, discordLine(r));
      break;
    }
    const user = await L.findUserByEmail(db, email);
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    const row = await bot.syncUser(user.id, { force: true });
    console.log(row ? discordLine(row) : `${email} hasn't linked a Discord account: they do it from their account page (Link Discord).`);
    break;
  }
  case 'discord-unlink': {
    const user = await L.findUserByEmail(db, email || '');
    if (!user) { console.error(`No account for ${email}.`); process.exit(1); }
    try {
      console.log((await discordBot().unlink(user.id)) ? 'Discord unlinked, Pro role taken back.' : 'No Discord account linked.');
    } catch (err) {
      if (!(err instanceof DiscordError)) throw err;
      console.error(`Discord refused: ${err.message}`); process.exit(1);
    }
    break;
  }
  case 'export-keys': {
    // The signing key's public half is compiled into every Rago Optimizer build: lose it and every
    // installed app rejects new licenses. Keep these two values in a password manager.
    const rows = await db.all("SELECT name, value FROM server_secrets WHERE name IN ('license_signing_key', 'session_secret')");
    const get = (n) => rows.find((r) => r.name === n)?.value;
    if (process.env.LICENSE_SIGNING_KEY) console.log('LICENSE_SIGNING_KEY is set in the environment: that is the key in use, keep that value.');
    else if (get('license_signing_key')) console.log(`LICENSE_SIGNING_KEY=${Buffer.from(get('license_signing_key')).toString('base64')}`);
    if (process.env.SESSION_SECRET) console.log('SESSION_SECRET is set in the environment: that is the one in use.');
    else if (get('session_secret')) console.log(`SESSION_SECRET=${get('session_secret')}`);
    break;
  }
  default:
    console.log('Commands: show, attach, claim-link, reset-link, reset-device, revoke, restore, grant, grant-months, affiliate, create-promo, popup, create-user, delete-user, export-keys, reviews, hide-review, show-review, remove-photo, set-name, discord, discord-unlink (see scripts/admin.js)');
}
await db.close();
