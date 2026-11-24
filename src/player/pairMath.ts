export type PairBar = { time: number; open: number; high: number; low: number; close: number };

export type PairStats = {
  ratio: number;
  ratioChangePct: number;
  z: number | null;
  correlation: number | null;
  rollingCorrelation: number | null;
  beta: number | null;
  halfLifeBars: number | null;
  spreadPct: number;
  longChangePct: number;
  shortChangePct: number;
};

export type PairModel = {
  long: PairBar[];
  short: PairBar[];
  ratio: number[];
  mean: (number | null)[];
  zSeries: (number | null)[];
  perfLong: number[];
  perfShort: number[];
  stats: PairStats;
  window: number;
};

function mean(values: number[]) {
  let sum = 0;
  for (const value of values) sum += value;
  return values.length ? sum / values.length : 0;
}

function std(values: number[], center = mean(values)) {
  if (values.length < 2) return 0;
  let acc = 0;
  for (const value of values) acc += (value - center) ** 2;
  return Math.sqrt(acc / (values.length - 1));
}

function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

function logReturns(closes: number[]) {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) out.push(Math.log(closes[i] / closes[i - 1]));
  return out;
}

function hedgeRatio(longReturns: number[], shortReturns: number[]) {
  const n = Math.min(longReturns.length, shortReturns.length);
  if (n < 3) return null;
  const ml = mean(longReturns.slice(0, n));
  const ms = mean(shortReturns.slice(0, n));
  let cov = 0;
  let vs = 0;
  for (let i = 0; i < n; i += 1) {
    cov += (longReturns[i] - ml) * (shortReturns[i] - ms);
    vs += (shortReturns[i] - ms) ** 2;
  }
  return vs === 0 ? null : cov / vs;
}

function halfLife(series: number[]) {
  if (series.length < 10) return null;
  const center = mean(series);
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 1; i < series.length; i += 1) {
    x.push(series[i - 1] - center);
    y.push(series[i] - series[i - 1]);
  }
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < x.length; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  if (!(slope < 0)) return null;
  const life = -Math.log(2) / slope;
  return Number.isFinite(life) ? life : null;
}

function align(long: PairBar[], short: PairBar[]) {
  const other = new Map(short.map((bar) => [bar.time, bar]));
  const left: PairBar[] = [];
  const right: PairBar[] = [];
  for (const bar of long.slice().sort((a, b) => a.time - b.time)) {
    const match = other.get(bar.time);
    if (!match || !(bar.close > 0) || !(match.close > 0)) continue;
    left.push(bar);
    right.push(match);
  }
  return { long: left, short: right };
}

function rebase(closes: number[]) {
  const base = closes[0];
  if (!base) return closes.map(() => 0);
  return closes.map((close) => (close / base - 1) * 100);
}

export function buildPairModel(longRaw: PairBar[], shortRaw: PairBar[]): PairModel | null {
  const { long, short } = align(longRaw, shortRaw);
  if (long.length < 8) return null;
  const window = Math.max(8, Math.min(30, Math.floor(long.length / 3)));
  const ratio = long.map((bar, index) => bar.close / short[index].close);
  const logs = ratio.map((value) => Math.log(value));
  const meanLine: (number | null)[] = [];
  const zSeries: (number | null)[] = [];
  for (let i = 0; i < logs.length; i += 1) {
    if (i + 1 < window) {
      meanLine.push(null);
      zSeries.push(null);
      continue;
    }
    const slice = logs.slice(i + 1 - window, i + 1);
    const center = mean(slice);
    const sigma = std(slice, center);
    meanLine.push(Math.exp(center));
    zSeries.push(sigma > 0 ? (logs[i] - center) / sigma : 0);
  }
  const longCloses = long.map((bar) => bar.close);
  const shortCloses = short.map((bar) => bar.close);
  const perfLong = rebase(longCloses);
  const perfShort = rebase(shortCloses);
  const rLong = logReturns(longCloses);
  const rShort = logReturns(shortCloses);
  const last = long.length - 1;
  return {
    long,
    short,
    ratio,
    mean: meanLine,
    zSeries,
    perfLong,
    perfShort,
    window,
    stats: {
      ratio: ratio[last],
      ratioChangePct: (ratio[last] / ratio[0] - 1) * 100,
      z: zSeries[last],
      correlation: pearson(rLong, rShort),
      rollingCorrelation: pearson(rLong.slice(-window), rShort.slice(-window)),
      beta: hedgeRatio(rLong, rShort),
      halfLifeBars: halfLife(logs),
      spreadPct: perfLong[last] - perfShort[last],
      longChangePct: perfLong[last],
      shortChangePct: perfShort[last],
    },
  };
}

export function ratioDigits(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 4;
  if (value >= 100) return 2;
  if (value >= 1) return 4;
  return Math.min(8, Math.ceil(-Math.log10(value)) + 4);
}

export function signed(value: number, digits = 2, suffix = '') {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  const abs = Math.abs(rounded).toFixed(digits);
  if (rounded > 0) return `+${abs}${suffix}`;
  if (rounded < 0) return `−${abs}${suffix}`;
  return `${abs}${suffix}`;
}

export function entryScore(input: { rsi: number; winsNow: number; lossesNow: number; wins: number; losses: number }) {
  if (input.rsi > 70) return 3;
  if (input.rsi < 30) return 9;
  if (input.winsNow > input.wins * 0.7) return 8;
  if (input.lossesNow > input.losses * 0.7) return 2;
  return 5;
}

export function entryVerdict(score: number, z: number | null) {
  let adj = 0;
  if (z != null) {
    if (z <= -2) adj = 2;
    else if (z <= -1) adj = 1;
    else if (z >= 2) adj = -2;
    else if (z >= 1) adj = -1;
  }
  const total = Math.max(1, Math.min(10, score + adj));
  return { score: total, verdict: total >= 7 ? 'good' : total <= 3 ? 'wait' : 'neutral' } as const;
}
