export function uid(prefix = 'id') {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  const rand = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${rand}`;
}

export function slugFromTitle(title: string) {
  const core = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^snd-/, '')
    .slice(0, 40);
  return core ? `snd-${core}` : '';
}

export function normalizeSlug(value: string) {
  return slugFromTitle(value.replace(/^snd-/, ''));
}

export function shortAddr(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function explain(err: unknown) {
  if (!err || typeof err !== 'object') return 'Could not execute.';
  const rec = err as { shortMessage?: string; message?: string };
  const msg = rec.shortMessage || rec.message || 'Could not execute.';
  if (/user rejected|user denied|rejected the request/i.test(msg)) return 'Signature cancelled.';
  return msg.split('\n')[0]?.slice(0, 300) || 'Could not execute.';
}
