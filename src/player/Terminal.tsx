import { useEffect, useState, type ReactNode } from 'react';
import type { ChartInterval, SpotAsset, TerminalBlock, Theme } from '@/schema/protocol';
import { CHART_INTERVALS } from '@/schema/protocol';
import { priceText, useQuotes } from '@/player/markets';
import { TvChart } from '@/player/TvChart';
import { ActionButton, TextField, cardStyle, headline } from '@/player/chrome';

type DeskApi = {
  interactive: boolean;
  pending: boolean;
  address?: string;
  usdc: string;
  connect: () => void;
  openSpot: () => void;
  runSpot: (order: { asset: SpotAsset; side: 'buy' | 'sell'; amount: string }) => Promise<boolean>;
};

function move(value: number, prev: number) {
  if (!prev) return null;
  const pct = ((value - prev) / prev) * 100;
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, up: pct >= 0 };
}

export function TerminalView({ block, theme, api, titleSlot }: { block: TerminalBlock; theme: Theme; api: DeskApi; titleSlot?: ReactNode }) {
  const assets = block.assets.length ? block.assets : (['BTC'] as SpotAsset[]);
  const assetKey = assets.join(',');
  const [asset, setAsset] = useState<SpotAsset>(assets.includes(block.asset) ? block.asset : assets[0]);
  const [interval, setInterval] = useState<ChartInterval>(block.interval);
  const [side, setSide] = useState<'buy' | 'sell'>(block.sides === 'sell' ? 'sell' : 'buy');
  const [amount, setAmount] = useState(block.amount);
  const shown = assets.includes(asset) ? asset : assets[0];
  const tradable = block.sides === 'both' ? side : block.sides;
  const quotes = useQuotes(true);
  const quote = quotes[shown];
  const change = quote ? move(quote.px, quote.prev) : null;
  const live = api.interactive;
  const up = '#1f9d55';
  const down = '#d4534b';

  useEffect(() => {
    const list = assetKey ? (assetKey.split(',') as SpotAsset[]) : (['BTC'] as SpotAsset[]);
    setAsset(list.includes(block.asset) ? block.asset : list[0]);
  }, [assetKey, block.asset]);
  useEffect(() => setInterval(block.interval), [block.interval]);
  useEffect(() => setAmount(block.amount), [block.amount]);
  useEffect(() => setSide(block.sides === 'sell' ? 'sell' : 'buy'), [block.sides]);

  const trade = () => {
    if (!live) return;
    if (!api.address) {
      api.connect();
      return;
    }
    void api.runSpot({ asset: shown, side: tradable, amount });
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" style={cardStyle(theme)}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-2.5 pl-3 pr-16" style={{ borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)` }}>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            Spot
          </p>
          <h3 className={`text-xl leading-none ${headline(theme.font)}`}>{titleSlot ?? block.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Market">
          {assets.map((item) => {
            const on = item === shown;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAsset(item)}
                className="px-2.5 py-1 text-xs font-medium"
                style={{
                  borderRadius: theme.radius,
                  background: on ? theme.ink : 'transparent',
                  color: on ? theme.paper : theme.muted,
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
        <p className="ml-auto font-mono text-sm">
          <span>{quote ? priceText(quote.px) : '—'}</span>
          {change ? (
            <span className="ml-2 text-xs" style={{ color: change.up ? up : down }}>
              {change.text}
            </span>
          ) : null}
        </p>
        {block.chart ? (
          <div className="flex gap-1" role="radiogroup" aria-label="Timeframe">
            {CHART_INTERVALS.map((item) => {
              const on = item === interval;
              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setInterval(item)}
                  className="px-2 py-1 text-[11px]"
                  style={{ color: on ? theme.ink : theme.muted }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>
      <div className={`flex min-h-0 flex-1 ${block.layout === 'stack' ? 'flex-col' : 'flex-wrap'}`}>
        {block.chart ? (
          <div className="min-h-64 min-w-[16rem] flex-1">
            <TvChart coin={shown} interval={interval} theme={theme} onInterval={setInterval} />
          </div>
        ) : null}
        {block.ticket ? (
          <form
            className="grid min-w-[15rem] flex-1 content-start gap-3 p-3"
            style={{
              flex: block.layout === 'side' ? '0 0 16.5rem' : '1 1 100%',
              maxWidth: '100%',
              borderColor: `color-mix(in srgb, ${theme.ink} 12%, transparent)`,
              borderLeft: block.layout === 'side' ? `1px solid color-mix(in srgb, ${theme.ink} 12%, transparent)` : undefined,
              borderTop: block.layout === 'stack' && block.chart ? `1px solid color-mix(in srgb, ${theme.ink} 12%, transparent)` : undefined,
            }}
            onSubmit={(event) => {
              event.preventDefault();
              trade();
            }}
          >
            {block.sides === 'both' ? (
              <div className="grid grid-cols-2 gap-1">
                {(['buy', 'sell'] as const).map((item) => {
                  const on = tradable === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSide(item)}
                      className="py-2 text-xs font-medium"
                      style={{
                        borderRadius: theme.radius,
                        background: on ? (item === 'buy' ? theme.accent : theme.ink) : `color-mix(in srgb, ${theme.ink} 6%, transparent)`,
                        color: on ? (item === 'buy' ? theme.accentInk : theme.paper) : theme.muted,
                      }}
                    >
                      {item === 'buy' ? 'Buy' : 'Sell'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
                {block.sides === 'buy' ? 'Buy only' : 'Sell only'}
              </p>
            )}
            <label className="grid gap-1.5">
              <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
                {tradable === 'buy' ? 'USDC' : shown}
                {tradable === 'buy' && api.usdc ? (
                  <button type="button" className="normal-case tracking-normal" style={{ color: theme.ink }} onClick={() => setAmount(api.usdc)}>
                    Max {api.usdc}
                  </button>
                ) : null}
              </span>
              <TextField theme={theme} value={amount} readOnly={!live} placeholder="0.00" onChange={setAmount} />
            </label>
            <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>
              {tradable === 'buy' ? `Pays USDC. ${shown} stays in the Sendra account.` : `Sells ${shown} from the Sendra account for USDC.`}
            </p>
            <ActionButton theme={theme} disabled={live && api.pending} onClick={trade}>
              {!live ? (tradable === 'buy' ? `Buy ${shown}` : `Sell ${shown}`) : !api.address ? 'Connect wallet' : api.pending ? 'Signing…' : tradable === 'buy' ? `Buy ${shown}` : `Sell ${shown}`}
            </ActionButton>
            <button type="button" className="text-left text-sm underline" style={{ color: theme.muted }} onClick={() => live && api.openSpot()}>
              Open Sendra account
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
