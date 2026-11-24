import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { FeeTier, LiquidityBlock, PairId, Theme } from '@/schema/protocol';
import { FEES, PAIRS } from '@/schema/protocol';
import { cardStyle, headline } from '@/player/chrome';

const PRESETS = [
  { id: 'tight', name: 'Tight', low: 6, high: 6 },
  { id: 'balanced', name: 'Balanced', low: 12, high: 12 },
  { id: 'wide', name: 'Wide', low: 28, high: 28 },
  { id: 'above', name: 'Above', low: 2, high: 24 },
  { id: 'below', name: 'Below', low: 24, high: 2 },
] as const;

const WINDOWS = [15, 30, 60] as const;

function feeLabel(fee: FeeTier) {
  if (fee === 500) return '0.05%';
  if (fee === 3000) return '0.30%';
  return '1%';
}

function baseOf(pair: PairId) {
  return pair.split('/')[0] ?? 'ETH';
}

function money(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1000) return value.toLocaleString('en', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString('en', { maximumFractionDigits: 4 });
}

function clampPct(value: number) {
  return Math.max(1, Math.min(80, Math.round(value * 10) / 10));
}

async function loadCloses(symbol: string, days: number) {
  const fine = days <= 15;
  const res = await fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/candles?granularity=${fine ? 14400 : 86400}`);
  if (!res.ok) return [];
  const rows = (await res.json()) as number[][];
  if (!Array.isArray(rows)) return [];
  const limit = fine ? days * 6 : days;
  return rows
    .map((row) => ({ time: row[0], close: row[4] }))
    .filter((bar) => bar.close > 0)
    .sort((a, b) => a.time - b.time)
    .slice(-limit)
    .map((bar) => bar.close);
}

function frameOf(spot: number, minPrice: number, maxPrice: number) {
  if (!(spot > 0)) return { min: 0, max: 1 };
  const low = Math.min(spot * 0.68, minPrice);
  const high = Math.max(spot * 1.32, maxPrice);
  const pad = (high - low) * 0.08;
  return { min: Math.max(0, low - pad), max: high + pad };
}

export function LiquidityDesk({
  block,
  theme,
  api,
  onRange,
  titleSlot,
  buttonSlot,
  hintSlot,
}: {
  block: LiquidityBlock;
  theme: Theme;
  api: { interactive: boolean; pending: boolean; runLiquidity: (block: LiquidityBlock) => void };
  onRange?: (next: { pair: PairId; fee: FeeTier; lowPct: number; highPct: number }) => void;
  titleSlot?: ReactNode;
  buttonSlot?: ReactNode;
  hintSlot?: ReactNode;
}) {
  const [pair, setPair] = useState<PairId>(block.pair);
  const [fee, setFee] = useState<FeeTier>(block.fee);
  const [amount, setAmount] = useState(block.amount);
  const [lowPct, setLowPct] = useState(block.lowPct);
  const [highPct, setHighPct] = useState(block.highPct);
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [closes, setCloses] = useState<number[]>([]);
  const [quiet, setQuiet] = useState(false);
  const [hold, setHold] = useState<{ min: number; max: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const line = `color-mix(in srgb, ${theme.ink} 12%, transparent)`;
  const live = api.interactive;

  useEffect(() => {
    setPair(block.pair);
    setFee(block.fee);
    setAmount(block.amount);
    setLowPct(block.lowPct);
    setHighPct(block.highPct);
  }, [block.amount, block.fee, block.highPct, block.lowPct, block.pair]);

  useEffect(() => {
    let alive = true;
    setQuiet(false);
    void loadCloses(baseOf(pair), days)
      .then((bars) => {
        if (!alive) return;
        setCloses(bars);
        setQuiet(bars.length < 2);
      })
      .catch(() => {
        if (!alive) return;
        setCloses([]);
        setQuiet(true);
      });
    return () => {
      alive = false;
    };
  }, [days, pair]);

  const price = closes[closes.length - 1] ?? 0;
  const minPrice = price * (1 - lowPct / 100);
  const maxPrice = price * (1 + highPct / 100);
  const scale = useMemo(() => frameOf(price, minPrice, maxPrice), [maxPrice, minPrice, price]);
  const view = hold ?? scale;
  const width = 640;
  const height = 220;
  const yOf = (value: number) => {
    const span = view.max - view.min || 1;
    return (1 - (value - view.min) / span) * height;
  };
  const points = closes
    .map((value, index) => `${(index / Math.max(1, closes.length - 1)) * width},${yOf(value)}`)
    .join(' ');
  const area = closes.length > 1 ? `0,${height} ${points} ${width},${height}` : '';
  const bandTop = price > 0 ? (yOf(maxPrice) / height) * 100 : 0;
  const bandBottom = price > 0 ? (yOf(minPrice) / height) * 100 : 0;

  const choose = (next: Partial<{ pair: PairId; fee: FeeTier; lowPct: number; highPct: number }>) => {
    const range = {
      pair: next.pair ?? pair,
      fee: next.fee ?? fee,
      lowPct: next.lowPct ?? lowPct,
      highPct: next.highPct ?? highPct,
    };
    if (next.pair) setPair(next.pair);
    if (next.fee) setFee(next.fee);
    if (next.lowPct != null) setLowPct(next.lowPct);
    if (next.highPct != null) setHighPct(next.highPct);
    onRange?.(range);
  };

  const drag = (mode: 'min' | 'max' | 'band', event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startLow = lowPct;
    const startHigh = highPct;
    const spot = price;
    const domain = view.max - view.min;
    const rect = box.current?.getBoundingClientRect();
    if (!rect || !(spot > 0) || !(domain > 0)) return;
    const frozen = view;
    setHold(frozen);
    let latest = { lowPct: startLow, highPct: startHigh };
    const move = (next: PointerEvent) => {
      const dPrice = -((next.clientY - startY) / rect.height) * domain;
      const dPct = (dPrice / spot) * 100;
      if (mode === 'band') {
        latest = { lowPct: clampPct(startLow - dPct), highPct: clampPct(startHigh + dPct) };
      } else if (mode === 'max') {
        latest = { lowPct: startLow, highPct: clampPct(startHigh + dPct) };
      } else {
        latest = { lowPct: clampPct(startLow - dPct), highPct: startHigh };
      }
      setLowPct(latest.lowPct);
      setHighPct(latest.highPct);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setHold(null);
      onRange?.({ pair, fee, lowPct: latest.lowPct, highPct: latest.highPct });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" style={cardStyle(theme)}>
      <header className="flex items-end justify-between gap-3 border-b px-3 py-3 pr-16" style={{ borderColor: line }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            Uniswap
          </p>
          <h3 className={`mt-1 text-2xl leading-none ${headline(theme.font)}`}>{titleSlot ?? block.title}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
            {pair} · {feeLabel(fee)}
          </p>
          <p className="font-mono text-2xl leading-none">{money(price)}</p>
        </div>
      </header>
      <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" style={{ borderColor: line }}>
        {PAIRS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => choose({ pair: item })}
            className="shrink-0 rounded-full px-3 py-1 text-xs"
            style={{ background: item === pair ? theme.ink : 'transparent', color: item === pair ? theme.paper : theme.muted }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto border-b px-3 py-2" style={{ borderColor: line }}>
        <span className="mr-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
          Pool
        </span>
        {FEES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => choose({ fee: item })}
            className="shrink-0 rounded-full px-3 py-1 text-xs"
            style={{ background: item === fee ? theme.accent : 'transparent', color: item === fee ? theme.accentInk : theme.muted }}
          >
            {feeLabel(item)}
          </button>
        ))}
        <span className="ml-auto flex gap-1">
          {WINDOWS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDays(item)}
              className="rounded-full px-2 py-1 text-[11px]"
              style={{ background: item === days ? theme.ink : 'transparent', color: item === days ? theme.paper : theme.muted }}
            >
              {item}d
            </button>
          ))}
        </span>
      </div>
      <div ref={box} className="relative mx-3 mt-3 h-52 shrink-0 overflow-hidden rounded-xl" style={{ background: `color-mix(in srgb, ${theme.ink} 4%, transparent)` }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Price range">
          {area ? <polygon points={area} fill={theme.ink} opacity="0.08" /> : null}
          {points ? <polyline points={points} fill="none" stroke={theme.ink} strokeWidth="2" /> : null}
          {price > 0 ? <line x1="0" x2={width} y1={yOf(price)} y2={yOf(price)} stroke={theme.ink} strokeDasharray="4 4" strokeOpacity="0.45" /> : null}
        </svg>
        {price > 0 ? (
          <>
            <div
              role="slider"
              aria-label="Move range"
              aria-valuemin={1}
              aria-valuemax={80}
              aria-valuenow={Math.round(lowPct + highPct)}
              className="absolute inset-x-0 cursor-grab touch-none active:cursor-grabbing"
              style={{ top: `${bandTop}%`, height: `${Math.max(0, bandBottom - bandTop)}%`, background: theme.accent, opacity: 0.22 }}
              onPointerDown={(event) => drag('band', event)}
            />
            <div
              role="slider"
              aria-label="Upper price"
              aria-valuemin={1}
              aria-valuemax={80}
              aria-valuenow={Math.round(highPct)}
              className="absolute inset-x-3 h-3 -translate-y-1/2 cursor-ns-resize touch-none"
              style={{ top: `${bandTop}%` }}
              onPointerDown={(event) => drag('max', event)}
            >
              <span className="absolute inset-x-0 top-1/2 h-px" style={{ background: theme.accent }} />
              <span className="absolute right-0 top-1/2 h-2 w-8 -translate-y-1/2 rounded-full" style={{ background: theme.accent }} />
            </div>
            <div
              role="slider"
              aria-label="Lower price"
              aria-valuemin={1}
              aria-valuemax={80}
              aria-valuenow={Math.round(lowPct)}
              className="absolute inset-x-3 h-3 -translate-y-1/2 cursor-ns-resize touch-none"
              style={{ top: `${bandBottom}%` }}
              onPointerDown={(event) => drag('min', event)}
            >
              <span className="absolute inset-x-0 top-1/2 h-px" style={{ background: theme.accent }} />
              <span className="absolute right-0 top-1/2 h-2 w-8 -translate-y-1/2 rounded-full" style={{ background: theme.accent }} />
            </div>
            <p className="pointer-events-none absolute left-2 font-mono text-[10px]" style={{ top: `calc(${bandTop}% - 14px)`, color: theme.ink }}>
              {money(maxPrice)}
            </p>
            <p className="pointer-events-none absolute left-2 font-mono text-[10px]" style={{ top: `calc(${bandBottom}% + 4px)`, color: theme.ink }}>
              {money(minPrice)}
            </p>
          </>
        ) : null}
        {quiet ? (
          <p className="absolute inset-0 grid place-items-center text-sm" style={{ color: theme.muted }}>
            Price history did not answer.
          </p>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-3 border-t text-center" style={{ borderColor: line }}>
        {[
          ['Min', money(minPrice), `−${lowPct.toFixed(1)}%`],
          ['Price', money(price), `${days}d`],
          ['Max', money(maxPrice), `+${highPct.toFixed(1)}%`],
        ].map(([label, value, note]) => (
          <div key={label} className="px-2 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
              {label}
            </p>
            <p className="mt-1 font-mono text-sm">{value}</p>
            <p className="text-[10px]" style={{ color: theme.muted }}>
              {note}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t px-3 py-2" style={{ borderColor: line }}>
        {PRESETS.map((preset) => {
          const on = lowPct === preset.low && highPct === preset.high;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choose({ lowPct: preset.low, highPct: preset.high })}
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{ background: on ? theme.ink : 'transparent', color: on ? theme.paper : theme.muted }}
            >
              {preset.name}
            </button>
          );
        })}
        <span className="ml-auto text-[10px]" style={{ color: theme.muted }}>
          Drag the band. Edges set the width.
        </span>
      </div>
      <form
        className="mt-auto flex items-center gap-2 border-t px-3 py-2"
        style={{ borderColor: line }}
        onSubmit={(event) => {
          event.preventDefault();
          if (live) api.runLiquidity({ ...block, pair, fee, amount });
        }}
      >
        <input
          aria-label="USDC"
          value={live ? amount : block.amount}
          readOnly={!live}
          onChange={(event) => setAmount(event.target.value)}
          className="w-28 bg-transparent font-mono text-sm outline-none"
          style={{ color: theme.ink }}
        />
        <span className="text-xs" style={{ color: theme.muted }}>
          USDC
        </span>
        <button
          type="submit"
          disabled={live && api.pending}
          className="ml-auto rounded-full px-4 py-2 text-sm disabled:opacity-45"
          style={{ background: theme.accent, color: theme.accentInk }}
        >
          {buttonSlot ?? block.button}
        </button>
      </form>
      {hintSlot ? (
        <p className="px-3 pb-3 text-xs" style={{ color: theme.muted }}>
          {hintSlot}
        </p>
      ) : block.hint ? (
        <p className="px-3 pb-3 text-xs" style={{ color: theme.muted }}>
          {block.hint}
        </p>
      ) : null}
    </section>
  );
}
