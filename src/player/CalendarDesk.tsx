import { useMemo, useState, type ReactNode } from 'react';
import type { CalendarBlock, Theme } from '@/schema/protocol';
import { inkFor } from '@/schema/protocol';
import { cardStyle, headline } from '@/player/chrome';
import { useLedger, type Mark, type MarkKind } from '@/player/ledger';
import { shortAddr } from '@/lib/uid';
import { ensureWallet } from '@/web3/run';

const KIND: Record<MarkKind, { color: string; name: string }> = {
  pair: { color: '#8aa4ff', name: 'Pair' },
  lp: { color: '#2ec9a0', name: 'Liquidity' },
  enclave: { color: '#ff6b8a', name: 'Enclave' },
  spot: { color: '#c6e04a', name: 'Spot' },
  aave: { color: '#ffb020', name: 'Aave' },
};

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function fromUnix(sec: number) {
  return dayKey(new Date(sec * 1000));
}

function shift(day: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + day);
  return Math.floor(date.getTime() / 1000);
}

function sampleMarks(): Mark[] {
  return [
    { key: 's1', id: '18', kind: 'pair', label: 'BTC/ETH', pnl: 420, open: shift(-18), close: shift(-4), active: false },
    { key: 's2', id: '19', kind: 'spot', label: 'ETH', pnl: 180, open: shift(-9), close: 0, active: true },
    { key: 's3', id: '20', kind: 'lp', label: 'ETH/USDC', pnl: -64, open: shift(-22), close: shift(-1), active: false },
    { key: 's4', id: '21', kind: 'aave', label: 'Supply USDC', pnl: 28, open: shift(-11), close: 0, active: true },
    { key: 's5', id: '22', kind: 'enclave', label: 'Enclave', pnl: 960, open: shift(-15), close: shift(0), active: false },
    { key: 's6', id: '14', kind: 'pair', label: 'SOL/BTC', pnl: 140, open: shift(-40), close: shift(-28), active: false },
  ];
}

function money(value: number) {
  const abs = Math.abs(value);
  const text = abs >= 1000 ? `$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `$${abs.toFixed(0)}`;
  if (value > 0.5) return `+${text}`;
  if (value < -0.5) return `−${text}`;
  return text;
}

function tone(value: number, theme: Theme) {
  const light = inkFor(theme.paper) === '#141414';
  if (value > 0.5) return light ? '#137a45' : '#3dd68c';
  if (value < -0.5) return light ? '#c43434' : '#ff8d8d';
  return theme.muted;
}

function covers(mark: Mark, day: Date) {
  if (!mark.open) return false;
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() / 1000;
  const end = start + 86_400;
  if (mark.open >= end) return false;
  const close = mark.close > 0 ? mark.close : mark.active ? Math.floor(Date.now() / 1000) : mark.open;
  return close >= start;
}

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function yearWeeks(year: number) {
  const cursor = new Date(year, 0, 1);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  const end = new Date(year, 11, 31).getTime();
  const weeks: Date[][] = [];
  while (cursor.getTime() <= end) {
    weeks.push(
      Array.from({ length: 7 }, () => {
        const day = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
        return day;
      }),
    );
  }
  return weeks;
}

export function CalendarDesk({ block, theme, titleSlot }: { block: CalendarBlock; theme: Theme; titleSlot?: ReactNode }) {
  const ledger = useLedger();
  const [cursor, setCursor] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const sample = !ledger.address;
  const marks = sample ? sampleMarks() : ledger.marks;
  const line = `color-mix(in srgb, ${theme.ink} 12%, transparent)`;
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const weeks = useMemo(() => yearWeeks(year), [year]);
  const today = dayKey(new Date());

  const painted = useMemo(() => {
    const byDay = new Map<string, { opens: Mark[]; closes: Mark[]; live: Mark[]; pnl: number }>();
    const cell = (key: string) => {
      const hit = byDay.get(key);
      if (hit) return hit;
      const next = { opens: [] as Mark[], closes: [] as Mark[], live: [] as Mark[], pnl: 0 };
      byDay.set(key, next);
      return next;
    };
    for (const mark of marks) {
      if (mark.open) {
        const open = cell(fromUnix(mark.open));
        open.opens.push(mark);
      }
      if (mark.close) {
        const close = cell(fromUnix(mark.close));
        close.closes.push(mark);
        close.pnl += mark.pnl;
      }
    }
    return byDay;
  }, [marks]);

  const monthMarks = marks.filter((mark) => {
    const open = mark.open ? new Date(mark.open * 1000) : null;
    const close = mark.close ? new Date(mark.close * 1000) : null;
    return (open && open.getMonth() === month && open.getFullYear() === year) || (close && close.getMonth() === month && close.getFullYear() === year);
  });
  const monthPnl = monthMarks.filter((mark) => mark.close && new Date(mark.close * 1000).getMonth() === month).reduce((sum, mark) => sum + mark.pnl, 0);
  const opens = monthMarks.filter((mark) => mark.open && new Date(mark.open * 1000).getMonth() === month).length;
  const closes = monthMarks.filter((mark) => mark.close && new Date(mark.close * 1000).getMonth() === month).length;
  const undated = marks.filter((mark) => !mark.open);
  const pickedMarks = picked
    ? marks.filter((mark) => fromUnix(mark.open) === picked || (mark.close > 0 && fromUnix(mark.close) === picked) || cells.some((day) => dayKey(day) === picked && covers(mark, day)))
    : [];

  const choose = (day: Date) => {
    setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
    setPicked(dayKey(day));
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" style={cardStyle(theme)}>
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 pr-16" style={{ borderColor: line }}>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            Dashboard
          </p>
          <h3 className={`text-xl leading-none ${headline(theme.font)}`}>{titleSlot ?? block.title}</h3>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-2 py-1" style={{ color: theme.muted }}>
            ‹
          </button>
          <span className="min-w-28 text-center font-medium">
            {cursor.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-2 py-1" style={{ color: theme.muted }}>
            ›
          </button>
          <button type="button" onClick={() => choose(new Date())} className="px-2 py-1" style={{ color: theme.muted }}>
            Today
          </button>
        </div>
      </header>
      <div className="grid grid-cols-4 border-b text-center" style={{ borderColor: line }}>
        {[
          ['Month PnL', money(monthPnl), tone(monthPnl, theme)],
          ['Opens', String(opens), theme.ink],
          ['Closes', String(closes), theme.ink],
          ['Open now', String(marks.filter((mark) => mark.active).length), theme.ink],
        ].map(([label, value, color]) => (
          <div key={label} className="px-2 py-2">
            <p className="truncate text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
              {label}
            </p>
            <p className="mt-1 font-mono text-sm" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="flex gap-px" aria-label={`${year} heat`}>
            {weeks.map((week, index) => (
              <div key={index} className="grid grid-rows-7 gap-px">
                {week.map((day) => {
                  const key = dayKey(day);
                  const pnl = painted.get(key)?.pnl ?? 0;
                  const inYear = day.getFullYear() === year;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={`${day.toLocaleDateString('en', { month: 'short', day: 'numeric' })} ${money(pnl)}`}
                      onClick={() => choose(day)}
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{
                        background: !inYear ? 'transparent' : Math.abs(pnl) < 0.5 ? `color-mix(in srgb, ${theme.ink} 10%, transparent)` : tone(pnl, theme),
                        opacity: !inYear ? 0.2 : Math.abs(pnl) < 0.5 ? 1 : 0.9,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="shrink-0 text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
            {year}
          </p>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
          {WEEK.map((day, index) => (
            <span key={`${day}${index}`}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day) => {
            const key = dayKey(day);
            const inMonth = day.getMonth() === month;
            const info = painted.get(key);
            const events = [...(info?.opens ?? []).map((mark) => ({ mark, kind: 'Open' as const })), ...(info?.closes ?? []).map((mark) => ({ mark, kind: 'Close' as const }))];
            const live = marks.filter((mark) => covers(mark, day)).slice(0, 4);
            const active = picked === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPicked(key)}
                className="flex min-h-[4.6rem] flex-col overflow-hidden rounded-lg border p-1 text-left"
                style={{
                  borderColor: active ? theme.accent : dayKey(day) === today ? theme.ink : line,
                  opacity: inMonth ? 1 : 0.38,
                  background: info && Math.abs(info.pnl) > 0.5 ? `color-mix(in srgb, ${tone(info.pnl, theme)} 16%, transparent)` : `color-mix(in srgb, ${theme.ink} 4%, transparent)`,
                }}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-medium">{day.getDate()}</span>
                  {info && Math.abs(info.pnl) > 0.5 ? (
                    <span className="font-mono text-[9px]" style={{ color: tone(info.pnl, theme) }}>
                      {money(info.pnl)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 space-y-0.5">
                  {events.slice(0, 2).map((event) => (
                    <span
                      key={`${event.kind}${event.mark.key}`}
                      className="block truncate rounded px-1 text-[9px] leading-4"
                      style={{ background: `color-mix(in srgb, ${KIND[event.mark.kind].color} 24%, transparent)`, boxShadow: `inset 2px 0 0 ${KIND[event.mark.kind].color}` }}
                    >
                      {event.kind} {event.mark.label}
                    </span>
                  ))}
                  {events.length > 2 ? (
                    <span className="block px-1 text-[9px]" style={{ color: theme.muted }}>
                      +{events.length - 2}
                    </span>
                  ) : null}
                </span>
                <span className="mt-auto flex gap-0.5 pt-1">
                  {live.map((mark) => (
                    <span key={mark.key} className="h-1 flex-1 rounded-full" style={{ background: KIND[mark.kind].color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.muted }}>
          {(Object.keys(KIND) as MarkKind[]).map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND[kind].color }} />
              {KIND[kind].name}
            </span>
          ))}
          {sample ? <span className="ml-auto normal-case tracking-normal">Sample, until a wallet connects</span> : null}
          {!sample && ledger.busy ? <span className="ml-auto normal-case tracking-normal">Reading Arbitrum…</span> : null}
        </div>
        {picked ? (
          <div className="mt-3 border-t pt-3" style={{ borderColor: line }}>
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
              {pickedMarks.length ? `${pickedMarks.length} on this day` : 'Nothing on this day'}
            </p>
            <ul className="mt-2 grid gap-1">
              {pickedMarks.map((mark) => (
                <li key={mark.key} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: KIND[mark.kind].color }} />
                  <span className="min-w-0 flex-1 truncate">
                    {mark.label} <span style={{ color: theme.muted }}>#{mark.id}</span>
                  </span>
                  <span style={{ color: theme.muted }}>{mark.active ? 'Open' : 'Closed'}</span>
                  <span className="font-mono" style={{ color: tone(mark.pnl, theme) }}>
                    {money(mark.pnl)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {undated.length ? (
          <p className="mt-3 text-xs" style={{ color: theme.muted }}>
            {undated.length} positions have no open date on the book.
          </p>
        ) : null}
        {!sample && !ledger.busy && ledger.note && !marks.length ? (
          <p className="mt-3 text-sm" style={{ color: theme.muted }}>
            {ledger.note}
          </p>
        ) : null}
        {!sample && ledger.address ? (
          <p className="mt-2 text-[10px]" style={{ color: theme.muted }}>
            {shortAddr(ledger.address)}
          </p>
        ) : (
          <button type="button" className="mt-3 text-xs underline" style={{ color: theme.ink }} onClick={() => void ensureWallet().catch(() => undefined)}>
            Connect wallet
          </button>
        )}
      </div>
    </section>
  );
}
