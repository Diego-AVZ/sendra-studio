import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { explain } from '@/lib/uid';
import { findPage, landingPage, layoutOf, pageSlug, type Action, type ProtocolDocument, type StudioPage, type SurfaceId } from '@/schema/protocol';
import { fillsFrame, frameOf, gridStyle, laidOut, placeStyle } from '@/schema/layout';
import { BlockView, type PlayerApi } from '@/player/Blocks';
import { EnclaveSelectionProvider } from '@/player/enclaveSelection';
import { contentFrame, sceneProps } from '@/player/chrome';
import { HtmlFrame } from '@/player/HtmlFrame';
import { PortfolioView } from '@/player/Portfolio';
import { findAppPage, publicAppUrl } from '@/studio/htmlPrompt';
import { ensureWallet, openLendingCell, openSpotAccount, runAave, runEnclave, runLiquidity, runSpot, type Outcome } from '@/web3/run';
import { useWallet } from '@/web3/useWallet';

function amountFrom(action: Extract<Action, { amount: string; amountKey: string }>, values: Record<string, string>) {
  const keyed = action.amountKey ? values[action.amountKey] : '';
  return (keyed || action.amount).trim();
}

export function ProtocolView({
  doc,
  interactive = false,
  embed = false,
  framed = false,
  pagePath = '',
  onPickPage,
  selectedId = null,
  onSelectBlock,
  layout,
  inherit = true,
}: {
  doc: ProtocolDocument;
  interactive?: boolean;
  embed?: boolean;
  framed?: boolean;
  pagePath?: string;
  onPickPage?: (path: string) => void;
  selectedId?: string | null;
  onSelectBlock?: (id: string) => void;
  layout?: SurfaceId;
  inherit?: boolean;
}) {
  const wallet = useWallet();
  const navigate = useNavigate();
  const narrow = useNarrow();
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<Outcome | null>(null);
  const scene = sceneProps(doc.theme, embed || framed);
  const page = findPage(doc, pagePath) ?? doc.pages[0];
  const surface = layout ?? (narrow ? 'mobile' : 'desktop');
  const stored = page ? layoutOf(page, surface, layout ? inherit : true) : { blocks: [], html: '' };
  const blocks = laidOut(stored.blocks);

  async function go(work: () => Promise<Outcome>) {
    if (!interactive || pending) return false;
    setPending(true);
    setNote({ text: 'Signing on Arbitrum…' });
    try {
      setNote(await work());
      return true;
    } catch (err) {
      setNote({ text: explain(err) });
      return false;
    } finally {
      setPending(false);
    }
  }

  const api = useMemo<PlayerApi>(() => {
    return {
      interactive,
      pending,
      address: wallet.address,
      usdc: wallet.usdc,
      chainOk: wallet.chainOk,
      values,
      setValue: (key, value) => setValues((current) => ({ ...current, [key]: value })),
      connect: () => void go(async () => ({ text: `Wallet ${(await ensureWallet()).slice(0, 6)}… on Arbitrum` })),
      disconnect: () => wallet.disconnect(),
      openSpot: () => void go(() => openSpotAccount()),
      openAave: () => void go(() => openLendingCell()),
      runSpot: (order) => go(() => runSpot(order)),
      runAave: (block) => void go(() => runAave(block)),
      runLiquidity: (block) => void go(() => runLiquidity(block)),
      runEnclave: (block) => void go(() => runEnclave(block)),
      runAction: (action) => {
        if (action.kind === 'link') {
          const target = pageTarget(action.href, doc.pages);
          if (target !== null) {
            openPage(action.href, doc, navigate, onPickPage);
            return;
          }
        }
        void go(async () => {
          if (action.kind === 'none') return { text: 'This button has no action.' };
          if (action.kind === 'link') {
            if (!action.href) return { text: 'This button is missing a link.' };
            window.open(action.href, '_blank', 'noopener,noreferrer');
            return { text: 'Link opened.' };
          }
          if (action.kind === 'wallet') return { text: `Wallet ${(await ensureWallet()).slice(0, 6)}… on Arbitrum` };
          if (action.kind === 'spot') return runSpot({ asset: action.asset, side: action.side, amount: amountFrom(action, values) });
          if (action.kind === 'aave') return runAave({ asset: action.asset, amount: amountFrom(action, values) });
          if (action.kind === 'liquidity') {
            return runLiquidity({ pair: action.pair, fee: action.fee, amount: amountFrom(action, values) });
          }
          const enclave = blocks.find((block) => block.type === 'enclave');
          if (!enclave || enclave.type !== 'enclave') return { text: 'Add an enclave module to create one.' };
          return runEnclave(enclave);
        });
      },
    };
  }, [blocks, doc.meta.slug, doc.pages, interactive, navigate, onPickPage, pending, values, wallet.address, wallet.chainOk, wallet.disconnect, wallet.usdc]);

function isPublicPage(page: StudioPage, pages: StudioPage[]) {
  const named = pages.some((item) => item.name.trim().toLowerCase() === 'landing');
  if (named) return page.name.trim().toLowerCase() === 'landing';
  return page.path === '';
}

function pageTarget(href: string, pages: StudioPage[]) {
  const raw = href.trim();
  if (/^https?:/i.test(raw)) return null;
  const path = raw === '/' || raw === '' ? '' : pageSlug(raw.replace(/^\//, ''));
  return pages.some((page) => page.path === path) ? path : null;
}

function openPage(href: string, doc: ProtocolDocument, navigate: (path: string) => void, onPickPage?: (path: string) => void) {
  const target = pageTarget(href, doc.pages);
  if (target === null) return;
  if (onPickPage) onPickPage(target);
  else if (doc.meta.slug) navigate(target ? `/p/${doc.meta.slug}/${target}` : `/p/${doc.meta.slug}`);
}

function pageHref(doc: ProtocolDocument, page: StudioPage) {
  if (!doc.meta.slug) return '#';
  const entry = landingPage(doc);
  if (entry && page.id === entry.id) return `/p/${doc.meta.slug}`;
  const path = page.path || pageSlug(page.name);
  return path ? `/p/${doc.meta.slug}/${path}` : `/p/${doc.meta.slug}`;
}

  const appPages = doc.pages.filter((item) => !isPublicPage(item, doc.pages));
  const menu =
    embed || appPages.length === 0 ? null : (
      <nav aria-label="App" className="flex flex-wrap gap-2">
        {appPages.map((item) => {
          const active = item.id === page?.id;
          const className = 'rounded-full px-3 py-1.5 text-sm';
          const style = { background: active ? doc.theme.accent : 'transparent', color: active ? doc.theme.accentInk : doc.theme.muted };
          if (onPickPage) {
            return (
              <button key={item.id} type="button" className={className} style={style} onClick={() => onPickPage(item.path || pageSlug(item.name))}>
                {item.name}
              </button>
            );
          }
          return (
            <Link key={item.id} to={pageHref(doc, item)} className={className} style={style}>
              {item.name}
            </Link>
          );
        })}
      </nav>
    );

  if (page?.kind === 'html') {
    const app = findAppPage(doc, page.id);
    const appPath = app?.path ? app.path : '/';
    return (
      <div className={framed ? 'flex h-full min-h-full flex-1 flex-col overflow-hidden' : embed ? 'h-[640px] overflow-hidden' : onPickPage ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'h-dvh overflow-hidden'}>
        {menu ? (
          <div className="shrink-0 px-4 py-3" style={{ background: doc.theme.paper }}>
            {menu}
          </div>
        ) : null}
        <HtmlFrame
          html={stored.html}
          theme={doc.theme}
          fill
          appPath={appPath}
          appUrl={publicAppUrl(doc, app?.path ?? '')}
          onGo={(path) => openPage(path, doc, navigate, onPickPage)}
        />
      </div>
    );
  }

  const rows = blocks.reduce((max, block) => Math.max(max, frameOf(block).row + frameOf(block).rows - 1), 1);
  const frame = contentFrame(doc.theme.width);

  return (
    <div {...scene}>
      <div className={`${frame.className} px-4 py-10 sm:px-6`} style={frame.style}>
        {menu ? <div className="mb-8">{menu}</div> : null}
        {page?.kind === 'portfolio' ? (
          <div className="h-[70vh] min-h-80">
            <PortfolioView interactive={interactive} />
          </div>
        ) : null}
        {page?.kind === 'canvas' ? (
          <EnclaveSelectionProvider>
            <div style={gridStyle(rows)}>
              {blocks.map((block) => (
                <div
                  key={block.id}
                  style={placeStyle(frameOf(block))}
                  onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
                  className={`min-h-0 ${fillsFrame(block.type) ? 'h-full overflow-hidden' : 'overflow-auto'} ${onSelectBlock ? 'cursor-pointer' : ''} ${selectedId === block.id ? 'outline outline-2 outline-[#d6ff4a]' : ''}`}
                >
                  <BlockView block={block} theme={doc.theme} api={api} />
                </div>
              ))}
            </div>
          </EnclaveSelectionProvider>
        ) : null}
        {note ? (
          <p className="mt-6 text-sm leading-relaxed" style={{ color: doc.theme.ink }}>
            {note.text}{' '}
            {note.href ? (
              <a href={note.href} target="_blank" rel="noreferrer" style={{ color: doc.theme.accent }}>
                View on Arbiscan
              </a>
            ) : null}
          </p>
        ) : null}
        {doc.theme.credit ? (
          <Link to="/" className="mt-12 inline-block text-[11px] uppercase tracking-[0.18em]" style={{ color: doc.theme.muted }}>
            Sendra Studio
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const onChange = () => setNarrow(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
