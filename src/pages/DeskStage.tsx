import { useId } from 'react';

type Candle = { open: number; close: number; high: number; low: number };

const CANDLES: Candle[] = (() => {
  const steps = [1.2, -0.8, 1.9, -0.5, 2.2, -1.3, 1.6, 0.9, -1.7, 2.5, -0.6, 1.2, 2, -1.5, 0.7, 2.3, -1, 1.8, -2.1, 1.4, 2.7, -0.9, 1.5, 1, -1.2, 2.1, 1.7, 1.3];
  let open = 100;
  return steps.map((step, index) => {
    const close = open + step;
    const high = Math.max(open, close) + 0.42 + (index % 3) * 0.24;
    const low = Math.min(open, close) - 0.3 - (index % 2) * 0.26;
    const candle = { open, close, high, low };
    open = close;
    return candle;
  });
})();

const CAL = ['', '', 'spot', 'spot', '', '', '', 'lp', 'lp', '', 'aave', '', '', 'pair', '', 'enclave', 'enclave', '', '', 'spot', '', '', '', 'aave', '', 'lp', '', '', '', 'pair', 'spot', '', '', '', ''];

const FACTORS: [string, string][] = [
  ['Risk', '86%'],
  ['Profit', '74%'],
  ['Win rate', '71%'],
  ['Experience', '63%'],
  ['Activity', '58%'],
];

export function CandleChart({ className = 'desk-chart' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const lows = CANDLES.map((candle) => candle.low);
  const highs = CANDLES.map((candle) => candle.high);
  const min = Math.min(...lows) - 0.6;
  const max = Math.max(...highs) + 0.6;
  const width = 320;
  const height = 150;
  const slot = width / CANDLES.length;
  const y = (value: number) => ((max - value) / (max - min)) * height;
  const last = CANDLES[CANDLES.length - 1];
  const area = [
    `0,${height}`,
    ...CANDLES.map((candle, index) => `${index * slot + slot / 2},${y(candle.close)}`),
    `${width},${height}`,
  ].join(' ');

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3dd68c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3dd68c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <line x1="0" x2={width} y1={y(last.close)} y2={y(last.close)} stroke="#d6ff4a" strokeOpacity="0.45" strokeDasharray="4 4" />
      {CANDLES.map((candle, index) => {
        const up = candle.close >= candle.open;
        const x = index * slot + slot * 0.22;
        const bar = slot * 0.56;
        const top = y(Math.max(candle.open, candle.close));
        const bottom = y(Math.min(candle.open, candle.close));
        const color = up ? '#3dd68c' : '#ff8d8d';
        return (
          <g key={index} className={index === CANDLES.length - 1 ? 'is-last' : undefined}>
            <line x1={x + bar / 2} x2={x + bar / 2} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.4" />
            <rect x={x} y={top} width={bar} height={Math.max(bottom - top, 1.4)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

function Volume() {
  const width = 320;
  const height = 36;
  const slot = width / CANDLES.length;
  const max = Math.max(...CANDLES.map((candle) => Math.abs(candle.close - candle.open)));
  return (
    <svg className="desk-vol" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {CANDLES.map((candle, index) => {
        const up = candle.close >= candle.open;
        const bar = Math.max(4, (Math.abs(candle.close - candle.open) / max) * 30);
        return (
          <rect
            key={index}
            x={index * slot + slot * 0.22}
            y={height - bar}
            width={slot * 0.56}
            height={bar}
            fill={up ? 'rgba(61,214,140,0.55)' : 'rgba(255,141,141,0.45)'}
          />
        );
      })}
    </svg>
  );
}

export function DeskStage() {
  return (
    <figure className="desk">
      <div className="desk-stage">
        <header className="desk-name">
          <span>
            <b className="desk-logo" aria-hidden="true" />
            Vela
          </span>
          <span>Sample financial desk</span>
          <em>Custom layout</em>
        </header>

        <div className="desk-screens">
          <div className="desk-mon">
            <div className="desk-screen">
              <div className="desk-top">
                <b className="desk-logo" aria-hidden="true" />
                <span>Vela · Execution</span>
                <em>Desk 01</em>
                <span className="desk-wallet">
                  <i />
                  0x4a2…c91
                </span>
              </div>
              <div className="desk-exec">
                <div className="desk-chart-wrap">
                  <div className="desk-chart-head">
                    <div className="desk-mkt">
                      <b>BTC</b>
                      <span>ETH</span>
                      <span>SOL</span>
                    </div>
                    <p className="desk-px">
                      97,420.18<i>+1.84%</i>
                    </p>
                    <div className="desk-tf">
                      <span>15m</span>
                      <span className="on">1h</span>
                      <span>4h</span>
                      <span>1d</span>
                    </div>
                  </div>
                  <div className="desk-plot">
                    <CandleChart />
                    <Volume />
                  </div>
                </div>
                <div className="desk-ticket">
                  <div className="desk-seg">
                    <span className="on">Buy</span>
                    <span>Sell</span>
                  </div>
                  <p className="desk-k">USDC</p>
                  <p className="desk-input">100</p>
                  <p className="desk-note">BTC stays in the Sendra account.</p>
                  <p className="desk-go">Execute</p>
                </div>
              </div>
            </div>
            <div className="desk-stand" aria-hidden="true" />
            <div className="desk-foot" aria-hidden="true" />
          </div>

          <div className="desk-bridge" aria-hidden="true">
            <svg className="desk-cable" viewBox="0 0 46 96">
              <path d="M4 6 C 4 46, 42 46, 42 90" />
            </svg>
            <span>1 account</span>
          </div>

          <div className="desk-mon">
            <div className="desk-screen is-books">
              <div className="desk-top">
                <b className="desk-logo" aria-hidden="true" />
                <span>Vela · Accounting</span>
                <em>Desk 02</em>
              </div>
              <div className="desk-acc">
                <div className="desk-acc-main">
                  <p className="desk-k">Value in open positions</p>
                  <p className="desk-hero">$2,481,900</p>
                  <p className="desk-pnl">+$184,220 · +8.1%</p>
                  <ul className="desk-stats">
                    <li>
                      <small>Realized</small>
                      <b className="up">+$142,010</b>
                    </li>
                    <li>
                      <small>Unrealized</small>
                      <b className="up">+$42,210</b>
                    </li>
                    <li>
                      <small>USDC</small>
                      <b>$860,400</b>
                    </li>
                    <li>
                      <small>Open</small>
                      <b>14</b>
                    </li>
                  </ul>
                  <ul className="desk-rows">
                    <li>
                      <i className="spot" />
                      BTC spot<b>+$42,180</b>
                    </li>
                    <li>
                      <i className="lp" />
                      ETH/USDC LP<b>+$6,440</b>
                    </li>
                    <li>
                      <i className="aave" />
                      Aave USDC<b>+$1,280</b>
                    </li>
                    <li>
                      <i className="enclave" />
                      Enclave<b>+$18,900</b>
                    </li>
                  </ul>
                </div>
                <aside className="desk-side">
                  <p className="desk-k">Calendar</p>
                  <div className="desk-week">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <span key={index}>{day}</span>
                    ))}
                  </div>
                  <div className="desk-cal">
                    {CAL.map((kind, index) => (
                      <i key={index} data-k={kind || undefined} />
                    ))}
                  </div>
                  <p className="desk-k">Pulse</p>
                  <p className="desk-score">
                    742 <small>Platinum</small>
                  </p>
                  <ul className="desk-factors">
                    {FACTORS.map(([label, value]) => (
                      <li key={label}>
                        <span>{label}</span>
                        <b>
                          <i style={{ width: value }} />
                        </b>
                        <em>{value}</em>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </div>
            <div className="desk-stand" aria-hidden="true" />
            <div className="desk-foot" aria-hidden="true" />
          </div>
        </div>

        <div className="desk-keys" aria-hidden="true" />
        <div className="desk-dock" aria-hidden="true">
          <span>Terminal</span>
          <span className="chip-a">Accounting</span>
          <span>Calendar</span>
          <span className="chip-b">Pulse</span>
          <span>Pairs</span>
        </div>

        <div className="desk-cursor" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M5.2 3.2 19 11.2l-6.3 1.3 1.7 6.7-3.2-1.1-2.2 4.2L5.2 3.2Z" />
          </svg>
          <div className="desk-carry desk-carry-a">
            <small>Module</small>
            <strong>Accounting</strong>
            <em>+8.1%</em>
          </div>
          <div className="desk-carry desk-carry-b">
            <small>Module</small>
            <strong>Pulse</strong>
            <em>742</em>
          </div>
        </div>
      </div>
      <figcaption className="desk-cap">
        Vela, a sample company. Execution on one screen, accounting on the other. The cursor places the modules. In the studio, you do.
      </figcaption>
    </figure>
  );
}
