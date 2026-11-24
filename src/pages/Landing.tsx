import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startProtocol } from '@/lib/drafts';
import { explain, shortAddr } from '@/lib/uid';
import { useTitle } from '@/lib/title';
import { CandleChart, DeskStage } from '@/pages/DeskStage';
import { FlowStage } from '@/pages/FlowStage';
import { ProtocolsMenu } from '@/pages/ProtocolsMenu';
import { TEMPLATES, type TemplateId } from '@/schema/templates';
import { RAILS } from '@/web3/addresses';

const PROP_FLOW = [
  { k: '01', title: 'Attract traders', body: 'Publish one link. They arrive at your firm.' },
  { k: '02', title: 'Price the accounts', body: 'You set what a funding account costs.' },
  { k: '03', title: 'Design the test', body: 'Target, drawdown, and how long they have.' },
  { k: '04', title: 'Fund the enclaves', body: 'Deposit the capital. They trade inside your limits.' },
  { k: '05', title: 'Collect', body: 'A cut of profits, and a fee on the volume.' },
];

const STEPS = [
  { title: 'Start', body: 'A blank company, or a template already wired to a Sendra rail.' },
  { title: 'Design', body: 'Place the screens. Drag terminal, accounting, calendar, and pulse until the desk is yours.' },
  { title: 'Publish', body: 'One link. That link is the public face of the protocol.' },
  { title: 'Run', body: 'Visitors connect a wallet. Your builder fee lands on every execution.' },
];

const MODULES: { id: string; group: string; name: string; line: string }[] = [
  { id: 'terminal', group: 'Execution', name: 'Terminal', line: 'Candles, a live price, and a spot ticket. You pick the markets.' },
  { id: 'books', group: 'Accounting', name: 'Portfolio', line: 'The book. Value, realized and unrealized PnL, capital, and USDC.' },
  { id: 'pairs', group: 'Execution', name: 'Pairs', line: 'A market-neutral desk. You choose the two legs.' },
  { id: 'calendar', group: 'Accounting', name: 'Calendar', line: 'Positions painted on the days they open and close.' },
  { id: 'pulse', group: 'Accounting', name: 'Pulse', line: 'Reputation. Tier, score, and the five factors.' },
  { id: 'spotbook', group: 'Execution', name: 'Spot book', line: 'Spot positions only. Sell from the row.' },
  { id: 'aave', group: 'Execution', name: 'Aave', line: 'Supply into the lending cell on the same account.' },
  { id: 'lp', group: 'Execution', name: 'Liquidity', line: 'A range on the pool. The LP sits with spot.' },
  { id: 'enclave', group: 'Execution', name: 'Enclaves', line: 'Create the offer, take one, manage it, and read its book.' },
];

const MONTH = ['', '', 'spot', 'spot', '', '', '', 'lp', '', 'aave', 'aave', '', '', 'pair', '', 'enclave', '', '', 'spot', '', 'lp', '', '', '', 'aave', '', '', 'pair', ''];

function Visual({ id }: { id: string }) {
  if (id === 'terminal') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Terminal · BTC
        </div>
        <div className="shot-plot">
          <CandleChart />
        </div>
      </div>
    );
  }
  if (id === 'books') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Accounting
        </div>
        <div className="shot-body">
          <p className="shot-k">Open positions</p>
          <p className="shot-num">$2,481,900</p>
          <p className="shot-up">+$184,220 · +8.1%</p>
          <div className="shot-split">
            <span>Realized +$142,010</span>
            <span>USDC $860,400</span>
          </div>
        </div>
      </div>
    );
  }
  if (id === 'pairs') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Pairs · BTC/ETH
        </div>
        <div className="shot-body">
          <p className="shot-num">
            18.42 <small>ratio</small>
          </p>
          <svg className="shot-line" viewBox="0 0 220 48" aria-hidden="true">
            <polyline points="0,36 18,30 36,33 54,22 72,26 90,16 108,19 126,12 144,18 162,10 180,14 200,8 220,11" fill="none" stroke="#8aa4ff" strokeWidth="2" />
          </svg>
          <div className="shot-split">
            <span>Z +1.8</span>
            <span>Half-life 4.2d</span>
          </div>
        </div>
      </div>
    );
  }
  if (id === 'calendar') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Calendar
        </div>
        <div className="shot-cal">
          {MONTH.map((kind, index) => (
            <i key={index} data-k={kind || undefined} />
          ))}
        </div>
      </div>
    );
  }
  if (id === 'pulse') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Pulse · Platinum
        </div>
        <div className="shot-body">
          <p className="shot-num shot-ice">
            742 <small>/ 1000</small>
          </p>
          <ul className="shot-bars">
            {[
              ['Risk', '86%'],
              ['Profit', '74%'],
              ['Win rate', '71%'],
              ['Experience', '63%'],
            ].map(([label, value]) => (
              <li key={label}>
                <span>{label}</span>
                <b>
                  <i style={{ width: value }} />
                </b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (id === 'spotbook') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Spot book
        </div>
        <div className="shot-body shot-rows">
          {[
            ['BTC', '+$42,180'],
            ['ETH', '+$11,040'],
            ['SOL', '−$640'],
          ].map(([name, pnl]) => (
            <p key={name} className="shot-row">
              <span>{name}</span>
              <b className={pnl.startsWith('−') ? 'down' : ''}>{pnl}</b>
              <em>Sell</em>
            </p>
          ))}
        </div>
      </div>
    );
  }
  if (id === 'aave') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Aave · Supply
        </div>
        <div className="shot-body">
          <p className="shot-k">USDC lending cell</p>
          <p className="shot-num">
            4.82% <small>APY</small>
          </p>
          <p className="shot-note">100 USDC · same Sendra account</p>
        </div>
      </div>
    );
  }
  if (id === 'lp') {
    return (
      <div className="land-shot">
        <div className="shot-bar">
          <b />
          Liquidity · ETH/USDC
        </div>
        <div className="shot-body">
          <p className="shot-k">Range</p>
          <div className="shot-range" aria-hidden="true">
            <b />
          </div>
          <div className="shot-split">
            <span>−8%</span>
            <span>+12%</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="land-shot">
      <div className="shot-bar">
        <b />
        Enclave
      </div>
      <div className="shot-body">
        <p className="shot-num">
          250,000 <small>USDC</small>
        </p>
        <div className="shot-pills">
          <span>30 days</span>
          <span>20% split</span>
          <span>Offers</span>
          <span>Manage</span>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  useTitle('Sendra Studio');

  useEffect(() => {
    const root = document.querySelector('.land');
    root?.classList.add('js');
    const items = [...document.querySelectorAll('.land .reveal')];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root?.classList.remove('js');
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.land');
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      root.style.setProperty('--planet', '1.12');
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const range = Math.max(window.innerHeight * 0.9, 640);
      const t = Math.min(1, Math.max(0, y / range));
      const ease = 1 - (1 - t) * (1 - t);
      root.style.setProperty('--planet', (1.62 - ease * 0.5).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  async function open(which: TemplateId) {
    if (busy) return;
    setBusy(which);
    setNote('');
    try {
      navigate(`/crear/${await startProtocol(which)}`);
    } catch (err) {
      setBusy('');
      setNote(explain(err));
    }
  }

  return (
    <div className="land min-h-dvh">
      <header className="land-top">
        <div className="land-wrap">
          <Link to="/" className="land-mark">
            <b aria-hidden="true" />
            Sendra Studio
          </Link>
          <nav className="land-nav" aria-label="Page sections">
            <a href="#paths">Paths</a>
            <a href="#desk">Desk</a>
            <a href="#earn">Earn</a>
            <a href="#templates">Templates</a>
            <a href="#rails">Rails</a>
            <a href="#use">How it works</a>
            <Link to="/universe">Universe</Link>
          </nav>
          <Link to="/universe" className="land-universe">
            Universe
          </Link>
          <ProtocolsMenu placement="down" />
          <Link to="/crear/nuevo" className="land-go">
            <span className="land-go-long">Create protocol</span>
            <span className="land-go-short">Create</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="land-hero">
          <div className="land-planet" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}hero-planet.jpg?v=earth`} alt="" width="1024" height="1024" fetchPriority="high" decoding="async" />
          </div>
          <div className="land-stars" aria-hidden="true" />
          <div className="land-wrap">
            <div className="land-hero-copy">
              <p className="land-eyebrow">Financial desk · Arbitrum</p>
              <h1>
                <span>Create your own</span>
                <em>DeFi project.</em>
              </h1>
              <p className="land-alt">Run your own financial company.</p>
              <p className="land-lede">
                <strong>Two utilities.</strong> Create a protocol and manage it, or build a financial desk and use it as your own app. Both sit on Sendra, on Arbitrum.
              </p>
              <div className="land-actions">
                <Link to="/crear/nuevo" className="land-go">
                  Create protocol
                </Link>
                <button type="button" className="land-ghost" disabled={Boolean(busy)} onClick={() => void open('terminal')}>
                  {busy === 'terminal' ? 'Opening…' : 'Build my desk'}
                </button>
              </div>
              <ul className="land-tags" aria-label="What’s on the desk">
                <li>Terminal</li>
                <li>Accounting</li>
                <li>Calendar</li>
                <li>Pulse</li>
                <li>Pairs</li>
                <li>Aave</li>
                <li>Liquidity</li>
                <li>Enclaves</li>
                <li>Builder fee</li>
              </ul>
            </div>
            <DeskStage />
          </div>
        </section>

        <section className="land-sec" id="paths">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">Two utilities</p>
              <h2>Two ways in.</h2>
              <p>Same modules, same rails. One path publishes a protocol you manage. The other is the financial desk you keep and use yourself.</p>
            </div>
            <div className="land-paths reveal">
              <article className="path path-protocol">
                <div>
                  <p className="path-k">Protocol</p>
                  <h3>
                    Create it.
                    <br />
                    Manage it.
                  </h3>
                  <p>The public company. Design the page, set the execution fee, and run it while other people trade.</p>
                </div>
                <ul>
                  <li>
                    <i />
                    One published link
                  </li>
                  <li>
                    <i />
                    Builder fee on every fill
                  </li>
                  <li>
                    <i />
                    Visitors, competitions, a book that scales
                  </li>
                </ul>
                <div className="path-stage">
                  <span>Live</span>
                  <strong>/p/vela</strong>
                  <em>8 bps · yours</em>
                </div>
                <div className="path-actions">
                  <Link to="/crear/nuevo" className="land-go">
                    Create protocol
                  </Link>
                  <a href="#earn">See the income</a>
                </div>
              </article>
              <article className="path path-app">
                <div>
                  <p className="path-k">Your desk</p>
                  <h3>
                    Build it.
                    <br />
                    Use it.
                  </h3>
                  <p>The private app. Arrange terminal, books, calendar, and pulse, then manage your own money from that desk.</p>
                </div>
                <ul>
                  <li>
                    <i />
                    Screens you place yourself
                  </li>
                  <li>
                    <i />
                    Your wallet, positions, and markets
                  </li>
                  <li>
                    <i />
                    Open it as your financial app
                  </li>
                </ul>
                <div className="path-stage path-mini">
                  <span>
                    <b>01</b> Terminal <em>BTC</em>
                  </span>
                  <span>
                    <b>02</b> Books <em>$2.4m</em>
                  </span>
                  <span>
                    <b>03</b> Calendar <em>Open</em>
                  </span>
                </div>
                <div className="path-actions">
                  <button type="button" className="land-go" disabled={Boolean(busy)} onClick={() => void open('terminal')}>
                    {busy === 'terminal' ? 'Opening…' : 'Build my desk'}
                  </button>
                  <a href="#desk">See the modules</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="land-sec" id="earn">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">Protocol · the public path</p>
              <h2>Set the fee.</h2>
              <p>A protocol in five minutes, connected to Sendra. Set the builder fee, attract users, run competitions, and scale the book.</p>
            </div>
            <div className="reveal">
              <FlowStage />
            </div>
          </div>
        </section>

        <section className="land-sec" id="desk">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">Your desk · the private app</p>
              <h2>Design the desk.</h2>
              <p>Execution on one screen. Accounting on the next. Drag the modules until the desk is the financial app you actually open.</p>
            </div>
            <ul className="land-mods reveal">
              {MODULES.map((item) => (
                <li key={item.id}>
                  <Visual id={item.id} />
                  <p className="mod-k">{item.group}</p>
                  <h3>{item.name}</h3>
                  <p>{item.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="land-sec" id="templates">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">Templates</p>
              <h2>Start a firm.</h2>
              <p>The prop firm is the company: a public offer, priced accounts, a test, and capital that trades under your rules. The other templates are the desks inside it.</p>
            </div>
            <article className="prop-firm reveal">
              <div className="prop-firm-copy">
                <p className="land-kicker">Featured</p>
                <h3>Create your prop firm.</h3>
                <p>Attract traders, price the funding accounts, and design the evaluation. Deposit the money in an enclave and let them manage it under your rules. You keep a share of profits and of volume.</p>
                <button type="button" className="land-go" disabled={Boolean(busy)} onClick={() => void open('propfirm')}>
                  {busy === 'propfirm' ? 'Opening…' : 'Start this firm'}
                </button>
              </div>
              <ol className="prop-flow">
                {PROP_FLOW.map((step) => (
                  <li key={step.k}>
                    <b>{step.k}</b>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </li>
                ))}
              </ol>
            </article>
            <ul className="land-built reveal">
              {TEMPLATES.filter((item) => item.id !== 'propfirm').map((item) => (
                <li key={item.id}>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void open(item.id)}>
                    <code>{item.rails}</code>
                    <div>
                      <h3>{busy === item.id ? 'Opening…' : item.name}</h3>
                      <p>{item.line}</p>
                    </div>
                    <span className="land-pill">{item.id === 'blank' ? 'Blank' : 'Ready'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {note ? <p className="land-note">{note}</p> : null}
          </div>
        </section>

        <section className="land-sec" id="rails">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">On Arbitrum</p>
              <h2>It executes on Sendra.</h2>
              <p>The published page does not invent a chain. Each module calls one of these contracts.</p>
            </div>
            <ul className="land-rails reveal">
              {RAILS.map((rail) => (
                <li key={rail.name}>
                  <small>{rail.contract}</small>
                  <h3>{rail.name}</h3>
                  <code>{shortAddr(rail.address)}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="land-sec" id="use">
          <div className="land-wrap">
            <div className="land-sec-head reveal">
              <p className="land-kicker">How it works</p>
              <h2>Four moves. Then a link.</h2>
            </div>
            <ol className="land-steps reveal">
              {STEPS.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="land-cta">
          <div className="land-wrap reveal">
            <h2>
              Two ways <em>in.</em>
            </h2>
            <p>Create the protocol and manage the company. Or build the desk and use it as your financial app.</p>
            <div className="land-actions">
              <Link to="/crear/nuevo" className="land-go land-go-big">
                Create protocol
              </Link>
              <button type="button" className="land-ghost" disabled={Boolean(busy)} onClick={() => void open('terminal')}>
                {busy === 'terminal' ? 'Opening…' : 'Build my desk'}
              </button>
              <ProtocolsMenu placement="down" />
            </div>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <div className="land-wrap">
          <Link to="/" className="land-mark">
            <b aria-hidden="true" />
            Sendra Studio
          </Link>
          <span>Execution · Accounting · Calendar · Pulse · Pairs · Aave · Liquidity · Enclaves</span>
        </div>
      </footer>
    </div>
  );
}
