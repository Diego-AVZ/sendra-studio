import type { User } from '@supabase/supabase-js';
import { parseProtocol, type ProtocolDocument } from '@/schema/protocol';
import { cloudEnabled, supabase } from '@/lib/supabase';

const PHRASE = 'sendra-studio';

export type StorageMode = 'off' | 'protocols' | 'universes';

let cached: StorageMode | null = null;

type DbError = { message?: string; code?: string } | null;

function isMissing(error: DbError) {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === '42P01' || /schema cache|sendra_protocols/i.test(error.message || '');
}

export function resetStorageProbe() {
  cached = null;
}

export async function storageMode(): Promise<StorageMode> {
  if (!supabase) return 'off';
  if (cached) return cached;
  const probe = await within(
    Promise.resolve(supabase.from('sendra_protocols').select('id').limit(1)) as Promise<{ error: DbError } | null>,
    2500,
    null,
  );
  if (!probe) return 'off';
  if (!probe.error) cached = 'protocols';
  else if (isMissing(probe.error)) cached = 'universes';
  else cached = 'off';
  return cached;
}

function within<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const result = await within(supabase.auth.getSession(), 1800, null);
  if (!result) return null;
  return result.data.session?.user ?? null;
}

async function hashPhrase(phrase: string) {
  const bytes = new TextEncoder().encode(phrase);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function asError(error: DbError) {
  if (error?.code === '23505') return new Error('That link already exists. Choose another.');
  return new Error(error?.message || 'Supabase did not save it.');
}

function rowOf(doc: ProtocolDocument, ownerId: string, title: string) {
  return {
    local_id: doc.meta.id,
    owner_id: ownerId,
    slug: doc.meta.slug || null,
    title,
    status: doc.meta.status,
    document: doc,
    updated_at: doc.meta.updatedAt,
    published_at: doc.meta.publishedAt ?? null,
  };
}

async function ensureProfile(user: User) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert(
    { id: user.id, display_name: user.email ?? '' },
    { onConflict: 'id' },
  );
  if (error) throw asError(error);
}

async function upsert(table: 'sendra_protocols' | 'universes', body: Record<string, unknown>, ownerId: string, localId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const found = await supabase.from(table).select('id').eq('local_id', localId).eq('owner_id', ownerId).maybeSingle();
  if (found.error && !isMissing(found.error) && found.error.code !== 'PGRST116') return found.error;
  if (found.data && typeof found.data === 'object' && 'id' in found.data && found.data.id) {
    const updated = await supabase.from(table).update(body).eq('id', found.data.id).eq('owner_id', ownerId);
    return updated.error;
  }
  const inserted = await supabase.from(table).insert(body);
  return inserted.error;
}

export async function saveRemote(doc: ProtocolDocument) {
  const user = await currentUser();
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!user) throw new Error('Sign in with your email to publish the link outside this browser.');
  if (!doc.meta.id.startsWith('snd_')) throw new Error('Invalid protocol id.');
  await ensureProfile(user);
  const mode = await storageMode();
  if (mode === 'off') throw new Error('Supabase did not respond. The protocol stays in this browser.');

  if (mode === 'protocols') {
    const error = await upsert('sendra_protocols', rowOf(doc, user.id, doc.meta.title), user.id, doc.meta.id);
    if (error && isMissing(error)) {
      cached = 'universes';
    } else if (error) {
      throw asError(error);
    } else {
      await supabase.from('universes').delete().eq('owner_id', user.id).eq('local_id', doc.meta.id);
      return;
    }
  }

  const hash = await hashPhrase(PHRASE);
  const base = rowOf(doc, user.id, `Sendra · ${doc.meta.title}`);
  let error = await upsert('universes', { ...base, unlock_hash: hash }, user.id, doc.meta.id);
  if (error && /unlock_hash/i.test(error.message || '')) {
    error = await upsert('universes', base, user.id, doc.meta.id);
  }
  if (error) throw asError(error);
}

export type RemoteSummary = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function mapRows(data: unknown): RemoteSummary[] {
  if (!Array.isArray(data)) return [];
  const rows: RemoteSummary[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = asText(row.local_id);
    if (!id.startsWith('snd_')) continue;
    const title = asText(row.title).replace(/^Sendra · /, '');
    rows.push({
      id,
      title: title || 'Untitled protocol',
      slug: asText(row.slug),
      status: row.status === 'published' ? 'published' : 'draft',
      updatedAt: asText(row.updated_at),
    });
  }
  return rows;
}

export async function listRemote(): Promise<RemoteSummary[]> {
  const user = await currentUser();
  if (!supabase || !user) return [];
  const mode = await storageMode();
  const rows: RemoteSummary[] = [];
  if (mode === 'protocols') {
    const { data, error } = await supabase
      .from('sendra_protocols')
      .select('local_id, title, slug, status, updated_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });
    if (!error) rows.push(...mapRows(data));
  }
  const legacy = await supabase
    .from('universes')
    .select('local_id, title, slug, status, updated_at')
    .eq('owner_id', user.id)
    .like('local_id', 'snd_%')
    .order('updated_at', { ascending: false });
  if (!legacy.error) rows.push(...mapRows(legacy.data));
  return rows;
}

function readDoc(raw: unknown): ProtocolDocument | null {
  try {
    return parseProtocol(raw);
  } catch {
    return null;
  }
}

export async function loadRemote(id: string): Promise<ProtocolDocument | null> {
  const user = await currentUser();
  if (!supabase || !user || !id.startsWith('snd_')) return null;
  const primary = await supabase
    .from('sendra_protocols')
    .select('document')
    .eq('local_id', id)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!primary.error && primary.data && typeof primary.data === 'object' && 'document' in primary.data) {
    const doc = readDoc(primary.data.document);
    if (doc) return doc;
  }
  const legacy = await supabase.from('universes').select('document').eq('local_id', id).eq('owner_id', user.id).maybeSingle();
  if (legacy.error || !legacy.data || typeof legacy.data !== 'object' || !('document' in legacy.data)) return null;
  return readDoc(legacy.data.document);
}

function extractGift(raw: unknown): unknown {
  if (Array.isArray(raw)) return extractGift(raw[0]);
  if (!raw || typeof raw !== 'object') return raw;
  const rec = raw as Record<string, unknown>;
  if ('read_gift' in rec) return extractGift(rec.read_gift);
  if (rec.state === 'open' && 'document' in rec) return rec.document;
  if (rec.state === 'locked' || rec.state === 'missing' || rec.state === 'wrong') return null;
  return raw;
}

export async function loadPublishedRemote(slug: string): Promise<ProtocolDocument | null> {
  if (!supabase || !slug) return null;
  const primary = await supabase
    .from('sendra_protocols')
    .select('document')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!primary.error && primary.data && typeof primary.data === 'object' && 'document' in primary.data) {
    const doc = readDoc(primary.data.document);
    if (doc?.meta.status === 'published') return doc;
  }
  const open = await supabase.from('universes').select('document').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (!open.error && open.data && typeof open.data === 'object' && 'document' in open.data) {
    const doc = readDoc(open.data.document);
    if (doc?.meta.status === 'published') return doc;
  }
  const rpc = await supabase.rpc('read_gift', { p_slug: slug, p_phrase: PHRASE });
  if (rpc.error) return null;
  const doc = readDoc(extractGift(rpc.data));
  return doc?.meta.status === 'published' ? doc : null;
}

export type PublicProtocol = {
  title: string;
  slug: string;
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function publicRows(data: unknown, onlySendra: boolean): PublicProtocol[] {
  if (!Array.isArray(data)) return [];
  const rows: PublicProtocol[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const localId = asText(row.local_id);
    if (onlySendra && !localId.startsWith('snd_')) continue;
    const slug = asText(row.slug);
    if (!slug) continue;
    rows.push({ title: asText(row.title).replace(/^Sendra · /, '') || slug, slug });
  }
  return rows;
}

export async function searchProtocols(query: string): Promise<PublicProtocol[]> {
  const q = query.trim();
  if (!supabase || q.length < 1) return [];
  const pattern = `%${escapeLike(q)}%`;
  const tables = [
    { name: 'sendra_protocols' as const, sendra: false },
    { name: 'universes' as const, sendra: true },
  ];
  const jobs = tables.flatMap((table) => {
    const base = () => {
      let request = supabase!.from(table.name).select('local_id, title, slug').eq('status', 'published');
      if (table.sendra) request = request.like('local_id', 'snd_%');
      return request;
    };
    return [base().ilike('title', pattern).limit(8), base().ilike('slug', pattern).limit(8)];
  });
  const settled = await Promise.all(jobs);
  const seen = new Set<string>();
  const hits: PublicProtocol[] = [];
  settled.forEach((result, index) => {
    if (result.error) return;
    for (const row of publicRows(result.data, index >= 2)) {
      const key = row.slug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(row);
    }
  });
  const needle = q.toLowerCase();
  hits.sort((a, b) => rankHit(a, needle) - rankHit(b, needle) || a.title.localeCompare(b.title));
  return hits.slice(0, 12);
}

function rankHit(row: PublicProtocol, needle: string) {
  const title = row.title.toLowerCase();
  const slug = row.slug.toLowerCase();
  if (title === needle || slug === needle || slug === `snd-${needle}`) return 0;
  if (title.startsWith(needle) || slug.startsWith(needle)) return 1;
  return 2;
}

async function rowExists(table: 'sendra_protocols' | 'universes', column: 'title' | 'slug', value: string, exceptId: string, sendra: boolean) {
  if (!supabase || !value) return false;
  let request = supabase.from(table).select('local_id').limit(6);
  if (sendra) request = request.like('local_id', 'snd_%');
  const result = column === 'slug' ? await request.eq('slug', value) : await request.ilike('title', escapeLike(value));
  if (result.error || !Array.isArray(result.data)) return false;
  return result.data.some((item) => {
    if (!item || typeof item !== 'object') return false;
    return asText((item as Record<string, unknown>).local_id) !== exceptId;
  });
}

export async function protocolClash(input: { title?: string; slug?: string; exceptId: string }) {
  const title = (input.title ?? '').trim();
  const slug = (input.slug ?? '').trim();
  const found = { title: false, slug: false };
  if (!supabase || (!title && !slug)) return found;
  await Promise.all([
    title
      ? (async () => {
          found.title =
            (await rowExists('sendra_protocols', 'title', title, input.exceptId, false)) ||
            (await rowExists('universes', 'title', title, input.exceptId, true)) ||
            (await rowExists('universes', 'title', `Sendra · ${title}`, input.exceptId, true));
        })()
      : Promise.resolve(),
    slug
      ? (async () => {
          found.slug =
            (await rowExists('sendra_protocols', 'slug', slug, input.exceptId, false)) ||
            (await rowExists('universes', 'slug', slug, input.exceptId, true));
        })()
      : Promise.resolve(),
  ]);
  return found;
}

export async function deleteRemote(id: string) {
  const user = await currentUser();
  if (!supabase || !user || !id.startsWith('snd_')) return;
  const tables = ['sendra_protocols', 'universes'] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('local_id', id).eq('owner_id', user.id);
    if (error && !isMissing(error)) throw asError(error);
  }
}

export { cloudEnabled };
