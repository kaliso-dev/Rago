// A small MaxMind DB writer for the tests (https://maxmind.github.io/MaxMind-DB/), shaped like DB-IP's databases:
// an IPv6 tree with the IPv4 addresses under ::/96, 24-bit records. Networks must not overlap.

function control(type, size) {
  const head = [];
  let bits = size;
  const extra = [];
  if (size >= 65821) [bits, extra[0], extra[1], extra[2]] = [31, (size - 65821) >> 16, ((size - 65821) >> 8) & 255, (size - 65821) & 255];
  else if (size >= 285) [bits, extra[0], extra[1]] = [30, (size - 285) >> 8, (size - 285) & 255];
  else if (size >= 29) [bits, extra[0]] = [29, size - 29];
  if (type <= 7) head.push((type << 5) | bits);
  else head.push(bits, type - 7);
  return Buffer.from([...head, ...extra]);
}

function encode(value) {
  if (typeof value === 'string') {
    const b = Buffer.from(value, 'utf8');
    return Buffer.concat([control(2, b.length), b]);
  }
  if (typeof value === 'boolean') return control(14, value ? 1 : 0);
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 2 ** 32) {
    const bytes = [];
    for (let v = value; v > 0; v = Math.floor(v / 256)) bytes.unshift(v % 256);
    return Buffer.concat([control(6, bytes.length), Buffer.from(bytes)]);
  }
  if (typeof value === 'number') {
    const b = Buffer.alloc(8);
    b.writeDoubleBE(value);
    return Buffer.concat([control(3, 8), b]);
  }
  if (Array.isArray(value)) return Buffer.concat([control(11, value.length), ...value.map(encode)]);
  const entries = Object.entries(value);
  return Buffer.concat([control(7, entries.length), ...entries.flatMap(([k, v]) => [encode(k), encode(v)])]);
}

/** The 128 bits of an IPv4 (under ::/96) or IPv6 network, cut at its prefix. */
function bits(cidr) {
  const [addr, len] = cidr.split('/');
  if (addr.includes('.')) {
    const v4 = addr.split('.').flatMap((n) => Number(n).toString(2).padStart(8, '0').split('').map(Number));
    return [...new Array(96).fill(0), ...v4].slice(0, 96 + Number(len));
  }
  const [a, b = ''] = addr.split('::');
  const left = a ? a.split(':') : [];
  const right = b ? b.split(':') : [];
  const groups = [...left, ...new Array(8 - left.length - right.length).fill('0'), ...right];
  return groups.flatMap((g) => parseInt(g, 16).toString(2).padStart(16, '0').split('').map(Number)).slice(0, Number(len));
}

/** A database with `entries` ([{ network: '81.2.69.0/24', data: {...} }]) and the type in its metadata. */
export function writeMmdb(entries, type = 'Test') {
  const nodes = [[null, null]]; // records: { node }, { data }, or null (no data)
  const data = [];
  let offset = 0;
  for (const { network, data: value } of entries) {
    const path = bits(network);
    const bytes = encode(value);
    data.push(bytes);
    let n = 0;
    path.forEach((bit, i) => {
      if (i === path.length - 1) {
        nodes[n][bit] = { data: offset };
        return;
      }
      if (!nodes[n][bit]?.node) {
        nodes.push([null, null]);
        nodes[n][bit] = { node: nodes.length - 1 };
      }
      n = nodes[n][bit].node;
    });
    offset += bytes.length;
  }
  const count = nodes.length;
  const record = (r) => (r == null ? count : r.node != null ? r.node : count + 16 + r.data);
  const tree = Buffer.alloc(count * 6);
  nodes.forEach(([l, r], i) => {
    tree.writeUIntBE(record(l), i * 6, 3);
    tree.writeUIntBE(record(r), i * 6 + 3, 3);
  });
  const meta = encode({
    node_count: count, record_size: 24, ip_version: 6, database_type: type, languages: ['en'],
    binary_format_major_version: 2, binary_format_minor_version: 0, build_epoch: 1793000000, description: { en: type },
  });
  return Buffer.concat([tree, Buffer.alloc(16), ...data, Buffer.from([0xab, 0xcd, 0xef]), Buffer.from('MaxMind.com'), meta]);
}
