import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ChartInterval, PairsBlock, Theme } from '@/schema/protocol';
import { CHART_INTERVALS, PAIR_COINS } from '@/schema/protocol';
import { ratioDigits, signed, entryVerdict, type PairBar } from '@/player/pairMath';
import { usePairIdeas, usePairModel, usePairStudy, type PairIdea } from '@/player/pairsApi';

const D = {
  canvas: '#131313',
  surface: '#1b1b1b',
  muted: '#242424',
  line: '#2a2a2a',
  lineStrong: '#404040',
  fg: '#f2f2f2',
  fgMuted: '#a8a8a8',
  subtle: '#808080',
  inverse: '#f2f2f2',
  onInverse: '#131313',
  up: '#2EBD85',
  down: '#F6465D',
  warn: '#fbbf24',
};

const SECONDS: Record<ChartInterval, number> = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
const RISK_COLOR = { LOW: D.up, MEDIUM: D.warn, HIGH: D.down } as const;

function tone(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return D.fg;
  return value > 0 ? D.up : D.down;
}

function num(value: number, digits: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function priceDigits(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 2;
  if (value >= 1000) return 2;
  if (value >= 1) return 2;
  if (value >= 0.01) return 4;
  return 6;
}

function duration(bars: number, interval: ChartInterval) {
  const hours = (bars * SECONDS[interval]) / 3600;
  if (hours < 1) return `${Math.round((bars * SECONDS[interval]) / 60)} min`;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
  const days = hours / 24;
  if (days < 21) return `${days < 10 ? days.toFixed(1) : Math.round(days)} d`;
  return `${(days / 7).toFixed(days / 7 < 10 ? 1 : 0)} w`;
}

function spanLabel(count: number, interval: ChartInterval) {
  return duration(count, interval);
}

function corrWord(rho: number | null) {
  if (rho == null) return '—';
  const a = Math.abs(rho);
  if (a >= 0.8) return 'Strong';
  if (a >= 0.5) return 'Moderate';
  return 'Weak';
}

function zNote(z: number | null, window: number) {
  if (z == null) return 'Needs more history';
  const a = Math.abs(z);
  const side = z > 0 ? 'above' : 'below';
  if (a < 1) return `Within 1σ of its ${window}-bar mean`;
  if (a >= 2) return `${a.toFixed(1)}σ ${side} its mean · reversion zone`;
  return `${a.toFixed(1)}σ ${side} its ${window}-bar mean`;
}

function Coin({ symbol, px, ring = false }: { symbol: string; px: number; ring?: boolean }) {
  const [bad, setBad] = useState(false);
  if (bad) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
        style={{ width: px, height: px, background: D.muted, color: D.fgMuted, fontSize: 9, boxShadow: ring ? `0 0 0 2px ${D.canvas}` : undefined }}
      >
        {symbol.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`}
      alt=""
      width={px}
      height={px}
      className="shrink-0 rounded-full object-contain"
      style={{ width: px, height: px, boxShadow: ring ? `0 0 0 2px ${D.canvas}` : undefined }}
      onError={() => setBad(true)}
    />
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden style={{ color: D.subtle }}>
      <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path d="M2.5 5.5h9M9 3l2.5 2.5L9 8M13.5 10.5h-9M7 8 4.5 10.5 7 13" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RailIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <rect x="2" y="2.5" width="12" height="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d={open ? 'M6 2.5v11M9.2 6.2 7.4 8l1.8 1.8' : 'M6 2.5v11M7.2 6.2 9 8 7.2 9.8'} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="inline-block h-4 w-14" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${((index / (values.length - 1)) * 64).toFixed(1)},${(22 - ((value - min) / span) * 20).toFixed(1)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 64 24" className="h-4 w-14 shrink-0" aria-hidden>
      <polyline points={points} fill="none" stroke={up ? D.up : D.down} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function ZGauge({ z }: { z: number | null }) {
  const clamped = z == null ? 0 : Math.max(-3, Math.min(3, z));
  const left = ((clamped + 3) / 6) * 100;
  return (
    <div className="relative h-4 w-full" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 flex h-1 -translate-y-1/2 gap-px">
        <span className="flex-1" style={{ background: 'rgba(246,70,93,0.6)' }} />
        <span className="flex-1" style={{ background: 'rgba(246,70,93,0.25)' }} />
        <span className="flex-[2]" style={{ background: D.lineStrong }} />
        <span className="flex-1" style={{ background: 'rgba(46,189,133,0.25)' }} />
        <span className="flex-1" style={{ background: 'rgba(46,189,133,0.6)' }} />
      </div>
      <span className="absolute left-1/2 top-0 h-4 w-px" style={{ background: D.subtle }} />
      {z != null ? (
        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ left: `${left}%`, background: D.fg, borderColor: D.canvas }} />
      ) : null}
    </div>
  );
}

function Meter({ value, color = D.fg }: { value: number | null; color?: string }) {
  const filled = value == null ? 0 : Math.round(Math.min(1, Math.abs(value)) * 10);
  return (
    <div className="flex h-1.5 w-full gap-px" aria-hidden>
      {Array.from({ length: 10 }, (_, index) => (
        <span key={index} className="flex-1" style={{ background: index < filled ? color : D.lineStrong }} />
      ))}
    </div>
  );
}

function LegPicker({
  side,
  value,
  options,
  onChange,
}: {
  side: 'long' | 'short';
  value: string;
  options: string[];
  onChange: (coin: string) => void;
}) {
  return (
    <label className="relative inline-flex h-9 items-center gap-2 border pl-2.5 pr-2" style={{ borderColor: D.line, background: D.surface }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: side === 'long' ? D.up : D.down }} />
      <span className="text-[11px] font-medium" style={{ color: D.subtle }}>
        {side === 'long' ? 'Long' : 'Short'}
      </span>
      <Coin symbol={value} px={20} />
      <span className="text-sm font-semibold">{value}</span>
      <Chevron />
      <select
        value={value}
        aria-label={side === 'long' ? 'Long leg' : 'Short leg'}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((coin) => (
          <option key={coin} value={coin}>
            {coin}
          </option>
        ))}
      </select>
    </label>
  );
}

function yOf(value: number, min: number, max: number, height: number) {
  const span = max - min || 1;
  return ((max - value) / span) * (height - 4) + 2;
}

function Candles({ bars }: { bars: PairBar[] }) {
  const view = bars.slice(-96);
  if (view.length < 2) return null;
  const min = Math.min(...view.map((bar) => bar.low));
  const max = Math.max(...view.map((bar) => bar.high));
  const width = 1000;
  const height = 100;
  const slot = width / view.length;
  const body = Math.max(1.4, slot * 0.62);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
      {view.map((bar, index) => {
        const color = bar.close >= bar.open ? D.up : D.down;
        const x = index * slot + slot / 2;
        const top = yOf(Math.max(bar.open, bar.close), min, max, height);
        const bottom = yOf(Math.min(bar.open, bar.close), min, max, height);
        return (
          <g key={bar.time}>
            <line x1={x} x2={x} y1={yOf(bar.high, min, max, height)} y2={yOf(bar.low, min, max, height)} stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <rect x={x - body / 2} y={top} width={body} height={Math.max(1.2, bottom - top)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

function RatioPane({ ratio, mean, z }: { ratio: number[]; mean: (number | null)[]; z: (number | null)[] }) {
  const view = ratio.slice(-96);
  const meanView = mean.slice(-96);
  const zView = z.slice(-96);
  if (view.length < 2) return null;
  const min = Math.min(...view, ...meanView.filter((value): value is number => value != null));
  const max = Math.max(...view, ...meanView.filter((value): value is number => value != null));
  const width = 1000;
  const priceH = 72;
  const step = width / Math.max(1, view.length - 1);
  const line = view.map((value, index) => `${index * step},${yOf(value, min, max, priceH)}`).join(' ');
  const meanLine = meanView
    .map((value, index) => (value == null ? null : `${index * step},${yOf(value, min, max, priceH)}`))
    .filter((point): point is string => point != null)
    .join(' ');
  const zAbs = Math.max(2.5, ...zView.map((value) => (value == null ? 0 : Math.abs(value))));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <svg viewBox={`0 0 ${width} ${priceH}`} preserveAspectRatio="none" className="min-h-0 w-full flex-[2.4]">
        <polyline points={meanLine} fill="none" stroke={D.subtle} strokeWidth="1.2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        <polyline points={line} fill="none" stroke={D.fg} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox={`0 0 ${width} 28`} preserveAspectRatio="none" className="w-full flex-1 border-t" style={{ borderColor: D.line }}>
        {zView.map((value, index) => {
          if (value == null) return null;
          const slot = width / zView.length;
          const mid = 14;
          const h = (Math.abs(value) / zAbs) * 12;
          return <rect key={index} x={index * slot + 0.4} y={value >= 0 ? mid - h : mid} width={Math.max(1, slot - 0.8)} height={h} fill={value >= 0 ? D.up : D.down} opacity="0.85" />;
        })}
      </svg>
    </div>
  );
}

function Performance({ long, short }: { long: number[]; short: number[] }) {
  const a = long.slice(-96);
  const b = short.slice(-96);
  const flat = [...a, ...b];
  if (flat.length < 2) return null;
  const min = Math.min(...flat, 0);
  const max = Math.max(...flat, 0);
  const width = 1000;
  const height = 100;
  const step = width / Math.max(1, a.length - 1);
  const path = (row: number[]) => row.map((value, index) => `${index * step},${yOf(value, min, max, height)}`).join(' ');
  const zero = yOf(0, min, max, height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
      <line x1="0" x2={width} y1={zero} y2={zero} stroke={D.lineStrong} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <polyline points={path(a)} fill="none" stroke={D.up} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <polyline points={path(b)} fill="none" stroke={D.down} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Ohlc({ bar, digits }: { bar: PairBar; digits: number }) {
  const color = bar.close >= bar.open ? D.up : D.down;
  const items: [string, number][] = [
    ['O', bar.open],
    ['H', bar.high],
    ['L', bar.low],
    ['C', bar.close],
  ];
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[11px] whitespace-nowrap" style={{ color: D.subtle }}>
      {items.map(([key, value]) => (
        <span key={key}>
          {key} <span style={{ color }}>{num(value, digits)}</span>
        </span>
      ))}
    </span>
  );
}

function Stat({ label, value, color, footer, extra }: { label: string; value: string; color?: string; footer?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3" style={{ background: D.canvas }}>
      <span className="truncate text-[11px] font-medium" style={{ color: D.subtle }}>
        {label}
      </span>
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums" style={{ color: color ?? D.fg }}>
          {value}
        </span>
        {extra}
      </div>
      {footer ? <div className="min-w-0 truncate text-[11px]" style={{ color: D.subtle }}>{footer}</div> : null}
    </div>
  );
}

export function PairsDesk({ block, titleSlot }: { block: PairsBlock; theme: Theme; titleSlot?: ReactNode }) {
  const { ideas, quiet: engineQuiet, loading } = usePairIdeas(block.risk);
  const [pair, setPair] = useState<{ long: string; short: string }>({ long: block.long, short: block.short });
  const [interval, setInterval] = useState<ChartInterval>(block.interval);
  const [touched, setTouched] = useState(false);
  const [sort, setSort] = useState<'apr' | 'win'>(block.sort);
  const [railOpen, setRailOpen] = useState(true);
  const ranked = useMemo(() => {
    const copy = [...ideas];
    copy.sort((a, b) => (sort === 'win' ? b.win100 - a.win100 : b.apr - a.apr));
    const take = Math.min(48, block.limit <= 8 ? 36 : block.limit);
    return copy.slice(0, take);
  }, [block.limit, ideas, sort]);
  const showRail = block.panels.includes('strategies');
  const showStats = block.panels.includes('stats') && block.stats.length > 0;
  const showCharts = block.panels.includes('charts') && block.views.length > 0;
  const showStudy = block.panels.includes('backtest');
  const { model, quiet: priceQuiet } = usePairModel(pair.long, pair.short, interval, showStats || showCharts);
  const { study, quiet: studyQuiet, loading: studyLoading } = usePairStudy(pair.long, pair.short, showStudy);
  const coins = useMemo(() => {
    const extra = [pair.long, pair.short].filter((coin) => !(PAIR_COINS as readonly string[]).includes(coin));
    return [...extra, ...PAIR_COINS];
  }, [pair.long, pair.short]);

  useEffect(() => {
    setTouched(false);
    setPair({ long: block.long, short: block.short });
  }, [block.long, block.openOn, block.short]);
  useEffect(() => setInterval(block.interval), [block.interval]);
  useEffect(() => setSort(block.sort), [block.sort]);
  useEffect(() => {
    if (block.openOn !== 'best' || touched || !ranked.length) return;
    setPair({ long: ranked[0].long, short: ranked[0].short });
  }, [block.openOn, ranked, touched]);

  const pick = (long: string, short: string) => {
    if (!long || !short || long === short) return;
    setTouched(true);
    setPair({ long, short });
  };

  const stats = model?.stats;
  const last = model ? model.long.length - 1 : -1;
  const longBar = last >= 0 && model ? model.long[last] : null;
  const shortBar = last >= 0 && model ? model.short[last] : null;
  const listed = ranked.find((idea) => idea.long === pair.long && idea.short === pair.short) ?? null;
  const entry = study ? entryVerdict(study.score, stats?.z ?? null) : null;
  const carrySource = study ?? listed;
  const carry = carrySource?.fundingLong != null && carrySource.fundingShort != null ? carrySource.fundingShort - carrySource.fundingLong : null;
  const avgDaily = study?.avgDaily ?? listed?.avgDaily ?? null;
  const apr = listed?.apr ?? (study ? study.avgDaily * 365 : null);
  const rDigits = ratioDigits(stats?.ratio ?? 1);
  const windowBars = model?.window ?? 0;
  const loaded = model ? spanLabel(model.long.length, interval) : '';
  const showLegs = showCharts && block.views.includes('legs');
  const showRatio = showCharts && block.views.includes('ratio');
  const showPerf = showCharts && block.views.includes('performance');
  const chartCols = showLegs && showRatio ? '1fr 1.3fr 1fr' : `repeat(${(showLegs ? 2 : 0) + (showRatio ? 1 : 0) || 1}, minmax(0,1fr))`;
  const ratioBars = model
    ? model.long.map((bar, index) => {
        const other = model.short[index];
        const open = bar.open / other.open;
        const close = bar.close / other.close;
        const high = Math.max(bar.high / other.low, open, close);
        const low = Math.min(bar.low / other.high, open, close);
        return { time: bar.time, open, high, low, close };
      })
    : [];
  const ratioBar = ratioBars.at(-1) ?? null;

  const statCells = block.stats.flatMap((id) => {
    if (id === 'ratio') {
      return [
        <Stat
          key="ratio"
          label={`${pair.long} / ${pair.short} ratio`}
          value={stats ? num(stats.ratio, rDigits) : '—'}
          footer={
            stats ? (
              <span>
                <span className="font-mono" style={{ color: tone(stats.ratioChangePct) }}>
                  {signed(stats.ratioChangePct, 2, '%')}
                </span>
                {loaded ? ` · ${loaded}` : ''}
              </span>
            ) : (
              'Reading both legs…'
            )
          }
        />,
      ];
    }
    if (id === 'z') {
      return [
        <Stat
          key="z"
          label="Z-score"
          value={stats?.z == null ? '—' : `${signed(stats.z)}σ`}
          color={stats?.z != null && Math.abs(stats.z) >= 2 ? tone(stats.z) : D.fg}
          extra={
            <div className="min-w-[4rem] flex-1 self-center">
              <ZGauge z={stats?.z ?? null} />
            </div>
          }
          footer={zNote(stats?.z ?? null, windowBars)}
        />,
      ];
    }
    if (id === 'correlation') {
      return [
        <Stat
          key="correlation"
          label="Correlation"
          value={stats?.correlation == null ? '—' : num(stats.correlation, 2)}
          extra={<span className="text-xs" style={{ color: D.fgMuted }}>{corrWord(stats?.correlation ?? null)}</span>}
          footer={
            <span className="flex items-center gap-2">
              <span className="flex-1">
                <Meter value={stats?.correlation ?? null} />
              </span>
              <span className="font-mono">
                Last {windowBars} <span style={{ color: D.fg }}>{stats?.rollingCorrelation == null ? '—' : num(stats.rollingCorrelation, 2)}</span>
              </span>
            </span>
          }
        />,
      ];
    }
    if (id === 'beta') {
      return [
        <Stat
          key="beta"
          label="Hedge ratio β"
          value={stats?.beta == null ? '—' : num(stats.beta, 2)}
          footer={stats?.beta == null ? undefined : `${pair.long} moves ${num(stats.beta, 2)}× ${pair.short}`}
        />,
      ];
    }
    if (id === 'halfLife') {
      return [
        <Stat
          key="halfLife"
          label="Half-life"
          value={stats?.halfLifeBars == null ? '—' : duration(stats.halfLifeBars, interval)}
          footer={stats?.halfLifeBars == null ? 'Not mean-reverting on this window' : `${Math.round(stats.halfLifeBars)} bars to halve a deviation`}
        />,
      ];
    }
    return [
      <Stat
        key="spread"
        label={loaded ? `Spread · ${loaded}` : 'Spread'}
        value={stats ? signed(stats.spreadPct, 2) : '—'}
        color={stats ? tone(stats.spreadPct) : D.fg}
        extra={<span className="text-xs" style={{ color: D.fgMuted }}>pts</span>}
        footer={
          stats ? (
            <span className="font-mono">
              {pair.long} <span style={{ color: tone(stats.longChangePct) }}>{signed(stats.longChangePct, 2, '%')}</span>
              {' · '}
              {pair.short} <span style={{ color: tone(stats.shortChangePct) }}>{signed(stats.shortChangePct, 2, '%')}</span>
            </span>
          ) : undefined
        }
      />,
    ];
  });

  const verdict = entry?.verdict === 'good' ? 'Good entry' : entry?.verdict === 'wait' ? 'Wait' : entry ? 'Neutral' : '—';
  const verdictColor = entry?.verdict === 'good' ? D.up : entry?.verdict === 'wait' ? D.warn : D.fg;

  return (
    <section className="grid h-full min-h-0 overflow-hidden text-[13px]" style={{ background: D.canvas, color: D.fg, gridTemplateColumns: showRail && railOpen && block.layout !== 'stack' ? '16rem minmax(0,1fr)' : 'minmax(0,1fr)' }}>
      {showRail && railOpen ? (
        <aside className="flex min-h-0 flex-col overflow-hidden" style={{ background: D.canvas, borderBottom: block.layout === 'stack' ? `1px solid ${D.line}` : undefined, maxHeight: block.layout === 'stack' ? '42%' : undefined }}>
          <div className="border-b px-3 py-3" style={{ borderColor: D.line }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Strategies</span>
              <div className="flex gap-px border" style={{ borderColor: D.line, background: D.line }}>
                {(['apr', 'win'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSort(key)}
                    className="px-2 py-1 text-[11px] font-medium"
                    style={{ background: sort === key ? D.inverse : D.canvas, color: sort === key ? D.onInverse : D.subtle }}
                  >
                    {key === 'apr' ? 'APR' : 'Win rate'}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: D.subtle }}>
              Ranked by the Sendra analyzer · last 100 days
            </p>
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto">
            {loading && !ranked.length
              ? Array.from({ length: 8 }, (_, index) => (
                  <li key={index} className="h-[62px] border-b px-3 py-2.5" style={{ borderColor: D.line }}>
                    <div className="h-3 w-24" style={{ background: D.muted }} />
                    <div className="mt-2 h-2.5 w-32" style={{ background: D.muted }} />
                  </li>
                ))
              : null}
            {!loading && engineQuiet ? <li className="px-3 py-6 text-xs" style={{ color: D.subtle }}>The market neutral engine did not answer.</li> : null}
            {!loading && !engineQuiet && !ranked.length ? <li className="px-3 py-6 text-xs" style={{ color: D.subtle }}>No strategies right now</li> : null}
            {ranked.map((idea) => (
              <StrategyRow key={`${idea.long}/${idea.short}`} idea={idea} active={idea.long === pair.long && idea.short === pair.short} onPick={() => pick(idea.long, idea.short)} />
            ))}
          </ol>
        </aside>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-col" style={{ borderLeft: showRail && railOpen && block.layout === 'side' ? `1px solid ${D.line}` : undefined }}>
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: D.line }}>
          {showRail ? (
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center border"
              style={{ borderColor: D.line, color: D.subtle }}
              aria-label={railOpen ? 'Hide strategies' : 'Show strategies'}
            >
              <RailIcon open={railOpen} />
            </button>
          ) : null}
          <h3 className="text-sm font-semibold">{titleSlot ?? block.title}</h3>
          <LegPicker side="long" value={pair.long} options={coins} onChange={(coin) => pick(coin, pair.short)} />
          <button
            type="button"
            onClick={() => pick(pair.short, pair.long)}
            className="inline-flex h-9 w-9 items-center justify-center border"
            style={{ borderColor: D.line, color: D.subtle }}
            aria-label="Swap legs"
          >
            <SwapIcon />
          </button>
          <LegPicker side="short" value={pair.short} options={coins} onChange={(coin) => pick(pair.long, coin)} />
          {showCharts || showStats ? (
            <div className="ml-auto flex items-center gap-px border" style={{ borderColor: D.line, background: D.line }} role="radiogroup" aria-label="Timeframe">
              {CHART_INTERVALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={item === interval}
                  onClick={() => setInterval(item)}
                  className="h-7 min-w-10 px-2 text-xs font-medium"
                  style={{ background: item === interval ? D.inverse : D.canvas, color: item === interval ? D.onInverse : D.subtle }}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {showStats ? (
          <div className="grid gap-px border-b" style={{ background: D.line, borderColor: D.line, gridTemplateColumns: `repeat(${Math.max(1, statCells.length)}, minmax(0,1fr))` }}>
            {priceQuiet && !stats ? <p className="px-4 py-3 text-xs" style={{ background: D.canvas, color: D.subtle }}>This pair has no shared price history.</p> : statCells}
          </div>
        ) : null}

        {showStudy ? (
          <div className="grid grid-cols-2 gap-px border-b lg:grid-cols-6" style={{ background: D.line, borderColor: D.line }}>
            {studyLoading && !study && !listed ? <p className="col-span-full px-4 py-3 text-xs" style={{ background: D.canvas, color: D.subtle }}>Loading backtest…</p> : null}
            {studyQuiet && !study && !listed ? <p className="col-span-full px-4 py-3 text-xs" style={{ background: D.canvas, color: D.subtle }}>No backtest for this pair</p> : null}
            {study || listed ? (
              <>
                <Stat label={listed ? 'Analyzer strategy' : 'Custom pair'} value={apr == null ? '—' : `${apr.toFixed(1)}%`} color={apr == null ? D.fg : tone(apr)} extra={<span className="text-xs font-medium" style={{ color: D.fgMuted }}>APR</span>} footer={listed ? (listed.risk === 'LOW' ? 'Low risk' : listed.risk === 'HIGH' ? 'High risk' : 'Medium risk') : 'Not ranked by the analyzer'} />
                <Stat label="Win rate · 100 d" value={`${(listed?.win100 ?? study?.winRate ?? 0).toFixed(1)}%`} footer={listed?.win30 != null && listed.win60 != null ? `30 d ${listed.win30.toFixed(1)}% · 60 d ${listed.win60.toFixed(1)}%` : 'Share of winning days'} />
                <Stat label="Average day" value={avgDaily == null ? '—' : signed(avgDaily, 2, '%')} color={avgDaily == null ? D.fg : tone(avgDaily)} footer={study ? `Best ${signed(study.best, 1, '%')} · worst ${signed(study.worst, 1, '%')}` : ''} />
                <Stat label="Max drawdown" value={study ? `${study.drawdown.toFixed(2)}%` : '—'} color={study && study.drawdown > 0.005 ? D.down : D.fg} footer={study ? `Daily volatility ${study.volatility.toFixed(2)}%` : ''} />
                <Stat label="Funding carry" value={carry == null ? '—' : signed(carry, 4, '%')} color={carry == null ? D.fg : tone(carry)} footer={carrySource?.fundingLong != null && carrySource.fundingShort != null ? `Long pays ${signed(carrySource.fundingLong, 4, '%')} · short ${signed(carrySource.fundingShort, 4, '%')}` : ''} />
                <Stat
                  label="Entry check"
                  value={verdict}
                  color={verdictColor}
                  extra={
                    entry ? (
                      <div className="min-w-[3rem] flex-1 self-center">
                        <Meter value={entry.score / 10} color={entry.verdict === 'good' ? D.up : D.fg} />
                      </div>
                    ) : null
                  }
                  footer={study ? `RSI ${Math.round(study.rsi)} · ratio ${stats?.z == null ? '—' : `${signed(stats.z)}σ`}` : ''}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {showLegs || showRatio ? (
          <div className="grid min-h-[220px] flex-1 gap-px border-b" style={{ background: D.line, borderColor: D.line, gridTemplateColumns: chartCols }}>
            {showLegs ? (
              <Pane
                title="Long"
                symbol={pair.long}
                price={longBar ? `$${num(longBar.close, priceDigits(longBar.close))}` : '—'}
                change={stats ? signed(stats.longChangePct, 2, '%') : ''}
                changeColor={tone(stats?.longChangePct ?? 0)}
                dot={D.up}
                meta={longBar ? <Ohlc bar={longBar} digits={priceDigits(longBar.close)} /> : <span />}
                chart={model ? <Candles bars={model.long} /> : <Quiet text={priceQuiet ? 'No shared price history' : 'Loading market data'} />}
              />
            ) : null}
            {showRatio ? (
              <Pane
                title="Pair"
                symbol={`${pair.long} / ${pair.short}`}
                coin={false}
                price={stats ? num(stats.ratio, rDigits) : '—'}
                change=""
                changeColor={D.fg}
                meta={ratioBar ? <Ohlc bar={ratioBar} digits={rDigits} /> : <span />}
                chart={model ? <RatioPane ratio={model.ratio} mean={model.mean} z={model.zSeries} /> : <Quiet text={priceQuiet ? 'No shared price history' : 'Loading market data'} />}
              />
            ) : null}
            {showLegs ? (
              <Pane
                title="Short"
                symbol={pair.short}
                price={shortBar ? `$${num(shortBar.close, priceDigits(shortBar.close))}` : '—'}
                change={stats ? signed(stats.shortChangePct, 2, '%') : ''}
                changeColor={tone(stats?.shortChangePct ?? 0)}
                dot={D.down}
                meta={shortBar ? <Ohlc bar={shortBar} digits={priceDigits(shortBar.close)} /> : <span />}
                chart={model ? <Candles bars={model.short} /> : <Quiet text={priceQuiet ? 'No shared price history' : 'Loading market data'} />}
              />
            ) : null}
          </div>
        ) : null}

        {showPerf ? (
          <section className="flex h-[clamp(140px,28%,220px)] shrink-0 flex-col" style={{ background: D.canvas }}>
            <div className="flex items-center gap-4 px-4 pb-1 pt-2.5">
              <span className="text-xs font-medium" style={{ color: D.fgMuted }}>
                Relative performance
              </span>
              <span className="ml-auto flex items-center gap-4 font-mono text-[11px]" style={{ color: D.subtle }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3" style={{ background: D.up }} />
                  {pair.long} <span style={{ color: tone(stats?.longChangePct ?? 0) }}>{stats ? signed(stats.longChangePct, 2, '%') : '—'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3" style={{ background: D.down }} />
                  {pair.short} <span style={{ color: tone(stats?.shortChangePct ?? 0) }}>{stats ? signed(stats.shortChangePct, 2, '%') : '—'}</span>
                </span>
                <span>
                  Spread <span style={{ color: tone(stats?.spreadPct ?? 0) }}>{stats ? `${signed(stats.spreadPct)} pts` : '—'}</span>
                </span>
              </span>
            </div>
            <div className="min-h-0 flex-1">
              {model ? <Performance long={model.perfLong} short={model.perfShort} /> : <Quiet text={priceQuiet ? 'No shared price history' : 'Loading market data'} />}
            </div>
          </section>
        ) : null}

        {!showRail && !showStats && !showCharts && !showStudy ? (
          <p className="grid flex-1 place-items-center px-4 text-sm" style={{ color: D.subtle }}>
            Turn on a piece of the terminal.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Quiet({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-xs" style={{ color: D.subtle }}>
      {text}
    </div>
  );
}

function Pane({
  title,
  symbol,
  price,
  change,
  changeColor,
  dot,
  coin = true,
  meta,
  chart,
}: {
  title: string;
  symbol: string;
  price: string;
  change: string;
  changeColor: string;
  dot?: string;
  coin?: boolean;
  meta: ReactNode;
  chart: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col" style={{ background: D.canvas }}>
      <div className="flex flex-col gap-1 border-b px-3 pb-2 pt-2.5" style={{ borderColor: D.line, background: D.canvas }}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {dot ? <span className="h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
            <span className="text-xs font-medium" style={{ color: D.fgMuted }}>
              {title}
            </span>
            {coin ? <Coin symbol={symbol} px={16} /> : null}
            <span className="truncate text-sm font-semibold">{symbol}</span>
          </span>
          <span className="font-mono text-base font-semibold">{price}</span>
        </div>
        <div className="flex h-4 items-center justify-between gap-2">
          {meta}
          {change ? (
            <span className="font-mono text-[11px]" style={{ color: changeColor }}>
              {change}
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{chart}</div>
    </section>
  );
}

function StrategyRow({ idea, active, onPick }: { idea: PairIdea; active: boolean; onPick: () => void }) {
  return (
    <li className="border-b" style={{ borderColor: D.line }}>
      <button type="button" onClick={onPick} aria-current={active ? 'true' : undefined} className="relative flex w-full items-center gap-2.5 px-3 py-2.5 text-left" style={{ background: active ? D.muted : 'transparent' }}>
        {active ? <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: D.fg }} /> : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="flex shrink-0 -space-x-1">
              <Coin symbol={idea.long} px={16} ring />
              <Coin symbol={idea.short} px={16} ring />
            </span>
            <span className="min-w-0 truncate text-xs font-semibold">
              {idea.long}
              <span className="font-medium" style={{ color: D.subtle }}>
                {' '}
                /{' '}
              </span>
              {idea.short}
            </span>
            <span className="ml-auto shrink-0 font-mono text-xs font-semibold tabular-nums" style={{ color: D.up }}>
              {idea.apr.toFixed(0)}%
            </span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: D.subtle }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: RISK_COLOR[idea.risk] }} />
            <span className="truncate">
              {idea.win100.toFixed(0)}% days won · <span className="font-mono tabular-nums">{signed(idea.avgDaily, 2, '%')}/d</span>
            </span>
            <span className="ml-auto">
              <Spark values={idea.values} />
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
