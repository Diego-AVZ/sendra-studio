import { listDrafts, loadDraft, readLocal, type Summary } from '@/lib/drafts';
import type { Block, ProtocolDocument } from '@/schema/protocol';

export type DeskRow = {
  id: string;
  title: string;
  status: Summary['status'];
  slug: string;
  positions: number;
  fees: number;
  wallets: number;
  assets: string[];
  pages: number;
  books: number;
  feeNotes: string[];
};

export type DeskBook = {
  protocols: number;
  published: number;
  pages: number;
  positions: number;
  fees: number;
  wallets: number;
  books: number;
  calendars: number;
  pulses: number;
  assets: string[];
  feeNotes: string[];
  rows: DeskRow[];
  unread: number;
};

const POSITION = new Set(['spot', 'terminal', 'spotbook', 'pairs', 'aave', 'liquidity', 'enclave']);

function assetsOf(block: Block): string[] {
  if (block.type === 'spot') return [block.asset];
  if (block.type === 'aave') {
    if (block.strategy === 'basket') return [...block.assets];
    if (block.strategy === 'lp') return block.pair.split('/');
    if (block.strategy === 'short') return [block.asset, block.short];
    return [block.asset];
  }
  if (block.type === 'terminal') return block.assets.length ? [...block.assets] : [block.asset];
  if (block.type === 'spotbook') return [...block.assets];
  if (block.type === 'liquidity') return block.pair.split('/');
  if (block.type === 'pairs') return [block.long, block.short];
  return [];
}

function feeNote(block: Block): string | null {
  if (block.type === 'liquidity') return `${(block.fee / 10000).toFixed(2)}% pool`;
  if (block.type === 'enclave') return `${block.feePct}% enclave`;
  return null;
}

function tally(doc: ProtocolDocument) {
  const assets = new Set<string>();
  const feeNotes = new Set<string>();
  let positions = 0;
  let fees = 0;
  let wallets = 0;
  let books = 0;
  let calendars = 0;
  let pulses = 0;
  const walk = (block: Block) => {
    if (block.type === 'multi') {
      block.items.forEach(walk);
      return;
    }
    if (POSITION.has(block.type)) positions += 1;
    if (block.type === 'wallet') wallets += 1;
    if (block.type === 'portfolio' || block.type === 'enclavePortfolio' || block.type === 'dashboard') books += 1;
    if (block.type === 'calendar') calendars += 1;
    if (block.type === 'pulse') pulses += 1;
    const note = feeNote(block);
    if (note) {
      fees += 1;
      feeNotes.add(note);
    }
    for (const asset of assetsOf(block)) assets.add(asset);
  };
  for (const page of doc.pages) page.blocks.forEach(walk);
  return { positions, fees, wallets, books, calendars, pulses, assets, feeNotes, pages: doc.pages.length };
}

export function measureBook(rows: Summary[], docs: Map<string, ProtocolDocument>): DeskBook {
  const assets = new Set<string>();
  const feeNotes = new Set<string>();
  const out: DeskRow[] = [];
  const book: DeskBook = {
    protocols: rows.length,
    published: rows.filter((row) => row.status === 'published').length,
    pages: 0,
    positions: 0,
    fees: 0,
    wallets: 0,
    books: 0,
    calendars: 0,
    pulses: 0,
    assets: [],
    feeNotes: [],
    rows: out,
    unread: 0,
  };

  for (const row of rows) {
    const doc = docs.get(row.id);
    if (!doc) {
      book.unread += 1;
      out.push({
        id: row.id,
        title: row.title || 'Untitled protocol',
        status: row.status,
        slug: row.slug,
        positions: 0,
        fees: 0,
        wallets: 0,
        assets: [],
        pages: 0,
        books: 0,
        feeNotes: [],
      });
      continue;
    }
    const hit = tally(doc);
    book.pages += hit.pages;
    book.positions += hit.positions;
    book.fees += hit.fees;
    book.wallets += hit.wallets;
    book.books += hit.books;
    book.calendars += hit.calendars;
    book.pulses += hit.pulses;
    hit.assets.forEach((asset) => assets.add(asset));
    hit.feeNotes.forEach((note) => feeNotes.add(note));
    out.push({
      id: row.id,
      title: doc.meta.title || row.title || 'Untitled protocol',
      status: doc.meta.status,
      slug: doc.meta.slug || row.slug,
      positions: hit.positions,
      fees: hit.fees,
      wallets: hit.wallets,
      assets: [...hit.assets],
      pages: hit.pages,
      books: hit.books,
      feeNotes: [...hit.feeNotes],
    });
  }

  book.assets = [...assets];
  book.feeNotes = [...feeNotes];
  return book;
}

let cache: { at: number; book: DeskBook } | null = null;

export async function collectBook(): Promise<DeskBook> {
  if (cache && Date.now() - cache.at < 4000) return cache.book;
  const rows = await listDrafts();
  const docs = new Map<string, ProtocolDocument>();
  await Promise.all(
    rows.map(async (row) => {
      const doc = readLocal(row.id) ?? (await loadDraft(row.id));
      if (doc) docs.set(row.id, doc);
    }),
  );
  const book = measureBook(rows, docs);
  cache = { at: Date.now(), book };
  return book;
}
