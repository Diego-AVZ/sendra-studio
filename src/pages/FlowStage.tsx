import { useEffect, useRef, useState } from 'react';

const STEP_MS = 4400;

const STEPS = [
  { id: 'design', k: '01', title: 'Design', time: '5 min', line: 'A protocol on the canvas. Screens, modules, and the fee. Five minutes, then it is live.' },
  { id: 'connect', k: '02', title: 'Connect', time: 'Sendra', line: 'Spot, Aave, liquidity, and enclaves. One account, already on Arbitrum.' },
  { id: 'fees', k: '03', title: 'Set fees', time: 'Builder', line: 'Your execution fee. Every fill pays the protocol you published.' },
  { id: 'users', k: '04', title: 'Attract', time: 'One link', line: 'The page is the front door. Wallets arrive and trade on your desk.' },
  { id: 'compete', k: '05', title: 'Compete', time: 'Seasons', line: 'Competitions, prizes, a board. And whatever you add next on the same link.' },
  { id: 'scale', k: '06', title: 'Scale', time: 'The book', line: 'Volume compounds. The builder fee compounds with it.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const TAPE: [string, string][] = [
  ['BTC buy', '+$0.84'],
  ['ETH/USDC LP', '+$2.10'],
  ['Aave supply', '+$0.36'],
  ['New wallet', '0x9c…a21'],
  ['Season 12', '5,000 USDC'],
  ['Enclave', '+$18.40'],
  ['SOL sell', '+$0.52'],
  ['Pairs desk', '+$1.16'],
];

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

function useCount(on: boolean, target: number, ms = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!on) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [on, target, ms]);
  return value;
}

function money(value: number) {
  return value.toLocaleString('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Tape() {
  const row = [...TAPE, ...TAPE];
  return (
    <div className="flow-ticker">
      <div className="flow-ticker-row">
        {row.map(([name, value], index) => (
          <span key={`${name}-${index}`}>
            {name}
            <em>{value}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function DesignPanel() {
  return (
    <div className="flow-panel">
      <p className="flow-k">Five minutes</p>
      <div className="flow-canvas">
        <div className="flow-drop">
          <small>Cover</small>
          Vela
        </div>
        <div className="flow-drop">
          <small>Terminal</small>
          BTC desk
        </div>
        <div className="flow-drop flow-drop-fee">
          <small>Fee</small>
          8 bps
        </div>
      </div>
      <p className="flow-note">Blank page to a live desk. The rails are already chosen.</p>
    </div>
  );
}

function ConnectPanel() {
  const rails = [
    { name: 'Spot', angle: '16deg' },
    { name: 'Aave', angle: '108deg' },
    { name: 'LP', angle: '198deg' },
    { name: 'Enclave', angle: '286deg' },
  ];
  return (
    <div className="flow-panel flow-panel-center">
      <div className="flow-orbit" aria-hidden="true">
        <div className="flow-core">Sendra</div>
        {rails.map((rail, index) => (
          <div key={rail.name} className="flow-ring" style={{ ['--i' as string]: index, ['--d' as string]: `${22 + index * 6}s`, ['--a' as string]: rail.angle }}>
            <span>
              <em>{rail.name}</em>
            </span>
          </div>
        ))}
      </div>
      <p className="flow-note">Connected on publish. One account holds spot, lending, LP, and enclaves.</p>
    </div>
  );
}

function FeesPanel() {
  const bps = useCount(true, 8);
  const income = useCount(true, 128.4, 1500);
  const rows = [
    ['BTC buy', '100 USDC', 0.08],
    ['ETH/USDC LP', '2,400 USDC', 0.72],
    ['Aave supply', '860 USDC', 0.26],
    ['Enclave open', '250,000 USDC', 1.4],
  ];
  return (
    <div className="flow-panel">
      <div className="flow-fee-head">
        <div>
          <p className="flow-k">Builder fee · execution</p>
          <p className="flow-bps">{bps.toFixed(1)} bps</p>
        </div>
        <p className="flow-income">
          <span>Today</span>
          {money(income)}
        </p>
      </div>
      <div className="flow-slider" aria-hidden="true">
        <i style={{ width: `${10 + bps * 6.5}%` }} />
      </div>
      <ul className="flow-receipts">
        {rows.map(([name, size, cut]) => (
          <li key={name}>
            <span>{name}</span>
            <small>{size}</small>
            <b>+{money(Number(cut))}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersPanel() {
  const events = ['0x9c…a21 joined', '0x21…88e bought BTC', '0x77…c02 supplied USDC', '0x4a…91 opened an enclave', '0x18…bb4 sold SOL'];
  return (
    <div className="flow-panel">
      <div className="flow-linkbar">
        <span>Live</span>
        <strong>/p/vela</strong>
        <em>Public</em>
      </div>
      <ul className="flow-users">
        {events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ul>
      <p className="flow-note">One link. They connect a wallet and the fee is already on the fill.</p>
    </div>
  );
}

function CompetePanel() {
  const board = [
    ['01', '0x9c… North', '+18.4%'],
    ['02', '0x21… Ada', '+12.1%'],
    ['03', '0x77… Vela', '+9.6%'],
    ['04', '0x4a… Kite', '+6.2%'],
  ];
  return (
    <div className="flow-panel">
      <div className="flow-prize">
        <span>Season 12</span>
        <strong>5,000 USDC</strong>
      </div>
      <ol className="flow-board-list">
        {board.map(([rank, name, pnl]) => (
          <li key={rank}>
            <b>{rank}</b>
            <span>{name}</span>
            <em>{pnl}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScalePanel() {
  const volume = useCount(true, 48.2);
  const fees = useCount(true, 86.4);
  const users = useCount(true, 12480, 1500);
  return (
    <div className="flow-panel">
      <p className="flow-k">The book</p>
      <svg className="flow-chart" viewBox="0 0 320 110" aria-hidden="true">
        <path className="flow-area" d="M0,96 C40,90 70,78 110,70 C150,62 180,66 220,42 C260,20 290,24 320,8 L320,110 L0,110 Z" />
        <path className="flow-draw" d="M0,96 C40,90 70,78 110,70 C150,62 180,66 220,42 C260,20 290,24 320,8" />
      </svg>
      <ul className="flow-metrics">
        <li>
          <span>Volume</span>
          <strong>${volume.toFixed(1)}m</strong>
        </li>
        <li>
          <span>Fees</span>
          <strong>${fees.toFixed(1)}k</strong>
        </li>
        <li>
          <span>Users</span>
          <strong>{Math.round(users).toLocaleString('en')}</strong>
        </li>
      </ul>
    </div>
  );
}

function Panel({ id }: { id: StepId }) {
  if (id === 'design') return <DesignPanel />;
  if (id === 'connect') return <ConnectPanel />;
  if (id === 'fees') return <FeesPanel />;
  if (id === 'users') return <UsersPanel />;
  if (id === 'compete') return <CompetePanel />;
  return <ScalePanel />;
}

export function FlowStage() {
  const reduced = useReduced();
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(2);
  const touring = inView && !paused && !reduced;
  const step = STEPS[index];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!touring) return;
    const id = window.setTimeout(() => setIndex((current) => (current + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(id);
  }, [touring, index]);

  return (
    <div
      className="flow"
      ref={root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false);
      }}
    >
      <Tape />
      <div className="flow-board">
        <ol className="flow-steps">
          {STEPS.map((item, itemIndex) => {
            const on = item.id === step.id;
            return (
              <li key={item.id}>
                <button type="button" aria-expanded={on} onClick={() => setIndex(itemIndex)}>
                  {on && touring ? <i className="flow-progress" key={item.id} /> : null}
                  <span className="flow-num">{item.k}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <span className="flow-detail">
                      <span>{item.line}</span>
                    </span>
                  </span>
                  <em>{item.time}</em>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flow-stage" aria-live="off">
          <Panel key={step.id} id={step.id} />
        </div>
      </div>
    </div>
  );
}
