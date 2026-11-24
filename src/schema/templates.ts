import { uid } from '@/lib/uid';
import { flow } from '@/schema/layout';
import {
  DEFAULT_THEME,
  PRESETS,
  createBlock,
  makePage,
  type AaveBlock,
  type Block,
  type DashboardBlock,
  type MultiBlock,
  type ButtonBlock,
  type EnclaveBlock,
  type HeroBlock,
  type LiquidityBlock,
  type CalendarBlock,
  type MetricBlock,
  type PairsBlock,
  type PulseBlock,
  type ProtocolDocument,
  type SpotBookBlock,
  type StudioPage,
  type TerminalBlock,
  type TextBlock,
  type Theme,
  type WalletBlock,
} from '@/schema/protocol';

export const TEMPLATE_IDS = ['propfirm', 'blank', 'desk', 'spot', 'aave', 'liquidity', 'enclave', 'terminal'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATES: { id: TemplateId; name: string; line: string; rails: string }[] = [
  { id: 'propfirm', name: 'Prop firm', line: 'Price the accounts, design the test, fund an enclave, and keep a cut of profits and volume.', rails: 'Firm' },
  { id: 'blank', name: 'Blank', line: 'One empty page.', rails: 'Empty' },
  { id: 'desk', name: 'Company', line: 'Execution on one selector. Accounting on the next page.', rails: 'Two pages' },
  { id: 'spot', name: 'Spot desk', line: 'A chart, a ticket, and the spot book you sell from.', rails: 'Spot' },
  { id: 'aave', name: 'Aave yield', line: 'Supply into a lending cell.', rails: 'Aave' },
  { id: 'liquidity', name: 'Liquidity', line: 'Uniswap on the same account as spot.', rails: 'LP' },
  { id: 'enclave', name: 'Credit enclave', line: 'The visitor creates the enclave on-chain.', rails: 'Enclave' },
  { id: 'terminal', name: 'Terminal', line: 'Landing plus every Sendra desk.', rails: 'All four' },
];

function theme(preset: keyof typeof PRESETS, patch: Partial<Theme>): Theme {
  return { ...DEFAULT_THEME, ...PRESETS[preset], preset, ...patch };
}

function meta(title: string, template: TemplateId) {
  return {
    id: uid('snd'),
    title,
    titleTouched: true,
    slug: '',
    status: 'draft' as const,
    template,
    updatedAt: new Date().toISOString(),
  };
}

function cover(kicker: string, title: string, body: string) {
  const block = as<HeroBlock>(createBlock('hero'), 'hero');
  block.kicker = kicker;
  block.title = title;
  block.body = body;
  return block;
}

function metric(label: string, value: string, hint: string, span = 2) {
  const block = as<MetricBlock>(createBlock('metric'), 'metric');
  block.label = label;
  block.value = value;
  block.hint = hint;
  if (span === 2) return block;
  return { ...block, frame: { col: 1, span, row: 1, rows: 2 } };
}

function prose(kicker: string, title: string, body: string) {
  const block = as<TextBlock>(createBlock('text'), 'text');
  block.kicker = kicker;
  block.title = title;
  block.body = body;
  return block;
}

function jump(label: string, path: string, span = 2): Block {
  const block = as<ButtonBlock>(createBlock('button'), 'button');
  block.label = label;
  block.action = { kind: 'link', href: path };
  return { ...block, frame: { col: 1, span, row: 1, rows: 2 } };
}

function canvas(name: string, path: string, blocks: Block[]): StudioPage {
  return makePage('canvas', name, path, flow(blocks));
}

function appPages(which: TemplateId): StudioPage[] {
  const terminal = as<TerminalBlock>(createBlock('terminal'), 'terminal');
  const book = as<SpotBookBlock>(createBlock('spotbook'), 'spotbook');
  if (which === 'spot') {
    terminal.asset = 'BTC';
    terminal.amount = '100';
  }
  const enclave = as<EnclaveBlock>(createBlock('enclave'), 'enclave');
  if (which === 'enclave') enclave.description = 'Enclave published from Sendra Studio';
  const wallet = () => as<WalletBlock>(createBlock('wallet'), 'wallet');
  return [
    canvas('Home', 'home', [
      cover('Sendra', 'Home', 'The desk. Each card opens a route in this protocol.'),
      wallet(),
      jump('Spot', 'spot'),
      jump('Pairs', 'pairs'),
      jump('Strategy', 'strategy'),
      jump('Liquidity', 'liquidity'),
      jump('Enclaves', 'enclaves'),
      jump('Portfolio', 'portfolio'),
      jump('Calendar', 'calendar'),
      jump('Pulse', 'pulse'),
    ]),
    canvas('Spot', 'spot', [
      cover('Trade', 'Spot', 'Buy and sell against USDC inside the Sendra account.'),
      wallet(),
      { ...terminal, frame: { col: 1, span: 7, row: 1, rows: 8 } },
      { ...book, frame: { col: 1, span: 7, row: 1, rows: 7 } },
    ]),
    canvas('Pairs', 'pairs', [
      cover('Trade', 'Pairs', 'Long one leg, short the other. The spread is the position.'),
      wallet(),
      as<PairsBlock>(createBlock('pairs'), 'pairs'),
    ]),
    canvas('Strategy', 'strategy', [
      cover('Earn', 'Strategy', 'Supply into an Aave cell. The record stays on Sendra.'),
      wallet(),
      as<AaveBlock>(createBlock('aave'), 'aave'),
    ]),
    canvas('Liquidity', 'liquidity', [
      cover('Earn', 'Liquidity', 'Uniswap liquidity in the same account as spot.'),
      wallet(),
      as<LiquidityBlock>(createBlock('liquidity'), 'liquidity'),
    ]),
    canvas('Enclaves', 'enclaves', [
      cover('Earn', 'Enclaves', 'Create an offer, see yours, take one from the book, then manage it.'),
      wallet(),
      enclave,
      createBlock('enclaveMine'),
      createBlock('enclaveOffers'),
      createBlock('enclaveManage'),
      createBlock('enclavePortfolio'),
    ]),
    canvas('Calendar', 'calendar', [
      cover('Account', 'Calendar', 'Opens and closes, painted on the day they happened.'),
      wallet(),
      as<CalendarBlock>(createBlock('calendar'), 'calendar'),
    ]),
    canvas('Pulse', 'pulse', [
      cover('Account', 'Pulse', 'Reputation written in SendraStorage. The portfolio reads the same book.'),
      wallet(),
      as<PulseBlock>(createBlock('pulse'), 'pulse'),
      jump('Open portfolio', 'portfolio', 3),
    ]),
    canvas('Portfolio', 'portfolio', [{ ...createBlock('portfolio'), frame: { col: 1, span: 7, row: 1, rows: 8 } }]),
  ];
}

function publish(title: string, template: TemplateId, look: Theme, landing: Block[]): ProtocolDocument {
  return {
    schemaVersion: 1,
    kind: 'sendra',
    meta: meta(title, template),
    theme: { ...look, width: 100 },
    pages: [canvas('Landing', '', [...landing, jump('Open the desk', 'home', 3)]), ...appPages(template)],
  };
}

function as<T extends Block>(block: Block, type: T['type']): T {
  if (block.type !== type) throw new Error('Unexpected block');
  return block as T;
}

export function createProtocol(which: TemplateId): ProtocolDocument {
  if (which === 'blank') {
    return {
      schemaVersion: 1,
      kind: 'sendra',
      meta: { ...meta('Untitled protocol', 'blank'), titleTouched: false },
      theme: theme('acid', { background: 'void', font: 'manrope' }),
      pages: [makePage('canvas', 'Page', '', [])],
    };
  }

  if (which === 'propfirm') {
    const hero = as<HeroBlock>(createBlock('hero'), 'hero');
    hero.kicker = 'Prop firm · Arbitrum';
    hero.title = 'Get funded.';
    hero.body = 'One link for traders. You price the account, write the test, and keep a cut of profits and volume.';
    const funded = as<EnclaveBlock>(createBlock('enclave'), 'enclave');
    funded.title = 'Funded capital';
    funded.capital = '100000';
    funded.minTx = '250';
    funded.maxTx = '5000';
    funded.days = 30;
    funded.feePct = 80;
    funded.openOperator = true;
    funded.description = 'The lender keeps 20% of profits. The operator trades inside the ticket size and the 30-day window.';
    funded.button = 'Deposit capital';
    funded.hint = 'Your USDC stays in the enclave. The trader operates it under these rules.';
    const test = as<TerminalBlock>(createBlock('terminal'), 'terminal');
    test.title = 'Evaluation';
    test.amount = '1000';
    const wallet = () => as<WalletBlock>(createBlock('wallet'), 'wallet');
    return {
      schemaVersion: 1,
      kind: 'sendra',
      meta: meta('Prop firm', 'propfirm'),
      theme: theme('acid', { font: 'syne', background: 'carbon', button: 'solid', radius: 18 }),
      pages: [
        canvas('Firm', '', [
          hero,
          metric('Account', '$149', 'What a trader pays to sit the test.', 3),
          metric('Capital', '$100,000', 'The funded book, held in the enclave.', 3),
          metric('Profits', '20%', 'Your share. The operator keeps 80%.', 3),
          metric('Volume', 'Builder fee', 'A cut of the flow they trade.', 3),
          prose('The offer', 'Traders arrive here.', 'Publish this page. The price, the test, and the capital are the firm.'),
          wallet(),
          jump('Price the accounts', 'accounts', 3),
          jump('Open the test', 'challenge', 3),
        ]),
        canvas('Accounts', 'accounts', [
          cover('Pricing', 'Price the accounts', 'The number on the door. Capital never leaves the enclave.'),
          metric('Evaluation', '$149', 'One attempt at the test.'),
          metric('Funded size', '$100,000', 'What they manage if they pass.'),
          metric('Reset', '$79', 'A new attempt, same rules.'),
          prose('Your price', 'Change the numbers.', 'These are the account prices traders see. Edit them before you publish.'),
          jump('Design the test', 'challenge', 3),
        ]),
        canvas('Challenge', 'challenge', [
          cover('Evaluation', 'Design the test', 'Target, drawdown, and the window. The desk below is where they take it.'),
          prose('The rules', '8% target. 5% max loss. 30 days.', 'Rewrite the test. Passing it is what opens the enclave.'),
          test,
          jump('Fund the capital', 'capital', 3),
        ]),
        canvas('Capital', 'capital', [
          cover('Enclave', 'Deposit. They manage.', 'You fund the enclave. The trader operates inside the limits and the split you set.'),
          wallet(),
          funded,
          createBlock('enclaveManage'),
          createBlock('enclavePortfolio'),
        ]),
      ],
    };
  }

  if (which === 'spot') {
    const hero = as<HeroBlock>(createBlock('hero'), 'hero');
    hero.kicker = 'Spot · Arbitrum';
    hero.title = 'BTC desk';
    hero.body = 'Buy and sell against USDC inside a Sendra account.';
    return publish('BTC desk', 'spot', theme('acid', { font: 'space', background: 'grid', button: 'sharp', radius: 2 }), [hero]);
  }

  if (which === 'aave') {
    const hero = as<HeroBlock>(createBlock('hero'), 'hero');
    hero.kicker = 'Aave · Lending';
    hero.title = 'Yield USDC';
    hero.body = 'USDC goes into a lending cell. The record stays on Sendra.';
    return publish('Yield USDC', 'aave', theme('tide', { font: 'ibm', background: 'aurora', button: 'pill' }), [hero]);
  }

  if (which === 'liquidity') {
    const hero = as<HeroBlock>(createBlock('hero'), 'hero');
    hero.kicker = 'Uniswap · Sendra account';
    hero.title = 'ETH / USDC pool';
    hero.body = 'Liquidity opens in the same account as spot.';
    return publish('ETH / USDC pool', 'liquidity', theme('frost', { font: 'manrope', background: 'mesh', input: 'outline' }), [hero]);
  }

  if (which === 'desk') {
    const execution = as<MultiBlock>(createBlock('multi'), 'multi');
    execution.title = 'Execution';
    execution.active = 0;
    execution.items = [createBlock('multi', 'aave'), as<LiquidityBlock>(createBlock('liquidity'), 'liquidity'), as<TerminalBlock>(createBlock('terminal'), 'terminal')];
    const dashboard = as<DashboardBlock>(createBlock('dashboard'), 'dashboard');
    const book = createBlock('portfolio');
    const pulse = as<PulseBlock>(createBlock('pulse'), 'pulse');
    const calendar = as<CalendarBlock>(createBlock('calendar'), 'calendar');
    return {
      schemaVersion: 1,
      kind: 'sendra',
      meta: meta('New company', 'desk'),
      theme: theme('acid', { font: 'manrope', background: 'aurora', button: 'pill', radius: 18 }),
      pages: [
        canvas('Execution', '', [{ ...execution, frame: { col: 1, span: 7, row: 1, rows: 12 } }]),
        canvas('Accounting', 'accounting', [
          { ...dashboard, frame: { col: 1, span: 7, row: 1, rows: 5 } },
          { ...book, frame: { col: 1, span: 4, row: 1, rows: 8 } },
          { ...pulse, frame: { col: 5, span: 3, row: 1, rows: 8 } },
          { ...calendar, frame: { col: 1, span: 7, row: 1, rows: 10 } },
        ]),
      ],
    };
  }

  if (which === 'enclave') {
    const hero = as<HeroBlock>(createBlock('hero'), 'hero');
    hero.kicker = 'Credit enclaves';
    hero.title = 'Open enclave';
    hero.body = 'Capital, limits, and duration. Whoever opens it creates it on-chain.';
    return publish('Open enclave', 'enclave', theme('signal', { font: 'fraunces', background: 'void', button: 'solid', radius: 22 }), [hero]);
  }

  const hero = as<HeroBlock>(createBlock('hero'), 'hero');
  hero.kicker = 'Terminal';
  hero.title = 'Four rails';
  hero.body = 'Spot, strategy, liquidity, and enclaves. One desk, one link per route.';
  const net = as<MetricBlock>(createBlock('metric'), 'metric');
  net.label = 'Network';
  net.value = 'Arbitrum';
  net.hint = 'Sendra execution';
  const book = as<MetricBlock>(createBlock('metric'), 'metric');
  book.label = 'Record';
  book.value = 'One account';
  book.hint = 'Spot and LP share an account. Aave opens a cell.';
  const note = as<TextBlock>(createBlock('text'), 'text');
  note.kicker = 'How it signs';
  note.title = 'The visitor’s wallet';
  note.body = 'USDC on Aave and the enclave go out directly. Spot and liquidity need the Transaction Builder for the route.';
  return publish('Four rails', 'terminal', theme('acid', { font: 'syne', background: 'carbon', button: 'solid', radius: 16 }), [
    hero,
    net,
    book,
    note,
  ]);
}
