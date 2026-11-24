import { useCallback, useEffect, useRef, useState } from 'react';
import { currentUser, deleteRemote, listRemote, loadPublishedRemote, loadRemote, saveRemote, type RemoteSummary } from '@/lib/cloud';
import { cloudEnabled } from '@/lib/supabase';
import { parseProtocol, type ProtocolDocument } from '@/schema/protocol';
import { createProtocol, type TemplateId } from '@/schema/templates';

const INDEX = 'sendra.studio.index.v1';
const SLUGS = 'sendra.studio.slugs.v1';
const docKey = (id: string) => `sendra.studio.doc.v1.${id}`;

export type Summary = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
  template: string;
};

function isSummary(value: unknown): value is Summary {
  if (!value || typeof value !== 'object') return false;
  const row = value as Summary;
  return typeof row.id === 'string' && row.id.startsWith('snd_');
}

function readIndex(): Summary[] {
  try {
    const raw = localStorage.getItem(INDEX);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch {
    return [];
  }
}

function readSlugMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SLUGS);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeLocal(doc: ProtocolDocument) {
  const summary: Summary = {
    id: doc.meta.id,
    title: doc.meta.title || 'Untitled protocol',
    slug: doc.meta.slug,
    status: doc.meta.status,
    updatedAt: doc.meta.updatedAt,
    template: doc.meta.template,
  };
  try {
    localStorage.setItem(docKey(doc.meta.id), JSON.stringify(doc));
    const rows = readIndex().filter((row) => row.id !== doc.meta.id);
    rows.unshift(summary);
    localStorage.setItem(INDEX, JSON.stringify(rows.slice(0, 80)));
    const slugs = readSlugMap();
    for (const [slug, id] of Object.entries(slugs)) {
      if (id === doc.meta.id) delete slugs[slug];
    }
    if (doc.meta.slug) slugs[doc.meta.slug] = doc.meta.id;
    localStorage.setItem(SLUGS, JSON.stringify(slugs));
  } catch {
    throw new Error('The browser could not save the protocol.');
  }
}

export function readLocal(id: string): ProtocolDocument | null {
  try {
    const raw = localStorage.getItem(docKey(id));
    if (!raw) return null;
    return parseProtocol(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function readLocalBySlug(slug: string): ProtocolDocument | null {
  const id = readSlugMap()[slug];
  if (id) {
    const doc = readLocal(id);
    if (doc?.meta.slug === slug) return doc;
  }
  for (const row of readIndex()) {
    if (row.slug === slug) return readLocal(row.id);
  }
  return null;
}

export function listLocal(): Summary[] {
  return readIndex();
}

function removeLocal(id: string) {
  const rows = readIndex().filter((row) => row.id !== id);
  const slugs = readSlugMap();
  for (const [slug, owner] of Object.entries(slugs)) {
    if (owner === id) delete slugs[slug];
  }
  localStorage.removeItem(docKey(id));
  localStorage.setItem(INDEX, JSON.stringify(rows));
  localStorage.setItem(SLUGS, JSON.stringify(slugs));
}

function merge(local: Summary[], remote: RemoteSummary[]): Summary[] {
  const map = new Map<string, Summary>();
  for (const row of local) map.set(row.id, row);
  for (const row of remote) {
    const prev = map.get(row.id);
    if (!prev || Date.parse(row.updatedAt) >= Date.parse(prev.updatedAt || '')) {
      map.set(row.id, { ...row, template: prev?.template || 'custom' });
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
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

export async function listDrafts(): Promise<Summary[]> {
  const local = listLocal();
  if (!cloudEnabled()) return local;
  const remote = await within(listRemote(), 2500, [] as RemoteSummary[]);
  return merge(local, remote);
}

export async function loadDraft(id: string): Promise<ProtocolDocument | null> {
  const local = readLocal(id);
  const remote = await within(loadRemote(id), local ? 800 : 2500, null);
  if (local && remote) {
    return Date.parse(local.meta.updatedAt) >= Date.parse(remote.meta.updatedAt) ? local : remote;
  }
  return local ?? remote;
}

export function shareOnLan(doc: ProtocolDocument) {
  if (!import.meta.env.DEV || doc.meta.status !== 'published' || !doc.meta.slug) return;
  void fetch('/__published', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
  }).catch(() => undefined);
}

async function loadLan(slug: string): Promise<ProtocolDocument | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const res = await fetch(`/__published/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return parseProtocol((await res.json()) as unknown);
  } catch {
    return null;
  }
}

function newest(...docs: (ProtocolDocument | null)[]) {
  return docs.reduce<ProtocolDocument | null>((best, doc) => {
    if (!doc) return best;
    if (!best) return doc;
    return Date.parse(doc.meta.updatedAt) >= Date.parse(best.meta.updatedAt) ? doc : best;
  }, null);
}

export async function saveDraft(doc: ProtocolDocument) {
  const next = { ...doc, meta: { ...doc.meta, updatedAt: doc.meta.updatedAt || new Date().toISOString() } };
  writeLocal(next);
  shareOnLan(next);
  if (!cloudEnabled()) return 'local' as const;
  const user = await currentUser();
  if (!user) return 'local' as const;
  const saved = await within(saveRemote(next).then(() => 'remote' as const), 4000, 'local' as const);
  return saved;
}

export async function loadPublic(slug: string): Promise<ProtocolDocument | null> {
  const local = readLocalBySlug(slug);
  const localOk = local?.meta.status === 'published' ? local : null;
  const [remote, lan] = await Promise.all([
    within(loadPublishedRemote(slug), localOk ? 700 : 3500, null),
    within(loadLan(slug), 1200, null),
  ]);
  return newest(localOk, remote, lan);
}

export async function purgeDraft(id: string) {
  const existing = readLocal(id);
  removeLocal(id);
  if (import.meta.env.DEV && existing?.meta.slug) {
    void fetch(`/__published/${encodeURIComponent(existing.meta.slug)}`, { method: 'DELETE' }).catch(() => undefined);
  }
  await within(deleteRemote(id), 2500, undefined);
}

export async function startProtocol(which: TemplateId) {
  const doc = createProtocol(which);
  try {
    await saveDraft(doc);
  } catch (error) {
    if (!readLocal(doc.meta.id)) throw error;
  }
  return doc.meta.id;
}

export function slugTaken(slug: string, exceptId: string) {
  const hit = readLocalBySlug(slug);
  return Boolean(hit && hit.meta.id !== exceptId);
}

export function titleTaken(title: string, exceptId: string) {
  const name = title.trim().toLowerCase();
  if (!name) return false;
  return readIndex().some((row) => row.id !== exceptId && row.title.trim().toLowerCase() === name);
}

export function searchLocalPublished(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: { title: string; slug: string }[] = [];
  const seen = new Set<string>();
  for (const row of readIndex()) {
    if (row.status !== 'published' || !row.slug) continue;
    const title = row.title || 'Untitled protocol';
    if (!title.toLowerCase().includes(q) && !row.slug.toLowerCase().includes(q)) continue;
    const key = row.slug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({ title, slug: row.slug });
  }
  return hits.slice(0, 12);
}

export function useDraft(id: string) {
  const [doc, setDocState] = useState<ProtocolDocument | null>(null);
  const [bound, setBound] = useState(id);
  const [missing, setMissing] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const ref = useRef<ProtocolDocument | null>(null);
  const dirty = useRef(false);

  if (bound !== id) {
    setBound(id);
    setDocState(null);
    setMissing(false);
    setCloudError('');
    ref.current = null;
    dirty.current = false;
  }

  const setDoc = useCallback((next: ProtocolDocument | ((current: ProtocolDocument | null) => ProtocolDocument | null)) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    dirty.current = Boolean(value);
    setDocState(value);
  }, []);

  useEffect(() => {
    let alive = true;
    void loadDraft(id).then((loaded) => {
      if (!alive) return;
      if (!loaded) {
        setMissing(true);
        return;
      }
      dirty.current = false;
      ref.current = loaded;
      setDocState(loaded);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!doc || !dirty.current) return;
    const handle = window.setTimeout(() => {
      const current = ref.current;
      if (!current || current.meta.id !== id) return;
      dirty.current = false;
      const next = { ...current, meta: { ...current.meta, updatedAt: new Date().toISOString() } };
      ref.current = next;
      void saveDraft(next).catch((err: unknown) => {
        setCloudError(err instanceof Error ? err.message : 'Could not save to the cloud.');
      });
    }, 650);
    return () => window.clearTimeout(handle);
  }, [doc, id]);

  return { doc, setDoc, missing, cloudError };
}
