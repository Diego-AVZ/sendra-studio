import { HTML_STARTER, createBlock, landingPage, pageSlug, type PageKind, type StudioPage } from '@/schema/protocol';
import { uid } from '@/lib/uid';

export function freshPage(kind: PageKind, pages: StudioPage[]): StudioPage {
  const index = pages.length + 1;
  if (kind === 'portfolio') {
    return {
      id: uid('page'),
      name: 'Portfolio',
      path: unique('portfolio', pages),
      kind: 'canvas',
      blocks: [{ ...createBlock('portfolio'), frame: { col: 1, span: 7, row: 1, rows: 8 } }],
      html: '',
    };
  }
  if (kind === 'html') return { id: uid('page'), name: 'Custom', path: unique('custom', pages), kind, blocks: [], html: HTML_STARTER };
  return { id: uid('page'), name: `Page ${index}`, path: unique(`page-${index}`, pages), kind, blocks: [], html: '' };
}

function unique(path: string, pages: StudioPage[]) {
  const taken = new Set(pages.map((page) => page.path));
  if (!taken.has(path)) return path;
  let n = 2;
  while (taken.has(`${path}-${n}`)) n += 1;
  return `${path}-${n}`;
}

export function PageBar({
  pages,
  current,
  onPick,
  onRename,
  onAdd,
  onRemove,
}: {
  pages: StudioPage[];
  current: string;
  onPick: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (kind: PageKind) => void;
  onRemove: (id: string) => void;
}) {
  const entry = landingPage({ pages });
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 px-3 py-2">
      {pages.map((page) =>
        page.id === current ? (
          <input
            key={page.id}
            aria-label="Page name"
            value={page.name}
            onChange={(event) => onRename(page.id, event.target.value)}
            className="rounded-full bg-white px-3 py-1.5 text-sm text-[#141414] outline-none"
            style={{ width: `${Math.max(8, page.name.length + 2)}ch` }}
          />
        ) : (
          <button
            key={page.id}
            type="button"
            onClick={() => onPick(page.id)}
            className="rounded-full px-3 py-1.5 text-sm text-white/60"
          >
            {page.name || 'Page'}
            <span className="ml-2 text-[10px] uppercase tracking-[0.12em] opacity-60">
              {page.id === entry?.id ? 'Public' : page.path ? `/${page.path}` : `/${pageSlug(page.name)}`}
            </span>
          </button>
        ),
      )}
      <button type="button" className="rounded-full px-3 py-1.5 text-sm text-[#d6ff4a]" onClick={() => onAdd('canvas')}>
        + Modules
      </button>
      <button type="button" className="rounded-full px-3 py-1.5 text-sm text-[#d6ff4a]" onClick={() => onAdd('html')}>
        + HTML
      </button>
      <button type="button" className="rounded-full px-3 py-1.5 text-sm text-[#d6ff4a]" onClick={() => onAdd('portfolio')}>
        + Portfolio
      </button>
      {pages.length > 1 ? (
        <button type="button" className="ml-auto text-sm text-white/40" onClick={() => onRemove(current)}>
          Remove page
        </button>
      ) : null}
    </div>
  );
}

export function cleanPath(value: string, pages: StudioPage[], id: string) {
  const path = pageSlug(value);
  if (pages.some((page) => page.id !== id && page.path === path)) return null;
  return path;
}
