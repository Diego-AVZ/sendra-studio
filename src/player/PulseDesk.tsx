import type { ReactNode } from 'react';
import type { PulseBlock, Theme } from '@/schema/protocol';
import { inkFor } from '@/schema/protocol';
import { cardStyle, headline } from '@/player/chrome';
import { useLedger, type PulseRecord } from '@/player/ledger';
import { shortAddr } from '@/lib/uid';
import { ensureWallet } from '@/web3/run';

const TIERS = [
  { name: 'Bronze', min: 0, color: '#cd7f32', light: '#a3672b' },
  { name: 'Silver', min: 200, color: '#c0c0c0', light: '#71717a' },
  { name: 'Gold', min: 400, color: '#ffd700', light: '#b45309' },
  { name: 'Platinum', min: 600, color: '#67e8f9', light: '#0e7490' },
  { name: 'Sendra Sovereign', min: 800, color: '#f4f4f5', light: '#18181b' },
] as const;

const FACTORS = [
  { key: 'risk', label: 'Risk control', weight: '40%' },
  { key: 'profitability', label: 'Profitability', weight: '35%' },
  { key: 'win', label: 'Win rate', weight: '15%' },
  { key: 'experience', label: 'Experience', weight: '12.5%' },
  { key: 'activity', label: 'Activity', weight: '7.5%' },
] as const;

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function scoreOf(pulse: PulseRecord) {
  const aap = pulse.capitalIn > 0 && pulse.duration > 0 ? (3_153_600_000 * (pulse.capitalOut - pulse.capitalIn)) / (pulse.capitalIn * pulse.duration) : 0;
  const profitability = aap + 15 <= 0 ? 0 : clamp(-1500 / (aap + 15) + 100);
  let risk = 0;
  if (pulse.closed > 0) {
    if (pulse.grossLoss === 0) risk = 100;
    else if (pulse.losingCapital > 0) {
      const loss = (100 * pulse.grossLoss) / pulse.losingCapital;
      risk = clamp((45 * (100 - loss)) / (45 + 14 * loss));
    }
  }
  const win = pulse.closed > 0 ? clamp((100 * pulse.wins) / pulse.closed) : 0;
  const seniority = pulse.last > pulse.first && pulse.first > 0 ? pulse.last - pulse.first : pulse.duration;
  const months = seniority > 0 ? seniority / 2_592_000 : 0;
  const experience = months > 0 ? clamp(-1000 / (months + 10) + 100) : 0;
  const pace = seniority > 0 ? (2_592_000 * pulse.opened) / seniority : 0;
  const activity = seniority > 0 ? clamp(-600 / (pace + 6) + 100) : 0;
  const total = Math.round((0.35 * profitability + 0.4 * risk + 0.15 * win + 0.125 * experience + 0.075 * activity) * 10);
  return { total, profitability: profitability / 100, risk: risk / 100, win: win / 100, experience: experience / 100, activity: activity / 100, winPct: pulse.closed > 0 ? `${win.toFixed(1)}%` : '—' };
}

function samplePulse(): PulseRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    capitalIn: 128_400,
    capitalOut: 146_620,
    realized: 18_220,
    grossLoss: 800,
    losingCapital: 40_000,
    opened: 46,
    closed: 39,
    wins: 28,
    duration: 400 * 86_400,
    first: now - 400 * 86_400,
    last: now - 86_400,
    exposure: 18_400,
  };
}

function money(value: number, signed = false) {
  const text = Math.abs(value).toLocaleString('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (!signed || value === 0) return value < 0 ? `-${text}` : text;
  return `${value > 0 ? '+' : '−'}${text}`;
}

function Radar({ values, color, ink }: { values: number[]; color: string; ink: string }) {
  const at = (index: number, mag: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    return [90 + Math.cos(angle) * 62 * mag, 90 + Math.sin(angle) * 62 * mag];
  };
  const ring = (mag: number) => Array.from({ length: 5 }, (_, index) => at(index, mag).map((n) => n.toFixed(1)).join(',')).join(' ');
  const shape = values.map((value, index) => at(index, Math.max(0.06, Math.min(1, value))).join(',')).join(' ');
  return (
    <svg viewBox="0 0 180 180" className="h-40 w-40">
      {[0.35, 0.7, 1].map((mag) => (
        <polygon key={mag} points={ring(mag)} fill="none" stroke={ink} strokeOpacity="0.16" />
      ))}
      {Array.from({ length: 5 }, (_, index) => {
        const [x, y] = at(index, 1);
        return <line key={index} x1="90" y1="90" x2={x} y2={y} stroke={ink} strokeOpacity="0.16" />;
      })}
      <polygon points={shape} fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function PulseDesk({ block, theme, titleSlot }: { block: PulseBlock; theme: Theme; titleSlot?: ReactNode }) {
  const ledger = useLedger();
  const sample = !ledger.address;
  const pulse = sample ? samplePulse() : ledger.pulse;
  const scores = pulse ? scoreOf(pulse) : null;
  const light = inkFor(theme.paper) === '#141414';
  const tier = [...TIERS].reverse().find((item) => (scores?.total ?? 0) >= item.min) ?? TIERS[0];
  const next = TIERS[TIERS.findIndex((item) => item.name === tier.name) + 1];
  const tint = light ? tier.light : tier.color;
  const line = `color-mix(in srgb, ${theme.ink} 12%, transparent)`;
  const up = light ? '#137a45' : '#3dd68c';
  const down = light ? '#c43434' : '#ff8d8d';

  return (
    <section className="flex h-full min-h-0 flex-col overflow-auto" style={cardStyle(theme)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3 pr-16" style={{ borderColor: line }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            Reputation
          </p>
          <h3 className={`mt-1 text-2xl leading-none ${headline(theme.font)}`}>{titleSlot ?? block.title}</h3>
          <p className="mt-2 font-mono text-xs" style={{ color: theme.muted }}>
            {ledger.address ? shortAddr(ledger.address) : 'Sample record'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: tint }}>
            {tier.name}
          </p>
          <p className="mt-1 font-mono text-3xl leading-none">
            {ledger.busy && !scores ? '…' : scores?.total ?? 0}
            <span className="text-sm" style={{ color: theme.muted }}>
              {' '}
              / 1000
            </span>
          </p>
        </div>
      </header>
      <div className="grid gap-px sm:grid-cols-[auto_1fr]" style={{ background: line }}>
        <div className="relative grid place-items-center overflow-hidden px-4 py-4" style={{ background: theme.paper }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle, ${theme.ink} 1px, transparent 1px)`, backgroundSize: '16px 16px' }}
          />
          <Radar values={scores ? [scores.profitability, scores.win, scores.risk, scores.activity, scores.experience] : [0.08, 0.08, 0.08, 0.08, 0.08]} color={tint} ink={theme.ink} />
        </div>
        <div className="px-4 py-4" style={{ background: theme.paper }}>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: line }}>
            <div className="h-full" style={{ width: `${Math.min(100, ((scores?.total ?? 0) / 1000) * 100)}%`, background: tint }} />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: theme.muted }}>
            {next ? `${next.min - (scores?.total ?? 0)} to ${next.name}` : 'Top tier'}
            {pulse?.first ? ` · since ${new Date(pulse.first * 1000).toLocaleDateString('en', { month: 'short', year: 'numeric' })}` : ''}
          </p>
          <ul className="mt-4 grid gap-2.5">
            {FACTORS.map((factor) => {
              const value = scores ? Math.round(scores[factor.key] * 100) : 0;
              return (
                <li key={factor.key}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span>
                      {factor.label} <span style={{ color: theme.muted }}>· {factor.weight}</span>
                    </span>
                    <span className="font-mono">{value}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: line }}>
                    <div className="h-full" style={{ width: `${value}%`, background: theme.ink }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t sm:grid-cols-4" style={{ borderColor: line }}>
        {[
          ['Capital in', pulse ? money(pulse.capitalIn) : '—', theme.ink],
          ['Realized', pulse ? money(pulse.realized, true) : '—', pulse && pulse.realized < 0 ? down : up],
          ['Win rate', scores?.winPct ?? '—', theme.ink],
          ['Closed', pulse ? String(pulse.closed) : '—', theme.ink],
        ].map(([label, value, color]) => (
          <div key={label} className="px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
              {label}
            </p>
            <p className="mt-1 font-mono text-sm" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 text-xs" style={{ color: theme.muted }}>
        {sample ? (
          <button type="button" className="underline" style={{ color: theme.ink }} onClick={() => void ensureWallet().catch(() => undefined)}>
            Connect a wallet to read its reputation
          </button>
        ) : ledger.busy ? (
          'Reading Arbitrum…'
        ) : pulse && pulse.opened === 0 && pulse.capitalIn === 0 ? (
          'This wallet has no Sendra record yet.'
        ) : (
          'Score from risk control, profitability, win rate, experience, and activity.'
        )}
      </div>
    </section>
  );
}
