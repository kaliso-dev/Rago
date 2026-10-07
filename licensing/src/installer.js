// Finds the Windows installer and returns a link to download it.
// Order: INSTALLER_URL (any public link), then Supabase Storage (private bucket, 5-minute signed link),
// then a file on the server's disk (INSTALLER_PATH).
// In Storage, the newest .exe of INSTALLER_OBJECT's bucket and folder is served, whatever its name, so
// uploading "Rago Optimizer_1.1.0_x64-setup.exe" next to an older file serves the new one. The exact
// INSTALLER_OBJECT file is only a fallback when the folder can't be listed.
import { statSync } from 'node:fs';

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

export function createInstaller(cfg, { fetchImpl = fetch, log = console } = {}) {
  const headers = () => ({
    apikey: cfg.supabaseServiceKey,
    // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only in apikey.
    ...(cfg.supabaseServiceKey.startsWith('eyJ') ? { Authorization: `Bearer ${cfg.supabaseServiceKey}` } : {}),
    'Content-Type': 'application/json',
  });
  const [bucket, ...rest] = cfg.installerObject.split('/');
  const configuredPath = rest.join('/');
  const folder = configuredPath.includes('/') ? configuredPath.slice(0, configuredPath.lastIndexOf('/')) : '';
  let found = null; // { path, at } cached a few minutes

  async function sign(path) {
    const res = await fetchImpl(`${cfg.supabaseUrl}/storage/v1/object/sign/${bucket}/${encodePath(path)}`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ expiresIn: 300 }),
    });
    if (res.ok) return { url: (await res.json()).signedURL };
    return { status: res.status, body: (await res.text()).slice(0, 200) };
  }

  async function newestExe() {
    const res = await fetchImpl(`${cfg.supabaseUrl}/storage/v1/object/list/${bucket}`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ prefix: folder, limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
    });
    if (!res.ok) return { status: res.status, body: (await res.text()).slice(0, 200) };
    const files = (await res.json()).filter((f) => f.id && /\.exe$/i.test(f.name));
    files.sort((a, b) => String(b.created_at || b.updated_at).localeCompare(String(a.created_at || a.updated_at)));
    return files[0] ? { path: folder ? `${folder}/${files[0].name}` : files[0].name } : { status: 404, body: 'no .exe in the bucket' };
  }

  /** { url } to redirect to, { file } to stream from disk, or { error } with a reason for the logs. */
  async function resolve() {
    if (cfg.installerUrl) return { url: cfg.installerUrl, source: 'INSTALLER_URL' };
    if (cfg.supabaseUrl && cfg.supabaseServiceKey) {
      try {
        let last;
        if (found && Date.now() - found.at < 5 * 60 * 1000) {
          last = await sign(found.path);
          if (last.url) return link(found.path, last.url);
        }
        const exe = await newestExe();
        if (exe.path) {
          last = await sign(exe.path);
          if (last.url) {
            found = { path: exe.path, at: Date.now() };
            return link(exe.path, last.url);
          }
        } else last = exe;
        if (configuredPath && last.status !== 401 && last.status !== 403) {
          const direct = await sign(configuredPath);
          if (direct.url) return link(configuredPath, direct.url);
        }
        const reason = last.status === 400 || last.status === 401 || last.status === 403
          ? `Supabase refused the key (HTTP ${last.status}): check SUPABASE_SERVICE_ROLE_KEY. ${last.body}`
          : `No installer in bucket "${bucket}"${folder ? ` folder "${folder}"` : ''}: upload the .exe there (the file inside the GitHub zip, not the zip). ${last.body}`;
        return { error: reason };
      } catch (err) {
        return { error: `Supabase unreachable: ${err.message}. Check SUPABASE_URL.` };
      }
    }
    if (cfg.installerPath) {
      try { return { file: cfg.installerPath, size: statSync(cfg.installerPath).size, source: 'INSTALLER_PATH' }; } catch { return { error: `INSTALLER_PATH ${cfg.installerPath} not found` }; }
    }
    return { error: 'No installer configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or INSTALLER_URL).' };
  }

  function link(path, signed) {
    const sep = signed.includes('?') ? '&' : '?';
    const name = cfg.installerFileName || path.split('/').pop();
    return { url: `${cfg.supabaseUrl}/storage/v1${signed}${sep}download=${encodeURIComponent(name)}`, source: 'supabase', file: `${bucket}/${path}` };
  }

  return {
    async resolve() {
      const out = await resolve();
      if (out.error) log.error(`[download] ${out.error}`);
      return out;
    },
  };
}
