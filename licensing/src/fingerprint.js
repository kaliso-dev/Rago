// Device fingerprint: three hashed hardware/OS identifiers sent by Rago Optimizer.
// The app computes each one as hex(SHA-256("rago-fp-v1|" + name + "|" + normalized value)),
// see docs/API.md. The server never sees the raw identifiers.
export const COMPONENTS = ['machine_guid', 'smbios_uuid', 'board_serial'];
const HEX64 = /^[0-9a-f]{64}$/;

export class DeviceError extends Error {}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseDevice(input) {
  if (!input || typeof input !== 'object') throw new DeviceError('device is required');
  const fp = input.fingerprint;
  if (!fp || typeof fp !== 'object' || fp.v !== 1) throw new DeviceError('device.fingerprint.v must be 1');
  const comps = {};
  let present = 0;
  for (const name of COMPONENTS) {
    const v = fp[name];
    if (v === null || v === undefined || v === '') comps[name] = null;
    else if (typeof v === 'string' && HEX64.test(v.toLowerCase())) {
      comps[name] = v.toLowerCase();
      present++;
    } else throw new DeviceError(`device.fingerprint.${name} must be a 64-char hex SHA-256 or null`);
  }
  if (!comps.machine_guid) throw new DeviceError('device.fingerprint.machine_guid is required');
  if (present < 1) throw new DeviceError('device.fingerprint is empty');
  return {
    fp: comps,
    name: clean(input.name, 64) || 'Windows PC',
    os: clean(input.os, 64),
    appVersion: clean(input.app_version, 32),
  };
}

/**
 * Same device when at least 2 identifiers match (or all of them, when fewer than 2 are
 * comparable). Tolerates one change: a new motherboard, or a Windows reinstall
 * (new MachineGuid) on the same hardware.
 */
export function sameDevice(stored, incoming) {
  let comparable = 0;
  let matches = 0;
  for (const name of COMPONENTS) {
    if (stored[name] && incoming[name]) {
      comparable++;
      if (stored[name] === incoming[name]) matches++;
    }
  }
  if (comparable === 0) return false;
  return matches >= Math.min(2, comparable);
}
