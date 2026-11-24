import { useEffect, useState } from 'react';
import type { ChartInterval, PairRisk } from '@/schema/protocol';
import { buildPairModel, entryScore, type PairBar, type PairModel } from '@/player/pairMath';

const ENGINE = 'https://analyzer-navy.vercel.app';
const HL = 'https://api.hyperliquid.xyz/info';

const SECONDS: Record<ChartInterval, number> = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
const BARS: Record<ChartInterval, number> = { '15m': 160, '1h': 180, '4h': 180, '1d': 140 };

export type PairIdea = {
  long: string;
  short: string;
  apr: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  win100: number;
  win30: number | null;
  win60: number | null;
  avgDaily: number;
  fundingLong: number | null;
  fundingShort: number | null;
  values: number[];
};

export type PairStudy = {
  winRate: number;
  avgDaily: number;
  drawdown: number;
  volatility: number;
  best: number;
  worst: number;
  rsi: number;
  score: number;
  fundingLong: number | null;
  fundingShort: number | null;
  daily: number[];
};

type Bundle = {
  longToken?: string;
  shortToken?: string;
  apr?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  winRate100d?: number;
  avgDailyProfit100d?: number;
  fundingFeeLong?: string;
  fundingFeeShort?: string;
  values?: number[];
  metrics?: { '30d'?: { winRate?: number }; '60d'?: { winRate?: number } };
};

function coin(token: string) {
  return token.replace(/USDT$/, '').replace(/USDC$/, '').toUpperCase();
}

function funding(text?: string) {
  if (!text) return null;
  const n = Number(text.replace(/[\s\u200a\u2009%+]/g, '').replace('\u2212', '-'));
  return Number.isFinite(n) ? n : null;
}

export async function fetchIdeas(risk: PairRisk) {
  const url = `${ENGINE}/api/strategy-bundles?limit=48&riskLevel=${risk}&timePeriod=ALL&sortBy=APR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('The market neutral engine did not answer.');
  const body = (await res.json()) as { strategies?: Bundle[] };
  return (body.strategies ?? [])
    .filter((row) => (row.apr ?? 0) > 0 && row.longToken && row.shortToken)
    .map((row) => ({
      long: coin(row.longToken!),
      short: coin(row.shortToken!),
      apr: row.apr ?? 0,
      risk: row.riskLevel ?? 'MEDIUM',
      win100: row.winRate100d ?? 0,
      win30: row.metrics?.['30d']?.winRate ?? null,
      win60: row.metrics?.['60d']?.winRate ?? null,
      avgDaily: row.avgDailyProfit100d ?? 0,
      fundingLong: funding(row.fundingFeeLong),
      fundingShort: funding(row.fundingFeeShort),
      values: Array.isArray(row.values) ? row.values.filter((value) => Number.isFinite(value)) : [],
    }));
}

type AnalyzeStats = {
  winRate?: number;
  averageDailyProfit?: number;
  maxDrawdown?: number;
  profitVolatility?: number;
  maxSingleDayProfit?: number;
  maxSingleDayLoss?: number;
  rsi?: number;
  fundingFeeLong?: string;
  fundingFeeShort?: string;
  dailyProfits?: number[];
  currentConsecutiveWins?: number;
  currentConsecutiveLoss?: number;
  consecutiveWins?: number;
  consecutiveLoss?: number;
};

const studies = new Map<string, { at: number; study: PairStudy }>();

export async function fetchStudy(long: string, short: string) {
  const key = `${long}/${short}`;
  const hit = studies.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.study;
  const res = await fetch(`${ENGINE}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ longToken: `${long}USDT`, shortToken: `${short}USDT`, timePeriod: 100 }),
  });
  if (!res.ok) throw new Error('The engine could not study this pair.');
  const body = (await res.json()) as { stats?: AnalyzeStats };
  const stats = body.stats ?? {};
  const study: PairStudy = {
    winRate: stats.winRate ?? 0,
    avgDaily: stats.averageDailyProfit ?? 0,
    drawdown: stats.maxDrawdown ?? 0,
    volatility: stats.profitVolatility ?? 0,
    best: stats.maxSingleDayProfit ?? 0,
    worst: stats.maxSingleDayLoss ?? 0,
    rsi: stats.rsi ?? 50,
    score: entryScore({
      rsi: stats.rsi ?? 50,
      winsNow: stats.currentConsecutiveWins ?? 0,
      lossesNow: stats.currentConsecutiveLoss ?? 0,
      wins: stats.consecutiveWins ?? 0,
      losses: stats.consecutiveLoss ?? 0,
    }),
    fundingLong: funding(stats.fundingFeeLong),
    fundingShort: funding(stats.fundingFeeShort),
    daily: Array.isArray(stats.dailyProfits) ? stats.dailyProfits.filter((value) => Number.isFinite(value)) : [],
  };
  studies.set(key, { at: Date.now(), study });
  return study;
}

const KILO = ['PEPE', 'SHIB', 'BONK', 'FLOKI', 'LUNC', 'DOGS', 'NEIRO'];

let directory: Promise<Map<string, string>> | null = null;

function baseCoin(symbol: string) {
  return symbol.toUpperCase().replace(/USDT$|USDC$/, '').replace(/^1000/, '');
}

async function coinDirectory() {
  if (!directory) {
    directory = (async () => {
      const post = (body: unknown) =>
        fetch(HL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((res) => res.json());
      const [meta, dexes] = (await Promise.all([post({ type: 'meta' }), post({ type: 'perpDexs' })])) as [
        { universe?: { name?: string }[] },
        { assetToStreamingOiCap?: [string, string][] }[],
      ];
      const map = new Map<string, string>();
      for (const row of meta?.universe ?? []) {
        if (row.name) map.set(row.name.toUpperCase(), row.name);
      }
      for (const [key, coin] of [...map]) {
        if (key.startsWith('K') && key.length > 2 && !map.has(key.slice(1))) map.set(key.slice(1), coin);
      }
      for (const dex of Array.isArray(dexes) ? dexes : []) {
        for (const pair of dex?.assetToStreamingOiCap ?? []) {
          const coin = String(pair[0]);
          const symbol = coin.split(':').pop()?.toUpperCase();
          if (symbol && !map.has(symbol)) map.set(symbol, coin);
        }
      }
      return map;
    })().catch((err: unknown) => {
      directory = null;
      throw err;
    });
  }
  return directory;
}

async function resolveCoin(symbol: string) {
  const base = baseCoin(symbol);
  const map = await coinDirectory().catch(() => new Map<string, string>());
  return map.get(base) ?? (KILO.includes(base) ? `k${base}` : base);
}

function bucketBars(bars: PairBar[], step: number) {
  const map = new Map<number, PairBar>();
  for (const bar of bars) {
    const time = Math.floor(bar.time / step) * step;
    const prev = map.get(time);
    if (!prev) map.set(time, { ...bar, time });
    else map.set(time, { time, open: prev.open, high: Math.max(prev.high, bar.high), low: Math.min(prev.low, bar.low), close: bar.close });
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

async function fetchHl(coinName: string, interval: ChartInterval) {
  const end = Date.now();
  const start = end - BARS[interval] * SECONDS[interval] * 1000;
  const res = await fetch(HL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'candleSnapshot', req: { coin: coinName, interval, startTime: start, endTime: end } }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as { t?: number; o?: string | number; h?: string | number; l?: string | number; c?: string | number }[];
  if (!Array.isArray(rows)) return [];
  const bars: PairBar[] = [];
  for (const row of rows) {
    const bar = { time: Math.floor(Number(row.t) / 1000), open: Number(row.o), high: Number(row.h), low: Number(row.l), close: Number(row.c) };
    if (bar.close > 0 && bar.high >= bar.low) bars.push(bar);
  }
  return bars;
}

async function fetchCoinbase(symbol: string, interval: ChartInterval) {
  const base = baseCoin(symbol);
  if (!base || ['USDC', 'USDT', 'USD', 'DAI'].includes(base)) return [];
  const gran = interval === '4h' ? 3600 : SECONDS[interval];
  const res = await fetch(`https://api.exchange.coinbase.com/products/${base}-USD/candles?granularity=${gran}`);
  if (!res.ok) return [];
  const rows = (await res.json()) as number[][];
  if (!Array.isArray(rows)) return [];
  const bars = rows
    .map((row) => ({ time: row[0], low: row[1], high: row[2], open: row[3], close: row[4] }))
    .filter((bar) => bar.close > 0 && bar.high >= bar.low)
    .sort((a, b) => a.time - b.time);
  if (interval !== '4h') return bars;
  const grouped: PairBar[] = [];
  for (const bar of bars) {
    const time = Math.floor(bar.time / 14400) * 14400;
    const last = grouped[grouped.length - 1];
    if (last && last.time === time) {
      last.high = Math.max(last.high, bar.high);
      last.low = Math.min(last.low, bar.low);
      last.close = bar.close;
    } else grouped.push({ ...bar, time });
  }
  return grouped;
}

async function fetchBars(symbol: string, interval: ChartInterval): Promise<PairBar[]> {
  const step = SECONDS[interval];
  const coin = await resolveCoin(symbol);
  let bars = bucketBars(await fetchHl(coin, interval).catch(() => []), step);
  if (bars.length < 8 && coin !== symbol) {
    const plain = bucketBars(await fetchHl(symbol, interval).catch(() => []), step);
    if (plain.length > bars.length) bars = plain;
  }
  if (bars.length < 8) {
    const extra = bucketBars(await fetchCoinbase(symbol, interval).catch(() => []), step);
    if (extra.length > bars.length) bars = extra;
  }
  return bars;
}

export function usePairIdeas(risk: PairRisk) {
  const [ideas, setIdeas] = useState<PairIdea[]>([]);
  const [quiet, setQuiet] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchIdeas(risk)
      .then((next) => {
        if (!alive) return;
        setIdeas(next);
        setQuiet(false);
      })
      .catch(() => {
        if (alive) setQuiet(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [risk]);
  return { ideas, quiet, loading };
}

export function usePairModel(long: string, short: string, interval: ChartInterval, active: boolean) {
  const [model, setModel] = useState<PairModel | null>(null);
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    if (!active || !long || !short || long === short) {
      setModel(null);
      return;
    }
    let alive = true;
    setModel(null);
    setQuiet(false);
    const load = async () => {
      const [left, right] = await Promise.all([fetchBars(long, interval), fetchBars(short, interval)]);
      if (!alive) return;
      const next = buildPairModel(left, right);
      setModel(next);
      setQuiet(!next);
    };
    void load().catch(() => {
      if (!alive) return;
      setModel(null);
      setQuiet(true);
    });
    const id = window.setInterval(() => void load().catch(() => undefined), 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [active, interval, long, short]);
  return { model, quiet };
}

export function usePairStudy(long: string, short: string, active: boolean) {
  const [study, setStudy] = useState<PairStudy | null>(null);
  const [quiet, setQuiet] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!active || !long || !short || long === short) return;
    let alive = true;
    setLoading(true);
    setStudy(null);
    void fetchStudy(long, short)
      .then((next) => {
        if (!alive) return;
        setStudy(next);
        setQuiet(false);
      })
      .catch(() => {
        if (alive) setQuiet(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [active, long, short]);
  return { study, quiet, loading };
}
