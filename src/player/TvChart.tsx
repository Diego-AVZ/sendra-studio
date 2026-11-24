import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChartInterval, Theme } from '@/schema/protocol';
import { inkFor } from '@/schema/protocol';
import { createTvFeed } from '@/player/tvFeed';

const RESOLUTION: Record<ChartInterval, string> = { '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
const FROM_RESOLUTION: Record<string, ChartInterval> = { '15': '15m', '60': '1h', '240': '4h', D: '1d', '1D': '1d' };

const RANGES = [
  { text: '1d', resolution: '15', description: '1 day', title: '1D' },
  { text: '5d', resolution: '60', description: '5 days', title: '5D' },
  { text: '1m', resolution: '60', description: '1 month', title: '1M' },
  { text: '3m', resolution: '240', description: '3 months', title: '3M' },
  { text: '6m', resolution: '1D', description: '6 months', title: '6M' },
  { text: '1y', resolution: '1D', description: '1 year', title: '1Y' },
];

declare global {
  interface Window {
    TradingView?: { widget: new (options: unknown) => TvWidget };
  }
}

type TvWidget = {
  remove: () => void;
  onChartReady: (cb: () => void) => void;
  chart: () => {
    setResolution: (resolution: string, cb: () => void) => void;
    onIntervalChanged: () => { subscribe: (ctx: null, cb: (resolution: string) => void) => void };
  };
};

let library: Promise<void> | null = null;

function loadLibrary() {
  if (window.TradingView?.widget) return Promise.resolve();
  if (library) return library;
  library = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL}charting_library/charting_library.standalone.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      library = null;
      reject(new Error('TradingView did not load.'));
    };
    document.head.appendChild(script);
  });
  return library;
}

export function TvChart({
  coin,
  interval,
  theme,
  onInterval,
}: {
  coin: string;
  interval: ChartInterval;
  theme: Theme;
  onInterval?: (next: ChartInterval) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<TvWidget | null>(null);
  const intervalRef = useRef(interval);
  const onIntervalRef = useRef(onInterval);
  const [note, setNote] = useState('');
  const light = inkFor(theme.paper) === '#141414';
  const feed = useMemo(() => createTvFeed(coin), [coin]);
  intervalRef.current = interval;
  onIntervalRef.current = onInterval;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    setNote('');
    void loadLibrary()
      .then(() => {
        if (cancelled || !host.current || !window.TradingView) return;
        widget.current?.remove();
        const next = new window.TradingView.widget({
          symbol: coin,
          interval: RESOLUTION[intervalRef.current],
          container: host.current,
          datafeed: feed,
          library_path: `${import.meta.env.BASE_URL}charting_library/`,
          locale: 'en',
          theme: light ? 'Light' : 'Dark',
          autosize: true,
          timezone: 'Etc/UTC',
          time_frames: RANGES,
          loading_screen: { backgroundColor: theme.paper, foregroundColor: theme.accent },
          disabled_features: ['use_localstorage_for_settings', 'header_symbol_search', 'header_compare', 'header_saveload', 'header_screenshot', 'header_resolutions'],
          enabled_features: ['left_toolbar', 'keep_left_toolbar_visible_on_small_screens'],
          overrides: {
            'paneProperties.background': theme.paper,
            'paneProperties.backgroundType': 'solid',
            'scalesProperties.textColor': theme.ink,
          },
        });
        widget.current = next;
        next.onChartReady(() => {
          if (cancelled) return;
          try {
            next.chart().onIntervalChanged().subscribe(null, (resolution) => {
              const mapped = FROM_RESOLUTION[resolution];
              if (mapped && mapped !== intervalRef.current) onIntervalRef.current?.(mapped);
            });
          } catch {
            /* the range bar can change the resolution before the chart is ready */
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setNote(err instanceof Error ? err.message : 'TradingView did not load.');
      });
    return () => {
      cancelled = true;
      widget.current?.remove();
      widget.current = null;
    };
  }, [coin, feed, light, theme.accent, theme.ink, theme.paper]);

  useEffect(() => {
    const chart = widget.current;
    if (!chart?.chart) return;
    try {
      chart.chart().setResolution(RESOLUTION[interval], () => undefined);
    } catch {
      /* wait until the chart is ready */
    }
  }, [interval]);

  return (
    <div className="relative h-full min-h-64 w-full">
      <div ref={host} className="h-full w-full" />
      {note ? (
        <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm" style={{ color: theme.muted }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
