// The Discord gateway (2026-10-12): the live connection that tells the Rago bot when a member joins or leaves,
// when an invite is made, and when someone runs a slash command. The REST calls in discord.js only act; this
// listens. One guild, so no sharding. Node 22's built-in WebSocket, no library.
const OP = { DISPATCH: 0, HEARTBEAT: 1, IDENTIFY: 2, RESUME: 6, RECONNECT: 7, INVALID_SESSION: 9, HELLO: 10, HEARTBEAT_ACK: 11 };

export const INTENTS = { GUILDS: 1 << 0, GUILD_MEMBERS: 1 << 1, GUILD_INVITES: 1 << 6 };

// Closes Discord won't accept a retry for: the setting has to change first. French: only Sofiene reads the logs.
const FATAL = {
  4004: 'DISCORD_BOT_TOKEN refusé par Discord : recopie le token du bot.',
  4010: 'shard invalide.',
  4011: 'le bot est sur trop de serveurs pour une seule connexion.',
  4012: 'version de la gateway refusée.',
  4013: 'intents invalides.',
  4014: 'Developer Portal → ton application → Bot → Privileged Gateway Intents : active « Server Members Intent », puis redémarre le serveur.',
};
// The session can't be resumed after these: identify again.
const FRESH = new Set([4007, 4009]);

/**
 * Connects and stays connected: heartbeats, resumes after a drop, identifies again when Discord asks.
 * onDispatch(type, data) gets every event (READY, GUILD_MEMBER_ADD…); its errors are logged, never thrown.
 * `call` is the bot's REST client (for the gateway address). Returns { close, state }.
 */
export function connectGateway({ token, intents, onDispatch, call, log = console, WebSocketImpl = globalThis.WebSocket, random = Math.random }) {
  let ws = null;
  let seq = null;
  let sessionId = null;
  let resumeUrl = null;
  let beat = null;
  let acked = true;
  let stopped = false;
  let failures = 0;
  const state = { connected: false, since: null, error: null };

  const send = (op, d) => ws?.readyState === 1 && ws.send(JSON.stringify({ op, d }));
  const stopBeat = () => { clearTimeout(beat); clearInterval(beat); beat = null; };

  function heartbeat() {
    // No answer to the last one: the connection is dead without having closed. Drop it and resume.
    if (!acked) { ws?.close(4000, 'zombie'); return; }
    acked = false;
    send(OP.HEARTBEAT, seq);
  }

  async function open() {
    if (stopped) return;
    let url = resumeUrl;
    try {
      if (!sessionId || !url) url = (await call('GET', '/gateway/bot')).url;
    } catch (err) {
      return retry(`adresse de la gateway introuvable : ${err.message}`);
    }
    const resuming = !!sessionId;
    let socket;
    try {
      socket = new WebSocketImpl(`${url}/?v=10&encoding=json`);
    } catch (err) {
      return retry(`connexion impossible : ${err.message}`); // no WebSocket in this Node (22.4 and later have it)
    }
    ws = socket;
    socket.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8')); } catch { return; }
      onMessage(msg, resuming);
    });
    socket.addEventListener('close', (ev) => { if (ws === socket) closed(ev.code); });
    socket.addEventListener('error', () => {}); // a close follows
  }

  function onMessage({ op, d, s, t }, resuming) {
    if (s != null) seq = s;
    switch (op) {
      case OP.HELLO:
        stopBeat();
        acked = true;
        // The first beat at a random point of the interval, as Discord asks (not all bots at once after an outage).
        beat = setTimeout(() => { heartbeat(); beat = setInterval(heartbeat, d.heartbeat_interval); beat.unref?.(); }, d.heartbeat_interval * random());
        beat.unref?.();
        if (resuming) send(OP.RESUME, { token, session_id: sessionId, seq });
        else send(OP.IDENTIFY, { token, intents, properties: { os: 'linux', browser: 'rago', device: 'rago' } });
        break;
      case OP.HEARTBEAT_ACK: acked = true; break;
      case OP.HEARTBEAT: send(OP.HEARTBEAT, seq); break;
      case OP.RECONNECT: ws?.close(4000, 'reconnect'); break;
      case OP.INVALID_SESSION:
        // d = resumable. Not resumable: identify again, after 1 to 5 seconds.
        if (!d) { sessionId = null; resumeUrl = null; seq = null; }
        ws?.close(4000, 'invalid session');
        break;
      case OP.DISPATCH:
        if (t === 'READY') { sessionId = d.session_id; resumeUrl = d.resume_gateway_url; }
        if (t === 'READY' || t === 'RESUMED') {
          failures = 0;
          Object.assign(state, { connected: true, since: Date.now(), error: null });
          log.info?.(`[gateway] ${t === 'READY' ? 'connecté' : 'reconnecté'}.`);
        }
        Promise.resolve().then(() => onDispatch(t, d)).catch((err) => log.error(`[gateway] ${t} non traité :`, err?.message || err));
        break;
      default: break;
    }
  }

  function closed(code) {
    stopBeat();
    ws = null;
    state.connected = false;
    if (stopped) return;
    if (FATAL[code]) {
      stopped = true;
      state.error = FATAL[code];
      log.error(`[gateway] arrêtée (${code}) : ${FATAL[code]}`);
      return;
    }
    if (FRESH.has(code)) { sessionId = null; resumeUrl = null; seq = null; }
    retry(`connexion fermée (${code})`);
  }

  function retry(why) {
    failures += 1;
    // 1 to 5 s after a normal drop, then longer while it keeps failing, up to a minute.
    const wait = failures <= 1 ? 1000 + 4000 * random() : Math.min(60000, 1000 * 2 ** failures);
    if (failures > 1) log.error(`[gateway] ${why}, nouvel essai dans ${Math.round(wait / 1000)} s.`);
    state.error = failures > 3 ? why : null;
    setTimeout(open, wait).unref?.();
  }

  open();
  return {
    state,
    close() { stopped = true; stopBeat(); ws?.close(1000, 'shutdown'); },
  };
}
