import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { protocolClash } from '@/lib/cloud';
import { purgeDraft, slugTaken, titleTaken, useDraft } from '@/lib/drafts';
import { uploadLogo } from '@/lib/logo';
import { slugFromTitle } from '@/lib/uid';
import { useTitle } from '@/lib/title';
import { ProtocolView } from '@/player/ProtocolView';
import { clampFrame, frameFor, frameOf, nextSlot } from '@/schema/layout';
import { applySurface, blockName, cloneBlock, cloneLayout, createBlock, findPage, heroTitle, layoutOf, mapBlock, presentSurface, type Block, type BlockType, type Frame, type PageKind, type ProtocolDocument, type StudioPage, type SurfaceId, type Theme } from '@/schema/protocol';
import { Canvas } from '@/studio/Canvas';
import { Inspector } from '@/studio/Inspector';
import { HtmlBrief } from '@/studio/HtmlBrief';
import { freshPage, PageBar } from '@/studio/PageBar';
import { Palette, type DragPayload } from '@/studio/Palette';
import { PhoneStage } from '@/studio/PhoneStage';
import { PublishDialog } from '@/studio/PublishDialog';

function writingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  const field = target.closest('textarea, input');
  if (field instanceof HTMLTextAreaElement) return true;
  if (!(field instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset'].includes(field.type);
}

export function Studio() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { doc, setDoc, missing, cloudError } = useDraft(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pageId, setPageId] = useState('');
  const [logoJob, setLogoJob] = useState<{ id: string; pct: number; error: string } | null>(null);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1100px)').matches);
  const [panel, setPanel] = useState<'modules' | 'html' | 'edit'>('edit');
  const [surface, setSurface] = useState<SurfaceId>('desktop');
  const drag = useRef<DragPayload | null>(null);
  const logoToken = useRef(0);
  useTitle(doc ? `${doc.meta.title} · Sendra Studio` : 'Studio · Sendra Studio');
  useEffect(() => {
    setPageId('');
    setSelected(null);
    setSurface('desktop');
  }, [id]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1100px)');
    const onChange = () => setWide(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const edit = (recipe: (current: ProtocolDocument) => ProtocolDocument) => {
    setDoc((current) => {
      if (!current) return current;
      const next = recipe(current);
      if (next.meta.titleTouched) return next;
      const title = heroTitle(next);
      if (title === next.meta.title) return next;
      return { ...next, meta: { ...next.meta, title } };
    });
  };

  const page = doc?.pages.find((item) => item.id === pageId) ?? doc?.pages[0];
  const view = page ? presentSurface(page, surface) : undefined;

  const patchPage = (recipe: (current: StudioPage) => StudioPage) => {
    if (!page) return;
    const target = surface;
    edit((current) => ({
      ...current,
      pages: current.pages.map((item) => (item.id === page.id ? applySurface(item, target, recipe) : item)),
    }));
  };

  const addBlock = (type: BlockType, at?: { col: number; row: number }, variant?: string) => {
    if (!view) return;
    const block = createBlock(type, variant);
    if (block.type === 'field') {
      const keys = new Set(view.blocks.flatMap((item) => (item.type === 'field' ? [item.key] : [])));
      if (keys.has(block.key)) block.key = `amount_${keys.size + 1}`;
    }
    const base = frameFor(type);
    if (block.type === 'wallet' && block.look !== 'card') {
      base.span = block.look === 'button' ? 3 : 4;
      base.rows = 1;
    }
    const slot = at ?? nextSlot(view.blocks, base.span, base.rows);
    block.frame = { ...base, col: Math.min(slot.col, 8 - base.span), row: slot.row };
    patchPage((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelected(block.id);
  };

  const removeBlock = (blockId: string) => {
    patchPage((current) => ({ ...current, blocks: current.blocks.filter((item) => item.id !== blockId) }));
    setSelected((current) => (current === blockId ? null : current));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' || event.repeat || event.defaultPrevented) return;
      if (!selected || preview || publishing || confirming) return;
      if (writingTarget(event.target)) return;
      event.preventDefault();
      removeBlock(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, preview, publishing, confirming, page, surface]);

  const copyFrom = (from: SurfaceId) => {
    if (!page || from === surface) return;
    const source = layoutOf(page, from);
    const dest = layoutOf(page, surface);
    const filled = dest.blocks.length > 0 || dest.html.trim().length > 0;
    if (filled && !window.confirm('Replace this layout with a copy?')) return;
    const copied = cloneLayout(source);
    patchPage((current) => ({ ...current, blocks: copied.blocks, html: copied.html }));
    setSelected(null);
  };

  const placeBlock = (blockId: string, col: number, row: number) => {
    patchPage((current) => ({
      ...current,
      blocks: current.blocks.map((item) => {
        if (item.id !== blockId) return item;
        const frame = frameOf(item);
        return { ...item, frame: clampFrame({ ...frame, col, row }) };
      }),
    }));
  };

  const sendLogo = (blockId: string, file: File) => {
    if (!page) return;
    const pageIdNow = page.id;
    const surfaceNow = surface;
    const token = logoToken.current + 1;
    logoToken.current = token;
    setSelected(blockId);
    setLogoJob({ id: blockId, pct: 1, error: '' });
    void uploadLogo(file, (pct) => {
      if (logoToken.current !== token) return;
      setLogoJob({ id: blockId, pct, error: '' });
    })
      .then((saved) => {
        if (logoToken.current !== token) return;
        edit((current) => ({
          ...current,
          pages: current.pages.map((item) => {
            if (item.id !== pageIdNow) return item;
            return applySurface(item, surfaceNow, (projected) => ({
              ...projected,
              blocks: projected.blocks.map((block) =>
                mapBlock(block, blockId, (current) => {
                  if (current.type !== 'logo') return current;
                  const keep = current.alt.trim() && current.alt.trim() !== 'Logo';
                  return { ...current, src: saved.src, alt: keep ? current.alt : saved.alt };
                }),
              ),
            }));
          }),
        }));
        setLogoJob(null);
      })
      .catch((err: unknown) => {
        if (logoToken.current !== token) return;
        setLogoJob({ id: blockId, pct: 0, error: err instanceof Error ? err.message : 'Could not upload the logo.' });
      });
  };

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-[#09090b] px-6 text-center">
        <div>
          <p className="text-3xl tracking-[-0.04em]">{missing ? 'This protocol was not found.' : 'Opening the studio…'}</p>
          {missing ? (
            <Link to="/crear" className="mt-6 inline-block text-[#d6ff4a]">
              Back to protocols
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const inspector = page && view ? (
    <Inspector
      doc={doc}
      page={view}
      selected={selected}
      onTheme={(patch: Partial<Theme>) => edit((current) => ({ ...current, theme: { ...current.theme, ...patch } }))}
      onPage={patchPage}
      onPatch={(blockId, recipe: (block: Block) => Block) =>
        patchPage((current) => ({
          ...current,
          blocks: current.blocks.map((item) => (item.id === blockId ? recipe(item) : item)),
        }))
      }
      onNudge={(blockId, dx, dy) => {
        const source = view?.blocks.find((item) => item.id === blockId);
        if (!source) return;
        const frame = frameOf(source);
        placeBlock(blockId, frame.col + dx, frame.row + dy);
      }}
      onFrame={(blockId, frame: Partial<Frame>) =>
        patchPage((current) => ({
          ...current,
          blocks: current.blocks.map((item) => (item.id === blockId ? { ...item, frame: clampFrame({ ...frameOf(item), ...frame }) } : item)),
        }))
      }
      logoJob={logoJob}
      onLogoFile={sendLogo}
      onDuplicate={(blockId) => {
        const source = view.blocks.find((item) => item.id === blockId);
        if (!source) return;
        const copy = cloneBlock(source);
        const slot = nextSlot(view.blocks, frameOf(source).span, frameOf(source).rows);
        copy.frame = { ...frameOf(source), ...slot };
        patchPage((current) => ({ ...current, blocks: [...current.blocks, copy] }));
        setSelected(copy.id);
      }}
      onRemove={removeBlock}
    />
  ) : null;

  return (
    <div className="studio flex h-dvh flex-col bg-[#0e0f12] text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <Link to="/crear" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" aria-label="Protocols">
          ←
        </Link>
        <input
          value={doc.meta.title}
          onChange={(event) =>
            setDoc((current) =>
              current ? { ...current, meta: { ...current.meta, title: event.target.value, titleTouched: true } } : current,
            )
          }
          className="min-w-0 flex-1 bg-transparent text-lg tracking-[-0.03em] outline-none"
        />
        {doc.meta.status === 'published' ? (
          <span className="hidden text-[11px] uppercase tracking-[0.16em] text-[#d6ff4a] sm:inline">Published</span>
        ) : null}
        {wide ? (
          <button type="button" className="text-sm text-white/55" onClick={() => setPreview((value) => !value)}>
            {preview ? 'Edit' : 'Preview'}
          </button>
        ) : null}
        {confirming ? (
          <button
            type="button"
            className="text-sm text-[#ff8d8d]"
            onClick={() => {
              void purgeDraft(doc.meta.id).then(() => navigate('/crear'));
            }}
          >
            Confirm
          </button>
        ) : (
          <button type="button" className="text-sm text-white/45" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        <button type="button" className="rounded-full bg-[#d6ff4a] px-4 py-2 text-sm text-[#141414]" onClick={() => setPublishing(true)}>
          Publish
        </button>
      </header>
      <NameWatch title={doc.meta.title} id={doc.meta.id} />
      {cloudError ? <p className="border-b border-white/10 px-4 py-2 text-sm text-[#ffb4b4]">{cloudError}</p> : null}
      {page ? (
        <PageBar
          pages={doc.pages}
          current={page.id}
          onPick={(next) => {
            setPageId(next);
            setSelected(null);
            setSurface('desktop');
          }}
          onRename={(target, name) => {
            edit((current) => ({
              ...current,
              pages: current.pages.map((item) => (item.id === target ? { ...item, name } : item)),
            }));
          }}
          onAdd={(kind: PageKind) => {
            const created = freshPage(kind, doc.pages);
            edit((current) => ({ ...current, pages: [...current.pages, created] }));
            setPageId(created.id);
            setSelected(null);
            setSurface('desktop');
            if (kind === 'html') setPreview(false);
          }}
          onRemove={(target) => {
            edit((current) => ({ ...current, pages: current.pages.filter((item) => item.id !== target) }));
            setPageId('');
            setSelected(null);
            setSurface('desktop');
          }}
        />
      ) : null}
      {page ? (
        <SurfaceBar
          surface={surface}
          canCopy={layoutOf(page, surface === 'desktop' ? 'mobile' : 'desktop').blocks.length > 0 || layoutOf(page, surface === 'desktop' ? 'mobile' : 'desktop').html.trim().length > 0}
          emptyMobile={surface === 'mobile' && !page.mobile}
          onChange={(next) => {
            setSurface(next);
            setSelected(null);
          }}
          onCopy={() => copyFrom(surface === 'desktop' ? 'mobile' : 'desktop')}
        />
      ) : null}
      {wide && preview && page ? (
        surface === 'mobile' ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[#09090b]">
            <PhoneStage>
              <ProtocolView
                doc={doc}
                interactive
                framed
                layout="mobile"
                inherit={false}
                pagePath={page.path}
                onPickPage={(path) => {
                  const next = findPage(doc, path);
                  if (next) setPageId(next.id);
                }}
              />
            </PhoneStage>
          </div>
        ) : (
          <div className={page.kind === 'html' ? 'flex min-h-0 flex-1 flex-col' : 'min-h-0 flex-1 overflow-auto'}>
            <ProtocolView
              doc={doc}
              interactive
              layout="desktop"
              inherit={false}
              pagePath={page.path}
              onPickPage={(path) => {
                const next = findPage(doc, path);
                if (next) setPageId(next.id);
              }}
            />
          </div>
        )
      ) : null}
      {wide && !preview && page?.kind === 'canvas' && view ? (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_minmax(0,1fr)_320px]">
          <Palette drag={drag} onAdd={(type, variant) => addBlock(type, undefined, variant)} />
          <main className="order-1 flex min-h-0 flex-col bg-[#09090b] lg:order-2">
            {surface === 'mobile' ? (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2">
                {view.blocks.map((block, index) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelected(block.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${selected === block.id ? 'bg-white text-[#141414]' : 'bg-white/10 text-white/70'}`}
                  >
                    {blockName(block.type)} {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 justify-center overflow-hidden">
              <div className={`min-h-0 w-full overflow-auto ${surface === 'mobile' ? 'max-w-[420px] border-x border-white/10' : ''}`}>
                <Canvas
                  blocks={view.blocks}
                  theme={doc.theme}
                  selected={selected}
                  drag={drag}
                  onSelect={setSelected}
                  onPlace={placeBlock}
                  onCreate={(type, col, row, variant) => addBlock(type, { col, row }, variant)}
                  onFrame={(blockId, frame) =>
                    patchPage((current) => ({
                      ...current,
                      blocks: current.blocks.map((item) => (item.id === blockId ? { ...item, frame: clampFrame({ ...frameOf(item), ...frame }) } : item)),
                    }))
                  }
                  onPatch={(blockId, recipe: (block: Block) => Block) =>
                    patchPage((current) => ({
                      ...current,
                      blocks: current.blocks.map((item) => (item.id === blockId ? recipe(item) : item)),
                    }))
                  }
                  onLogoFile={sendLogo}
                />
              </div>
            </div>
          </main>
          {inspector}
        </div>
      ) : null}
      {wide && !preview && page && view && page.kind !== 'canvas' ? (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="flex min-h-0 flex-col bg-[#09090b]">
            {surface === 'mobile' ? (
              <PhoneStage>
                <ProtocolView
                  doc={doc}
                  interactive
                  framed
                  layout="mobile"
                  inherit={false}
                  pagePath={page.path}
                  onPickPage={(path) => {
                    const next = findPage(doc, path);
                    if (next) setPageId(next.id);
                  }}
                />
              </PhoneStage>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <ProtocolView
                  doc={doc}
                  interactive
                  layout="desktop"
                  inherit={false}
                  pagePath={page.path}
                  onPickPage={(path) => {
                    const next = findPage(doc, path);
                    if (next) setPageId(next.id);
                  }}
                />
              </div>
            )}
            {page.kind === 'html' ? (
              <div className="max-h-[40%] shrink-0 overflow-auto border-t border-white/10 p-4">
                <div className="mx-auto grid max-w-3xl gap-4">
                  <HtmlBrief doc={doc} page={page} />
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">HTML from Claude</span>
                    <textarea
                      value={view.html}
                      onChange={(event) => patchPage((current) => ({ ...current, html: event.target.value }))}
                      className="mt-1.5 min-h-40 w-full rounded-2xl bg-black/40 p-4 font-mono text-sm text-white outline-none ring-1 ring-white/10"
                      spellCheck={false}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </main>
          {inspector}
        </div>
      ) : null}
      {!wide && page && view ? (
        <PhoneEditor
          doc={doc}
          page={view}
          layout={surface}
          panel={panel}
          selected={selected}
          onPanel={setPanel}
          onSelect={setSelected}
          onPickPage={(path) => {
            const next = findPage(doc, path);
            if (next) setPageId(next.id);
          }}
          onAdd={(type, variant) => addBlock(type, undefined, variant)}
          drag={drag}
          onHtml={(html) => patchPage((current) => ({ ...current, html }))}
          inspector={inspector}
        />
      ) : null}
      {publishing ? (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onSaved={(next) => {
            setDoc(() => next);
          }}
        />
      ) : null}
    </div>
  );
}

function SurfaceBar({
  surface,
  canCopy,
  emptyMobile,
  onChange,
  onCopy,
}: {
  surface: SurfaceId;
  canCopy: boolean;
  emptyMobile: boolean;
  onChange: (surface: SurfaceId) => void;
  onCopy: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-white/10 px-3 py-2">
      <div className="flex rounded-full bg-white/10 p-1 text-sm">
        <button
          type="button"
          onClick={() => onChange('desktop')}
          className={`rounded-full px-4 py-1.5 ${surface === 'desktop' ? 'bg-white text-[#141414]' : 'text-white/60'}`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => onChange('mobile')}
          className={`rounded-full px-4 py-1.5 ${surface === 'mobile' ? 'bg-white text-[#141414]' : 'text-white/60'}`}
        >
          Mobile
        </button>
      </div>
      <button type="button" className="text-sm text-white/60 disabled:text-white/25" disabled={!canCopy} onClick={onCopy}>
        {surface === 'desktop' ? 'Copy from mobile' : 'Copy from desktop'}
      </button>
      {emptyMobile ? <span className="text-sm text-white/40">Mobile is empty until you edit it or copy from desktop.</span> : null}
    </div>
  );
}

function PhoneEditor({
  doc,
  page,
  layout,
  panel,
  selected,
  onPanel,
  onSelect,
  onPickPage,
  onAdd,
  drag,
  onHtml,
  inspector,
}: {
  doc: ProtocolDocument;
  page: StudioPage;
  layout: SurfaceId;
  panel: 'modules' | 'html' | 'edit';
  selected: string | null;
  onPanel: (panel: 'modules' | 'html' | 'edit') => void;
  onSelect: (id: string | null) => void;
  onPickPage: (path: string) => void;
  onAdd: (type: BlockType, variant?: string) => void;
  drag: MutableRefObject<DragPayload | null>;
  onHtml: (html: string) => void;
  inspector: ReactNode;
}) {
  const pane = page.kind === 'canvas' ? (panel === 'html' ? 'edit' : panel) : page.kind === 'html' ? (panel === 'modules' ? 'html' : panel) : 'edit';
  const tabs = page.kind === 'canvas' ? ([['modules', 'Modules'], ['edit', 'Edit']] as const) : page.kind === 'html' ? ([['html', 'HTML'], ['edit', 'Edit']] as const) : ([['edit', 'Edit']] as const);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#09090b]">
        <PhoneStage>
          <ProtocolView doc={doc} interactive framed layout={layout} inherit={false} pagePath={page.path} onPickPage={onPickPage} />
        </PhoneStage>
        <div className="flex shrink-0 border-t border-white/10 bg-[#0e0f12] text-sm">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onPanel(value)}
              className={['flex-1 py-3', pane === value ? 'text-white' : 'text-white/40'].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </main>
      <div className="h-[46dvh] min-h-0 shrink-0 overflow-hidden border-t border-white/10">
        {pane === 'modules' ? (
          <div className="h-full min-h-0 overflow-auto">
            <Palette drag={drag} onAdd={onAdd} />
          </div>
        ) : null}
        {pane === 'html' ? (
          <div className="h-full min-h-0 overflow-auto p-4">
            <div className="grid gap-4">
              <HtmlBrief doc={doc} page={page} />
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">HTML from Claude</span>
                <textarea
                  value={page.html}
                  onChange={(event) => onHtml(event.target.value)}
                  className="mt-1.5 min-h-64 w-full rounded-2xl bg-black/40 p-4 font-mono text-sm text-white outline-none ring-1 ring-white/10"
                  spellCheck={false}
                />
              </label>
            </div>
          </div>
        ) : null}
        {pane === 'edit' ? (
          <div className="flex h-full min-h-0 flex-col">
            {page.kind === 'canvas' ? (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${selected ? 'bg-white/5 text-white/70' : 'bg-white text-[#141414]'}`}
                >
                  Page
                </button>
                {page.blocks.map((block, index) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => onSelect(block.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${selected === block.id ? 'bg-white text-[#141414]' : 'bg-white/5 text-white/70'}`}
                  >
                    {blockName(block.type)} {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-auto">{inspector}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NameWatch({ title, id }: { title: string; id: string }) {
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    const name = title.trim();
    if (!name) {
      setTaken(false);
      return;
    }
    const slug = slugFromTitle(name);
    if (titleTaken(name, id) || (slug && slugTaken(slug, id))) {
      setTaken(true);
      return;
    }
    setTaken(false);
    let live = true;
    const timer = window.setTimeout(() => {
      void protocolClash({ title: name, slug, exceptId: id }).then((hit) => {
        if (live) setTaken(hit.title || hit.slug);
      });
    }, 220);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [title, id]);

  if (!taken) return null;
  return <p className="border-b border-white/10 px-4 py-2 text-sm text-[#ffb4b4]">A protocol with this name already exists.</p>;
}
