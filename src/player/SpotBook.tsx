import { useEffect, useState, type ReactNode } from 'react';
import { shortAddr } from '@/lib/uid';
import type { SpotAsset, SpotBookBlock, Theme } from '@/schema/protocol';
import { inkFor } from '@/schema/protocol';
import { SPOT_MARKET, readSpotBook, sliceTokens, tokenText, usd, useQuotes, type SpotRow } from '@/player/markets';
import { ActionButton, cardStyle, headline } from '@/player/chrome';
import { useWallet } from '@/web3/useWallet';

type BookApi = {
  interactive: boolean;
  pending: boolean;
  connect: () => void;
  runSpot: (order: { asset: SpotAsset; side: 'buy' | 'sell'; amount: string }) => Promise<boolean>;
};

const SLICES = [
  { id: 2_500, name: '25%' },
  { id: 5_000, name: '50%' },
  { id: 10_000, name: '100%' },
] as const;

const FILTERS = [
  { id: 'active', name: 'Active' },
  { id: 'all', name: 'All' },
  { id: 'closed', name: 'Closed' },
] as const;

function sample(asset: SpotAsset, closed: boolean): SpotRow {
  const market = SPOT_MARKET[asset];
  const tokenAmount = closed ? 0n : asset === 'BTC' ? 2_500_000n : 10n ** 16n;
  return {
    id: closed ? '12' : '18',
    owner: '0x0000000000000000000000000000000000000000',
    asset,
    closed,
    tokenAmount,
    decimals: market.decimals,
    receipt: market.receipt,
    principal: closed ? 80 : 100,
    received: closed ? 92 : 0,
    amount: closed ? 0 : asset === 'BTC' ? 0.025 : 0.01,
  };
}

function tone(value: number, theme: Theme) {
  if (Math.abs(value) < 0.005) return theme.muted;
  const light = inkFor(theme.paper) === '#141414';
  if (value > 0) return light ? '#137a45' : '#3dd68c';
  return light ? '#c43434' : '#ff8d8d';
}

function tokenLabel(amount: bigint, decimals: number) {
  const negative = amount < 0n;
  const raw = tokenText(negative ? -amount : amount, decimals);
  const [whole, frac = ''] = raw.split('.');
  if (!frac) return negative && raw !== '0' ? `-${raw}` : raw;
  const lead = whole === '0' ? (frac.match(/^0*/)?.[0].length ?? 0) : 0;
  const places = Math.min(8, frac.length, whole === '0' ? lead + 4 : whole.length >= 4 ? 2 : 4);
  const head = frac.slice(0, places);
  const roundUp = (frac[places] ?? '0') >= '5';
  let nextWhole = whole;
  let nextFrac = head;
  if (roundUp) {
    const bumped = (BigInt(head || '0') + 1n).toString().padStart(places, '0');
    if (bumped.length > places) {
      nextWhole = (BigInt(whole) + 1n).toString();
      nextFrac = '';
    } else nextFrac = bumped;
  }
  nextFrac = nextFrac.replace(/0+$/, '');
  let text = nextFrac ? `${nextWhole}.${nextFrac}` : nextWhole;
  if (text === '0' && raw !== '0') {
    const value = Number(raw);
    text = Number.isFinite(value) && value > 0 ? value.toExponential(2).replace(/\.?0+e/, 'e') : raw;
  }
  return negative && text !== '0' ? `-${text}` : text;
}

export function SpotBookView({ block, theme, api, titleSlot }: { block: SpotBookBlock; theme: Theme; api: BookApi; titleSlot?: ReactNode }) {
  const wallet = useWallet();
  const quotes = useQuotes(true);
  const [rows, setRows] = useState<SpotRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState(block.status);
  const [slice, setSlice] = useState<Record<string, number>>({});
  const assets = block.assets.length ? block.assets : (['BTC'] as SpotAsset[]);
  const live = api.interactive;

  useEffect(() => setStatus(block.status), [block.status]);

  useEffect(() => {
    const address = wallet.address as `0x${string}` | undefined;
    if (!address) {
      setRows([]);
      setTruncated(false);
      setNote(live ? 'Connect a wallet to read spot positions.' : 'Visitors connect a wallet and see only their spot positions.');
      return;
    }
    let alive = true;
    setBusy(true);
    setNote('');
    void readSpotBook(address)
      .then((book) => {
        if (!alive) return;
        setRows(book.rows);
        setTruncated(book.truncated);
        setNote(book.rows.length ? '' : 'No spot positions.');
      })
      .catch((err: unknown) => {
        if (alive) setNote(err instanceof Error ? err.message : 'SendraStorage did not answer.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [live, tick, wallet.address]);

  const shown = rows.filter((row) => {
    if (row.asset && !assets.includes(row.asset)) return false;
    if (status === 'active') return !row.closed;
    if (status === 'closed') return row.closed;
    return true;
  });
  const mine = (row: SpotRow) => !!wallet.address && row.owner.toLowerCase() === wallet.address.toLowerCase();
  const preview = !live && !wallet.address;
  const second = assets.find((item) => item !== assets[0]) ?? assets[0];
  const listed = preview
    ? [
        ...(status === 'closed' ? [] : [sample(assets[0], false)]),
        ...(status === 'active' ? [] : [sample(second, true)]),
      ]
    : shown;

  const sell = async (row: SpotRow) => {
    if (!live || !row.asset || row.closed || row.tokenAmount <= 0n) return;
    const bps = slice[`${row.owner}:${row.id}`] ?? 10_000;
    const amount = sliceTokens(row.tokenAmount, bps);
    const text = tokenText(amount, row.decimals);
    if (amount <= 0n || !text || text === '0') return;
    if (!wallet.address || row.owner.toLowerCase() !== wallet.address.toLowerCase()) return;
    const ok = await api.runSpot({ asset: row.asset, side: 'sell', amount: text });
    if (ok) setTick((value) => value + 1);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" style={cardStyle(theme)}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b py-3 pl-4 pr-16" style={{ borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)` }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            Spot book
          </p>
          <h3 className={`mt-1 text-2xl leading-none ${headline(theme.font)}`}>{titleSlot ?? block.title}</h3>
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label="Positions">
          {FILTERS.map((item) => {
            const on = status === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStatus(item.id)}
                className="px-2.5 py-1 text-xs"
                style={{
                  borderRadius: 999,
                  background: on ? theme.ink : 'transparent',
                  color: on ? theme.paper : theme.muted,
                }}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {listed.length ? (
          <ul>
            {listed.map((row) => {
              const coin = row.asset ?? 'Spot';
              const liveMark = !row.closed && row.asset && quotes[row.asset] ? row.amount * quotes[row.asset]!.px : null;
              const mark = row.closed ? null : preview ? row.principal * 1.04 : liveMark;
              const pnl = row.closed ? row.received - row.principal : mark == null ? null : mark + row.received - row.principal;
              const key = `${row.owner}:${row.id}`;
              const bps = slice[key] ?? 10_000;
              const selling = sliceTokens(row.tokenAmount, bps);
              const sellingText = tokenLabel(selling, row.decimals);
              return (
                <li key={key} className="border-b px-4 py-3" style={{ borderColor: `color-mix(in srgb, ${theme.ink} 10%, transparent)` }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {coin}
                      <span className="ml-2 font-normal" style={{ color: theme.muted }}>
                        #{row.id}
                        {!preview && !mine(row) ? ` · ${shortAddr(row.owner)}` : ''}
                        {' · '}
                        {row.closed ? 'Closed' : 'Active'}
                      </span>
                    </p>
                    <p className="font-mono text-sm" style={{ color: pnl == null ? theme.muted : tone(pnl, theme) }}>
                      {pnl == null ? '—' : usd(pnl, true)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                    {row.closed ? `Sold for ${usd(row.received)}` : `${tokenLabel(row.tokenAmount, row.decimals)} ${row.receipt}`}
                    {' · '}
                    Paid {usd(row.principal)}
                    {mark != null ? ` · Mark ${usd(mark)}` : ''}
                  </p>
                  {block.sell && (preview || mine(row)) && !row.closed && row.asset && row.tokenAmount > 0n ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {SLICES.map((item) => {
                        const on = bps === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSlice((current) => ({ ...current, [key]: item.id }))}
                            className="px-2.5 py-1 text-xs"
                            style={{
                              borderRadius: 999,
                              background: on ? theme.ink : 'transparent',
                              color: on ? theme.paper : theme.muted,
                            }}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={!live || api.pending || selling <= 0n}
                        onClick={() => void sell(row)}
                        className="px-2.5 py-1 text-xs font-medium disabled:opacity-45"
                        style={{ borderRadius: 999, background: theme.accent, color: theme.accentInk }}
                      >
                        {api.pending ? 'Signing…' : `Sell ${sellingText}`}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="grid h-full min-h-24 place-items-center px-4 text-sm" style={{ color: theme.muted }}>
            {busy ? 'Reading Arbitrum…' : note || 'No spot positions.'}
          </p>
        )}
      </div>
      {preview ? (
        <p className="border-t px-4 py-2 text-xs" style={{ color: theme.muted, borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)` }}>
          Preview. A connected wallet replaces these rows.
        </p>
      ) : null}
      {truncated ? (
        <p className="border-t px-4 py-2 text-xs" style={{ color: theme.muted, borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)` }}>
          Showing the latest positions.
        </p>
      ) : null}
      {live && !wallet.address ? (
        <div className="border-t p-3" style={{ borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)` }}>
          <ActionButton theme={theme} disabled={api.pending} onClick={() => api.connect()}>
            Connect wallet
          </ActionButton>
        </div>
      ) : null}
    </section>
  );
}
