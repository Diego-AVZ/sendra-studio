const HL = 'https://api.hyperliquid.xyz/info';

const INTERVAL: Record<string, string> = {
  '1': '1m',
  '3': '1m',
  '5': '5m',
  '15': '15m',
  '30': '15m',
  '60': '1h',
  '120': '1h',
  '240': '4h',
  '360': '4h',
  D: '1d',
  '1D': '1d',
};

const BAR_MS: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };

export const TV_RESOLUTIONS = ['1', '5', '15', '60', '240', 'D'];

type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

function pricescale(coin: string) {
  return coin === 'BTC' || coin === 'ETH' ? 100 : 10_000;
}

async function fetchBars(coin: string, resolution: string, fromMs: number, toMs: number) {
  const interval = INTERVAL[resolution] ?? '1h';
  const span = 4_000 * (BAR_MS[interval] ?? 3_600_000);
  const start = Math.max(fromMs, toMs - span);
  const res = await fetch(HL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'candleSnapshot', req: { coin, interval, startTime: start, endTime: toMs } }),
  });
  if (!res.ok) throw new Error('Price history did not answer.');
  const rows = (await res.json()) as { t: number; o: string | number; h: string | number; l: string | number; c: string | number; v?: string | number }[] | null;
  if (!Array.isArray(rows)) return [];
  const byTime = new Map<number, Bar>();
  for (const row of rows) {
    const close = Number(row.c);
    if (!(close > 0)) continue;
    byTime.set(row.t, {
      time: row.t,
      open: Number(row.o),
      high: Number(row.h),
      low: Number(row.l),
      close,
      volume: Number(row.v) || 0,
    });
  }
  return [...byTime.values()].filter((bar) => bar.time >= fromMs && bar.time <= toMs).sort((a, b) => a.time - b.time);
}

export function createTvFeed(coin: string) {
  const stops = new Map<string, () => void>();
  const name = `${coin} / USD`;
  return {
    onReady: (cb: (config: unknown) => void) => {
      setTimeout(
        () =>
          cb({
            supported_resolutions: TV_RESOLUTIONS,
            supports_group_request: false,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            supports_search: false,
          }),
        0,
      );
    },
    resolveSymbol: (_symbol: string, onResolve: (info: unknown) => void) => {
      setTimeout(
        () =>
          onResolve({
            name: coin,
            ticker: coin,
            description: name,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'Hyperliquid',
            listed_exchange: 'Hyperliquid',
            format: 'price',
            pricescale: pricescale(coin),
            minmov: 1,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: false,
            supported_resolutions: TV_RESOLUTIONS,
            volume_precision: 2,
            data_status: 'streaming',
          }),
        0,
      );
    },
    getBars: async (
      _symbol: unknown,
      resolution: string,
      period: { from: number; to: number },
      onHistory: (bars: Bar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) => {
      try {
        const bars = await fetchBars(coin, resolution, period.from * 1000, period.to * 1000);
        onHistory(bars, { noData: bars.length === 0 });
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Price history failed to load');
      }
    },
    subscribeBars: (_symbol: unknown, resolution: string, onRealtime: (bar: Bar) => void, uid: string) => {
      let alive = true;
      const pull = async () => {
        const now = Date.now();
        const bars = await fetchBars(coin, resolution, now - 3 * (BAR_MS[INTERVAL[resolution] ?? '1h'] ?? 3_600_000), now);
        const bar = bars[bars.length - 1];
        if (alive && bar) onRealtime(bar);
      };
      void pull().catch(() => undefined);
      const id = window.setInterval(() => void pull().catch(() => undefined), 15_000);
      stops.set(uid, () => {
        alive = false;
        window.clearInterval(id);
      });
    },
    unsubscribeBars: (uid: string) => {
      stops.get(uid)?.();
      stops.delete(uid);
    },
  };
}
