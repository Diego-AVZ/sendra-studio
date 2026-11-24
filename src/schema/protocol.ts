import { uid } from '@/lib/uid';

export const SCHEMA_VERSION = 1 as const;

export const FONTS = [
  { id: 'manrope', name: 'Manrope' },
  { id: 'fraunces', name: 'Fraunces' },
  { id: 'space', name: 'Space Grotesk' },
  { id: 'ibm', name: 'IBM Plex' },
  { id: 'syne', name: 'Syne' },
] as const;

export const BACKGROUNDS = [
  { id: 'void', name: 'Void' },
  { id: 'grid', name: 'Grid' },
  { id: 'mesh', name: 'Mesh' },
  { id: 'paper', name: 'Paper' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'carbon', name: 'Carbon' },
] as const;

export const BUTTONS = [
  { id: 'solid', name: 'Solid' },
  { id: 'ghost', name: 'Outline' },
  { id: 'pill', name: 'Pill' },
  { id: 'sharp', name: 'Sharp' },
] as const;

export const WALLET_LOOKS = [
  { id: 'card', name: 'Card' },
  { id: 'button', name: 'Button' },
  { id: 'account', name: 'Address' },
  { id: 'hover', name: 'Hover' },
] as const;

export const INPUTS = [
  { id: 'line', name: 'Line' },
  { id: 'filled', name: 'Filled' },
  { id: 'outline', name: 'Box' },
] as const;

export const SPOT_ASSETS = ['BTC', 'ETH', 'AAVE', 'LINK', 'UNI'] as const;
export const CHART_INTERVALS = ['15m', '1h', '4h', '1d'] as const;
export const PAIR_COINS = ['BTC', 'ETH', 'SOL', 'HYPE', 'DOGE', 'XRP', 'AVAX', 'LINK', 'UNI', 'AAVE', 'BNB', 'ARB'] as const;
export const PAIR_RISKS = ['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const;
export const PAIR_PANELS = ['strategies', 'stats', 'charts', 'backtest'] as const;
export const PAIR_STATS = ['ratio', 'z', 'correlation', 'beta', 'halfLife', 'spread'] as const;
export const PAIR_VIEWS = ['legs', 'ratio', 'performance'] as const;
export const AAVE_ASSETS = ['USDC', 'BTC', 'ETH', 'LINK', 'AAVE'] as const;
export const AAVE_STRATEGIES = [
  { id: 'supply', name: 'Supply', button: 'Supply USDC', hint: 'USDC goes straight into the cell. Other assets need the Sendra route.' },
  { id: 'loop', name: 'Loop', button: 'Open loop', hint: 'Supply, borrow the same asset, and supply again. Loops set the leverage.' },
  { id: 'short', name: 'Short', button: 'Open short', hint: 'Collateral stays supplied. The short leg is borrowed against it.' },
  { id: 'lp', name: 'LP', button: 'Open Aave LP', hint: 'Liquidity is opened from the lending cell.' },
  { id: 'basket', name: 'Basket', button: 'Supply basket', hint: 'One USDC amount, split across the assets you leave on.' },
] as const;
export const MULTI_CAP = 5;
export const MENU_CAP = 8;
export const PAIRS = ['ETH/USDC', 'BTC/USDC', 'LINK/USDC', 'UNI/USDC'] as const;
export const FEES = [500, 3000, 10000] as const;

export type FontId = (typeof FONTS)[number]['id'];
export type BackgroundId = (typeof BACKGROUNDS)[number]['id'];
export type ButtonStyle = (typeof BUTTONS)[number]['id'];
export type InputStyle = (typeof INPUTS)[number]['id'];
export type SpotAsset = (typeof SPOT_ASSETS)[number];
export type ChartInterval = (typeof CHART_INTERVALS)[number];
export type PairCoin = (typeof PAIR_COINS)[number];
export type PairRisk = (typeof PAIR_RISKS)[number];
export type PairPanel = (typeof PAIR_PANELS)[number];
export type PairStat = (typeof PAIR_STATS)[number];
export type PairView = (typeof PAIR_VIEWS)[number];
export type AaveAsset = (typeof AAVE_ASSETS)[number];
export type AaveStrategy = (typeof AAVE_STRATEGIES)[number]['id'];
export type PairId = (typeof PAIRS)[number];
export type FeeTier = (typeof FEES)[number];

export type PresetId = 'acid' | 'tide' | 'frost' | 'signal' | 'linen' | 'chalk';

export const PRESETS: Record<PresetId, { ink: string; paper: string; accent: string; accentInk: string; muted: string }> = {
  acid: { ink: '#f4f4f5', paper: '#09090b', accent: '#d6ff4a', accentInk: '#141414', muted: '#a1a1aa' },
  tide: { ink: '#e7f6f2', paper: '#071614', accent: '#3dffe2', accentInk: '#06211d', muted: '#8fb8b0' },
  frost: { ink: '#eef2ff', paper: '#0b1020', accent: '#9db6ff', accentInk: '#101426', muted: '#a5b0d0' },
  signal: { ink: '#fff5f7', paper: '#14060c', accent: '#ff4d6d', accentInk: '#1a0a10', muted: '#e7b3bf' },
  linen: { ink: '#1b1612', paper: '#f3eee6', accent: '#8a6232', accentInk: '#fff8ef', muted: '#7a6d60' },
  chalk: { ink: '#161616', paper: '#f7f7f5', accent: '#111111', accentInk: '#f7f7f5', muted: '#6b6b66' },
};

export const PRESET_LIST: { id: PresetId; name: string }[] = [
  { id: 'acid', name: 'Acid' },
  { id: 'tide', name: 'Tide' },
  { id: 'frost', name: 'Frost' },
  { id: 'signal', name: 'Signal' },
  { id: 'linen', name: 'Linen' },
  { id: 'chalk', name: 'Chalk' },
];

export type Theme = {
  font: FontId;
  background: BackgroundId;
  preset: PresetId | 'custom';
  ink: string;
  paper: string;
  accent: string;
  accentInk: string;
  muted: string;
  radius: number;
  button: ButtonStyle;
  input: InputStyle;
  width: number;
  credit: boolean;
};

export const WIDTHS = [
  { id: 48, name: 'Narrow' },
  { id: 72, name: 'Medium' },
  { id: 100, name: 'Wide' },
] as const;

export function pageWidth(value: unknown) {
  if (value === 'narrow') return 48;
  if (value === 'wide') return 100;
  const width = typeof value === 'number' && Number.isFinite(value) ? value : 100;
  return Math.max(36, Math.min(100, Math.round(width)));
}

export const DEFAULT_THEME: Theme = {
  font: 'manrope',
  background: 'mesh',
  preset: 'acid',
  radius: 18,
  button: 'solid',
  input: 'filled',
  width: 100,
  credit: true,
  ...PRESETS.acid,
};

export type SpotAction = { kind: 'spot'; asset: SpotAsset; side: 'buy' | 'sell'; amount: string; amountKey: string };
export type AaveAction = { kind: 'aave'; asset: AaveAsset; amount: string; amountKey: string };
export type LiquidityAction = { kind: 'liquidity'; pair: PairId; fee: FeeTier; amount: string; amountKey: string };
export type Action =
  | { kind: 'none' }
  | { kind: 'link'; href: string }
  | { kind: 'wallet' }
  | SpotAction
  | AaveAction
  | LiquidityAction
  | { kind: 'enclave' };

export type Frame = { col: number; span: number; row: number; rows: number };

export type HeroBlock = { id: string; type: 'hero'; kicker: string; title: string; body: string };
export type TextBlock = { id: string; type: 'text'; kicker: string; title: string; body: string };
export type MetricBlock = { id: string; type: 'metric'; label: string; value: string; hint: string };
export type FieldBlock = { id: string; type: 'field'; label: string; placeholder: string; key: string; input: InputStyle | 'theme' };
export type ButtonBlock = { id: string; type: 'button'; label: string; style: ButtonStyle | 'theme'; action: Action };
export type MenuItem = { id: string; label: string; href: string };
export type MenuBlock = { id: string; type: 'menu'; label: string; items: MenuItem[] };
export type WalletLook = (typeof WALLET_LOOKS)[number]['id'];
export type WalletBlock = { id: string; type: 'wallet'; label: string; look: WalletLook };
export type BalanceAsset = 'ETH' | 'USDC';
export type BalanceBlock = { id: string; type: 'balance'; asset: BalanceAsset; label: string };
export type SpacerBlock = { id: string; type: 'spacer'; size: 's' | 'm' | 'l' };
export type SpotBlock = {
  id: string;
  type: 'spot';
  title: string;
  hint: string;
  asset: SpotAsset;
  side: 'buy' | 'sell';
  amount: string;
  button: string;
};
export type TerminalBlock = {
  id: string;
  type: 'terminal';
  title: string;
  assets: SpotAsset[];
  asset: SpotAsset;
  sides: 'both' | 'buy' | 'sell';
  amount: string;
  chart: boolean;
  ticket: boolean;
  layout: 'side' | 'stack';
  interval: ChartInterval;
};
export type SpotBookBlock = {
  id: string;
  type: 'spotbook';
  title: string;
  assets: SpotAsset[];
  status: 'active' | 'all' | 'closed';
  sell: boolean;
};
export type PairsBlock = {
  id: string;
  type: 'pairs';
  title: string;
  limit: number;
  sort: 'apr' | 'win';
  risk: PairRisk;
  openOn: 'best' | 'fixed';
  long: PairCoin;
  short: PairCoin;
  panels: PairPanel[];
  stats: PairStat[];
  views: PairView[];
  interval: ChartInterval;
  layout: 'side' | 'stack';
};
export type AaveBlock = {
  id: string;
  type: 'aave';
  strategy: AaveStrategy;
  title: string;
  hint: string;
  asset: AaveAsset;
  amount: string;
  button: string;
  loops: number;
  short: AaveAsset;
  assets: AaveAsset[];
  pair: PairId;
  fee: FeeTier;
};
export type MultiBlock = {
  id: string;
  type: 'multi';
  title: string;
  active: number;
  items: Block[];
};
export type DashboardBlock = { id: string; type: 'dashboard'; title: string };
export type LiquidityBlock = {
  id: string;
  type: 'liquidity';
  title: string;
  hint: string;
  pair: PairId;
  fee: FeeTier;
  amount: string;
  button: string;
  lowPct: number;
  highPct: number;
};
export type PortfolioBlock = { id: string; type: 'portfolio' };
export type CalendarBlock = { id: string; type: 'calendar'; title: string };
export type PulseBlock = { id: string; type: 'pulse'; title: string };
export type LogoBlock = { id: string; type: 'logo'; src: string; alt: string };
export type EnclaveBlock = {
  id: string;
  type: 'enclave';
  title: string;
  hint: string;
  capital: string;
  minTx: string;
  maxTx: string;
  days: number;
  feePct: number;
  operator: string;
  openOperator: boolean;
  description: string;
  button: string;
};
export type EnclaveMineBlock = { id: string; type: 'enclaveMine'; title: string };
export type EnclaveOffersBlock = { id: string; type: 'enclaveOffers'; title: string };
export type EnclaveManageBlock = { id: string; type: 'enclaveManage'; title: string };
export type EnclavePortfolioBlock = { id: string; type: 'enclavePortfolio'; title: string };

export type Block = (
  | HeroBlock
  | TextBlock
  | MetricBlock
  | FieldBlock
  | ButtonBlock
  | MenuBlock
  | WalletBlock
  | BalanceBlock
  | SpacerBlock
  | SpotBlock
  | TerminalBlock
  | SpotBookBlock
  | PairsBlock
  | AaveBlock
  | MultiBlock
  | DashboardBlock
  | LiquidityBlock
  | EnclaveBlock
  | EnclaveMineBlock
  | EnclaveOffersBlock
  | EnclaveManageBlock
  | EnclavePortfolioBlock
  | PortfolioBlock
  | CalendarBlock
  | PulseBlock
  | LogoBlock
) & { frame?: Frame; pad?: number };

export const PAD_MAX = 48;

const PAD_BASE: Partial<Record<BlockType, number>> = {
  hero: 16,
  text: 12,
  metric: 16,
  field: 8,
  button: 12,
  menu: 12,
  wallet: 16,
  balance: 16,
  spot: 16,
  aave: 16,
  multi: 10,
};

export function blockPad(block: { type: BlockType; pad?: number }) {
  const raw = typeof block.pad === 'number' && Number.isFinite(block.pad) ? block.pad : (PAD_BASE[block.type] ?? 0);
  return Math.max(0, Math.min(PAD_MAX, Math.round(raw)));
}

export type PageKind = 'canvas' | 'html' | 'portfolio';

export type SurfaceId = 'desktop' | 'mobile';

export type PageLayout = {
  blocks: Block[];
  html: string;
};

export type StudioPage = {
  id: string;
  name: string;
  path: string;
  kind: PageKind;
  blocks: Block[];
  html: string;
  mobile?: PageLayout;
};

export function layoutOf(page: StudioPage, surface: SurfaceId, inherit = false): PageLayout {
  if (surface === 'mobile') {
    if (page.mobile) return page.mobile;
    if (inherit) return { blocks: page.blocks, html: page.html };
    return { blocks: [], html: '' };
  }
  return { blocks: page.blocks, html: page.html };
}

export function presentSurface(page: StudioPage, surface: SurfaceId): StudioPage {
  const layout = layoutOf(page, surface);
  return { ...page, blocks: layout.blocks, html: layout.html };
}

export function applySurface(page: StudioPage, surface: SurfaceId, recipe: (current: StudioPage) => StudioPage): StudioPage {
  const next = recipe(presentSurface(page, surface));
  const shared = { name: next.name, path: next.path, kind: next.kind };
  if (surface === 'desktop') return { ...page, ...shared, blocks: next.blocks, html: next.html };
  return { ...page, ...shared, mobile: { blocks: next.blocks, html: next.html } };
}

export function cloneBlock(block: Block): Block {
  if (block.type === 'multi') return { ...structuredClone(block), id: uid('block'), items: block.items.map(cloneBlock) };
  if (block.type === 'menu') return { ...structuredClone(block), id: uid('block'), items: block.items.map((item) => ({ ...item, id: uid('item') })) };
  return { ...structuredClone(block), id: uid('block') };
}

export function mapBlock(block: Block, id: string, recipe: (block: Block) => Block): Block {
  if (block.id === id) return recipe(block);
  if (block.type !== 'multi') return block;
  let changed = false;
  const items = block.items.map((item) => {
    const next = mapBlock(item, id, recipe);
    if (next !== item) changed = true;
    return next;
  });
  return changed ? { ...block, items } : block;
}

export function cloneLayout(layout: PageLayout): PageLayout {
  return { html: layout.html, blocks: layout.blocks.map(cloneBlock) };
}

export const HTML_STARTER = `<section style="padding:72px 28px;max-width:760px;margin:auto">
  <p style="letter-spacing:.22em;text-transform:uppercase;font-size:12px">Sendra</p>
  <h1 style="font-size:68px;line-height:.9;margin:16px 0">Your landing.</h1>
  <p style="font-size:18px;line-height:1.5;max-width:36rem">Replace this HTML. It is what visitors see on this route.</p>
</section>`;

export type BlockType = Block['type'];

export type ProtocolMeta = {
  id: string;
  title: string;
  titleTouched: boolean;
  slug: string;
  status: 'draft' | 'published';
  template: string;
  updatedAt: string;
  publishedAt?: string;
};

export type ProtocolDocument = {
  schemaVersion: typeof SCHEMA_VERSION;
  kind: 'sendra';
  meta: ProtocolMeta;
  theme: Theme;
  pages: StudioPage[];
};

export const PALETTE: { id: string; group: 'Structure' | 'Controls' | 'Execution'; type: BlockType; name: string; line: string; variant?: string }[] = [
  { id: 'hero', group: 'Structure', type: 'hero', name: 'Cover', line: 'A title and a line.' },
  { id: 'text', group: 'Structure', type: 'text', name: 'Text', line: 'A reading block.' },
  { id: 'metric', group: 'Structure', type: 'metric', name: 'Figure', line: 'A number and its label.' },
  { id: 'logo', group: 'Structure', type: 'logo', name: 'Logo', line: 'An image from your files.' },
  { id: 'spacer', group: 'Structure', type: 'spacer', name: 'Space', line: 'Separation.' },
  { id: 'multi', group: 'Structure', type: 'multi', name: 'Multi', line: 'Up to five modules. The selector switches which one is open.' },
  { id: 'field', group: 'Controls', type: 'field', name: 'Field', line: 'An input with a key.' },
  { id: 'button', group: 'Controls', type: 'button', name: 'Button', line: 'Fires an action.' },
  { id: 'menu', group: 'Controls', type: 'menu', name: 'Menu', line: 'A button that opens links to your pages.' },
  { id: 'wallet', group: 'Controls', type: 'wallet', name: 'Wallet', line: 'Connect on Arbitrum.' },
  { id: 'wallet-button', group: 'Controls', type: 'wallet', variant: 'button', name: 'Wallet button', line: 'Only the connect button.' },
  { id: 'wallet-account', group: 'Controls', type: 'wallet', variant: 'account', name: 'Wallet address', line: 'The connected wallet sits inside the button.' },
  { id: 'wallet-hover', group: 'Controls', type: 'wallet', variant: 'hover', name: 'Wallet hover', line: 'Hover the address to disconnect.' },
  { id: 'balance-eth', group: 'Controls', type: 'balance', variant: 'ETH', name: 'ETH balance', line: 'ETH held by the connected wallet on Arbitrum.' },
  { id: 'balance-usdc', group: 'Controls', type: 'balance', variant: 'USDC', name: 'USDC balance', line: 'USDC held by the connected wallet on Arbitrum.' },
  { id: 'dashboard', group: 'Controls', type: 'dashboard', name: 'Dashboard', line: 'Value, PnL, capital, and the mix of the open book.' },
  { id: 'portfolio', group: 'Controls', type: 'portfolio', name: 'Portfolio', line: 'The Sendra book. It fits the box you give it.' },
  { id: 'calendar', group: 'Controls', type: 'calendar', name: 'Calendar', line: 'Positions painted on the days they open and close.' },
  { id: 'pulse', group: 'Controls', type: 'pulse', name: 'Pulse', line: 'Reputation: tier, score, and the five factors.' },
  { id: 'terminal', group: 'Execution', type: 'terminal', name: 'Terminal', line: 'Chart, price, and a spot ticket. Pick the markets.' },
  { id: 'spotbook', group: 'Execution', type: 'spotbook', name: 'Spot portfolio', line: 'Only spot positions. Sell from the row.' },
  { id: 'pairs', group: 'Execution', type: 'pairs', name: 'Pairs', line: 'Market-neutral desk. You choose the pieces.' },
  { id: 'spot', group: 'Execution', type: 'spot', name: 'Spot', line: 'One order against USDC.' },
  { id: 'aave-desk', group: 'Execution', type: 'multi', variant: 'aave', name: 'Aave', line: 'Supply, loop, short, LP, and basket. One selector.' },
  { id: 'aave-supply', group: 'Execution', type: 'aave', variant: 'supply', name: 'Aave supply', line: 'Supply one asset into the lending cell.' },
  { id: 'aave-loop', group: 'Execution', type: 'aave', variant: 'loop', name: 'Aave loop', line: 'Supply and borrow the same asset, again.' },
  { id: 'aave-short', group: 'Execution', type: 'aave', variant: 'short', name: 'Aave short', line: 'Borrow the short leg against collateral.' },
  { id: 'aave-lp', group: 'Execution', type: 'aave', variant: 'lp', name: 'Aave LP', line: 'Liquidity opened from the lending cell.' },
  { id: 'aave-basket', group: 'Execution', type: 'aave', variant: 'basket', name: 'Aave basket', line: 'One amount, split across several assets.' },
  { id: 'liquidity', group: 'Execution', type: 'liquidity', name: 'Liquidity', line: 'LP in the Sendra account.' },
  { id: 'enclave', group: 'Execution', type: 'enclave', name: 'Create enclave', line: 'The v3 capital offer: amount, window, split, then the factory.' },
  { id: 'enclaveMine', group: 'Execution', type: 'enclaveMine', name: 'My enclaves', line: 'Enclaves you lend or operate. A row selects the active one.' },
  { id: 'enclaveOffers', group: 'Execution', type: 'enclaveOffers', name: 'Offers', line: 'Open capital offers. Accepting makes you the operator.' },
  { id: 'enclaveManage', group: 'Execution', type: 'enclaveManage', name: 'Manage enclave', line: 'Deposit, pause, finalize, cancel, or revoke the selected enclave.' },
  { id: 'enclavePortfolio', group: 'Execution', type: 'enclavePortfolio', name: 'Enclave portfolio', line: 'Positions that belong to the selected enclave.' },
];

export function blockName(type: BlockType) {
  return PALETTE.find((item) => item.type === type && !item.variant)?.name ?? PALETTE.find((item) => item.type === type)?.name ?? type;
}

export function labelOf(block: Block) {
  if (block.type === 'aave') return AAVE_STRATEGIES.find((item) => item.id === block.strategy)?.name ?? 'Aave';
  if (block.type === 'balance') return block.label.trim() || block.asset;
  if ('title' in block && block.title.trim()) return block.title.trim();
  return blockName(block.type);
}

export function inkFor(hex: string) {
  const raw = hex.replace('#', '');
  if (raw.length < 6) return '#141414';
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#141414';
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#141414' : '#f6f6f6';
}

export function defaultAction(kind: Action['kind']): Action {
  switch (kind) {
    case 'link':
      return { kind: 'link', href: '' };
    case 'wallet':
      return { kind: 'wallet' };
    case 'spot':
      return { kind: 'spot', asset: 'BTC', side: 'buy', amount: '100', amountKey: '' };
    case 'aave':
      return { kind: 'aave', asset: 'USDC', amount: '100', amountKey: '' };
    case 'liquidity':
      return { kind: 'liquidity', pair: 'ETH/USDC', fee: 3000, amount: '100', amountKey: '' };
    case 'enclave':
      return { kind: 'enclave' };
    default:
      return { kind: 'none' };
  }
}

function aaveStrategy(value: unknown): AaveStrategy {
  return oneOf(value, AAVE_STRATEGIES.map((item) => item.id), 'supply');
}

function aaveAssets(value: unknown): AaveAsset[] {
  if (!Array.isArray(value)) return ['USDC', 'ETH', 'BTC'];
  const picked = AAVE_ASSETS.filter((asset) => value.includes(asset));
  return picked.length ? [...picked] : ['USDC'];
}

function aaveBlock(id: string, strategy: AaveStrategy): AaveBlock {
  const meta = AAVE_STRATEGIES.find((item) => item.id === strategy) ?? AAVE_STRATEGIES[0];
  return {
    id,
    type: 'aave',
    strategy: meta.id,
    title: `Aave ${meta.name.toLowerCase()}`,
    hint: meta.hint,
    asset: 'USDC',
    amount: '100',
    button: meta.button,
    loops: 2,
    short: 'ETH',
    assets: ['USDC', 'ETH', 'BTC'],
    pair: 'ETH/USDC',
    fee: 3000,
  };
}

function aaveDesk(): MultiBlock {
  return {
    id: uid('block'),
    type: 'multi',
    title: 'Aave',
    active: 0,
    items: AAVE_STRATEGIES.map((item) => aaveBlock(uid('block'), item.id)),
  };
}

export function createBlock(type: BlockType, variant?: string): Block {
  const id = uid('block');
  switch (type) {
    case 'hero':
      return { id, type, kicker: 'Sendra', title: 'New protocol', body: 'Write the product promise here.' };
    case 'text':
      return { id, type, kicker: '', title: '', body: 'A paragraph for whoever opens the link.' };
    case 'metric':
      return { id, type, label: 'Network', value: 'Arbitrum', hint: 'One account. One record.' };
    case 'field':
      return { id, type, label: 'Amount', placeholder: '100', key: 'amount', input: 'theme' };
    case 'button':
      return { id, type, label: 'Execute', style: 'theme', action: defaultAction('wallet') };
    case 'menu':
      return { id, type, label: 'Open', items: [] };
    case 'wallet':
      return {
        id,
        type,
        label: 'Connect wallet',
        look: variant === 'button' || variant === 'account' || variant === 'hover' ? variant : 'card',
      };
    case 'balance': {
      const asset = variant === 'USDC' ? 'USDC' : 'ETH';
      return { id, type, asset, label: asset };
    }
    case 'portfolio':
      return { id, type };
    case 'dashboard':
      return { id, type, title: 'Dashboard' };
    case 'multi':
      if (variant === 'aave') return aaveDesk();
      return { id, type, title: 'Desk', active: 0, items: [] };
    case 'calendar':
      return { id, type, title: 'Calendar' };
    case 'pulse':
      return { id, type, title: 'Pulse' };
    case 'logo':
      return { id, type, src: '', alt: 'Logo' };
    case 'spacer':
      return { id, type, size: 'm' };
    case 'spot':
      return {
        id,
        type,
        title: 'Spot',
        hint: 'The order is signed on Arbitrum, inside the Sendra account.',
        asset: 'BTC',
        side: 'buy',
        amount: '100',
        button: 'Buy BTC',
      };
    case 'terminal':
      return {
        id,
        type,
        title: 'Spot',
        assets: [...SPOT_ASSETS],
        asset: 'BTC',
        sides: 'both',
        amount: '100',
        chart: true,
        ticket: true,
        layout: 'side',
        interval: '1h',
      };
    case 'spotbook':
      return { id, type, title: 'Spot portfolio', assets: [...SPOT_ASSETS], status: 'active', sell: true };
    case 'pairs':
      return {
        id,
        type,
        title: 'Pairs',
        limit: 36,
        sort: 'apr',
        risk: 'ALL',
        openOn: 'best',
        long: 'BTC',
        short: 'ETH',
        panels: [...PAIR_PANELS],
        stats: [...PAIR_STATS],
        views: [...PAIR_VIEWS],
        interval: '1d',
        layout: 'side',
      };
    case 'aave':
      return aaveBlock(id, aaveStrategy(variant));
    case 'liquidity':
      return {
        id,
        type,
        title: 'Liquidity',
        hint: 'The LP lives in the same account as spot.',
        pair: 'ETH/USDC',
        fee: 3000,
        amount: '100',
        button: 'Add liquidity',
        lowPct: 12,
        highPct: 12,
      };
    case 'enclave':
      return {
        id,
        type,
        title: 'Credit enclave',
        hint: 'Whoever connects creates the offer on the Sendra factory.',
        capital: '1000',
        minTx: '10',
        maxTx: '250',
        days: 30,
        feePct: 10,
        operator: '',
        openOperator: true,
        description: '',
        button: 'Create offer',
      };
    case 'enclaveMine':
      return { id, type, title: 'My enclaves' };
    case 'enclaveOffers':
      return { id, type, title: 'Open offers' };
    case 'enclaveManage':
      return { id, type, title: 'Manage enclave' };
    case 'enclavePortfolio':
      return { id, type, title: 'Enclave portfolio' };
  }
}

function oneOf<T extends string | number>(value: unknown, options: readonly T[], fallback: T): T {
  return (options as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function assetList(value: unknown): SpotAsset[] {
  if (!Array.isArray(value)) return [...SPOT_ASSETS];
  const picked = SPOT_ASSETS.filter((asset) => value.includes(asset));
  return picked.length ? [...picked] : [...SPOT_ASSETS];
}

function pickList<T extends string>(value: unknown, options: readonly T[], fallback: readonly T[]): T[] {
  if (!Array.isArray(value)) return [...fallback];
  const picked = options.filter((item) => value.includes(item));
  return picked.length ? [...picked] : [...fallback];
}

function unwrap(raw: unknown): unknown {
  let value = raw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof value !== 'string') break;
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) break;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      break;
    }
  }
  return value;
}

function parseAction(raw: unknown): Action {
  if (!raw || typeof raw !== 'object') return { kind: 'none' };
  const rec = raw as { kind?: string };
  if (rec.kind === 'link') return { kind: 'link', href: str((raw as { href?: unknown }).href) };
  if (rec.kind === 'wallet') return { kind: 'wallet' };
  if (rec.kind === 'enclave') return { kind: 'enclave' };
  if (rec.kind === 'spot') {
    const row = raw as Partial<SpotAction>;
    return {
      kind: 'spot',
      asset: oneOf(row.asset, SPOT_ASSETS, 'BTC'),
      side: row.side === 'sell' ? 'sell' : 'buy',
      amount: str(row.amount, '100'),
      amountKey: str(row.amountKey),
    };
  }
  if (rec.kind === 'aave') {
    const row = raw as Partial<AaveAction>;
    return {
      kind: 'aave',
      asset: oneOf(row.asset, AAVE_ASSETS, 'USDC'),
      amount: str(row.amount, '100'),
      amountKey: str(row.amountKey),
    };
  }
  if (rec.kind === 'liquidity') {
    const row = raw as Partial<LiquidityAction>;
    return {
      kind: 'liquidity',
      pair: oneOf(row.pair, PAIRS, 'ETH/USDC'),
      fee: oneOf(row.fee, FEES, 3000),
      amount: str(row.amount, '100'),
      amountKey: str(row.amountKey),
    };
  }
  return { kind: 'none' };
}

function parseBlock(raw: unknown): Block | null {
  const block = parseBlockBody(raw);
  if (!block || !raw || typeof raw !== 'object') return block;
  const row = raw as Record<string, unknown>;
  const pad = typeof row.pad === 'number' && Number.isFinite(row.pad) ? Math.max(0, Math.min(PAD_MAX, Math.round(row.pad))) : undefined;
  const next: Block = pad === undefined ? block : { ...block, pad };
  const frame = row.frame;
  if (!frame || typeof frame !== 'object') return next;
  const box = frame as Record<string, unknown>;
  return { ...next, frame: { col: num(box.col, 1), span: num(box.span, 1), row: num(box.row, 1), rows: num(box.rows, 1) } };
}

function parseBlockBody(raw: unknown): Block | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { type?: string; id?: string };
  const id = str(row.id) || uid('block');
  const base = raw as Record<string, unknown>;
  switch (row.type) {
    case 'hero':
      return { id, type: 'hero', kicker: str(base.kicker), title: str(base.title), body: str(base.body) };
    case 'text':
      return { id, type: 'text', kicker: str(base.kicker), title: str(base.title), body: str(base.body) };
    case 'metric':
      return { id, type: 'metric', label: str(base.label), value: str(base.value), hint: str(base.hint) };
    case 'field':
      return {
        id,
        type: 'field',
        label: str(base.label, 'Field'),
        placeholder: str(base.placeholder),
        key: str(base.key, 'amount'),
        input: base.input === 'theme' ? 'theme' : oneOf(base.input, INPUTS.map((item) => item.id), 'filled'),
      };
    case 'button':
      return {
        id,
        type: 'button',
        label: str(base.label, 'Execute'),
        style: base.style === 'theme' ? 'theme' : oneOf(base.style, BUTTONS.map((item) => item.id), 'solid'),
        action: parseAction(base.action),
      };
    case 'menu': {
      const items = (Array.isArray(base.items) ? base.items : [])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          return { id: str(row.id) || uid('item'), label: str(row.label, 'Button'), href: str(row.href) };
        })
        .filter((item): item is MenuItem => item !== null)
        .slice(0, MENU_CAP);
      return { id, type: 'menu', label: str(base.label, 'Open'), items };
    }
    case 'wallet':
      return {
        id,
        type: 'wallet',
        label: str(base.label, 'Connect wallet'),
        look: oneOf(base.look, WALLET_LOOKS.map((item) => item.id), 'card'),
      };
    case 'balance': {
      const asset = base.asset === 'USDC' ? 'USDC' : 'ETH';
      return { id, type: 'balance', asset, label: str(base.label, asset) };
    }
    case 'portfolio':
      return { id, type: 'portfolio' };
    case 'calendar':
      return { id, type: 'calendar', title: str(base.title, 'Calendar') };
    case 'pulse':
      return { id, type: 'pulse', title: str(base.title, 'Pulse') };
    case 'logo':
      return { id, type: 'logo', src: str(base.src), alt: str(base.alt, 'Logo') };
    case 'spacer':
      return { id, type: 'spacer', size: oneOf(base.size, ['s', 'm', 'l'] as const, 'm') };
    case 'spot':
      return {
        id,
        type: 'spot',
        title: str(base.title, 'Spot'),
        hint: str(base.hint),
        asset: oneOf(base.asset, SPOT_ASSETS, 'BTC'),
        side: base.side === 'sell' ? 'sell' : 'buy',
        amount: str(base.amount, '100'),
        button: str(base.button, 'Trade'),
      };
    case 'terminal': {
      const assets = assetList(base.assets);
      const requested = oneOf(base.asset, SPOT_ASSETS, assets[0]);
      return {
        id,
        type: 'terminal',
        title: str(base.title, 'Spot'),
        assets,
        asset: assets.includes(requested) ? requested : assets[0],
        sides: base.sides === 'buy' || base.sides === 'sell' ? base.sides : 'both',
        amount: str(base.amount, '100'),
        chart: bool(base.chart, true),
        ticket: bool(base.ticket, true),
        layout: base.layout === 'stack' ? 'stack' : 'side',
        interval: oneOf(base.interval, CHART_INTERVALS, '1h'),
      };
    }
    case 'spotbook':
      return {
        id,
        type: 'spotbook',
        title: str(base.title, 'Spot portfolio'),
        assets: assetList(base.assets),
        status: base.status === 'all' || base.status === 'closed' ? base.status : 'active',
        sell: bool(base.sell, true),
      };
    case 'pairs': {
      const long = oneOf(base.long, PAIR_COINS, 'BTC');
      const short = oneOf(base.short, PAIR_COINS, 'ETH');
      return {
        id,
        type: 'pairs',
        title: str(base.title, 'Pairs'),
        limit: Math.max(1, Math.min(48, Math.round(num(base.limit, 36)))),
        sort: base.sort === 'win' ? 'win' : 'apr',
        risk: oneOf(base.risk, PAIR_RISKS, 'ALL'),
        openOn: base.openOn === 'fixed' ? 'fixed' : 'best',
        long,
        short: short === long ? (long === 'ETH' ? 'BTC' : 'ETH') : short,
        panels: pickList(base.panels, PAIR_PANELS, PAIR_PANELS),
        stats: pickList(base.stats, PAIR_STATS, PAIR_STATS),
        views: pickList(base.views, PAIR_VIEWS, PAIR_VIEWS),
        interval: oneOf(base.interval, CHART_INTERVALS, '1d'),
        layout: base.layout === 'stack' ? 'stack' : 'side',
      };
    }
    case 'aave':
      return {
        ...aaveBlock(id, aaveStrategy(base.strategy)),
        title: str(base.title, 'Aave'),
        hint: str(base.hint),
        asset: oneOf(base.asset, AAVE_ASSETS, 'USDC'),
        amount: str(base.amount, '100'),
        button: str(base.button, 'Supply'),
        loops: Math.max(1, Math.min(5, Math.round(num(base.loops, 2)))),
        short: oneOf(base.short, AAVE_ASSETS, 'ETH'),
        assets: aaveAssets(base.assets),
        pair: oneOf(base.pair, PAIRS, 'ETH/USDC'),
        fee: oneOf(base.fee, FEES, 3000),
      };
    case 'multi': {
      const items = (Array.isArray(base.items) ? base.items : [])
        .map((item) => parseBlock(item))
        .filter((item): item is Block => item !== null)
        .slice(0, MULTI_CAP)
        .map((item) => {
          const next = { ...item };
          delete next.frame;
          return next;
        });
      return {
        id,
        type: 'multi',
        title: str(base.title, 'Desk'),
        active: items.length ? Math.max(0, Math.min(items.length - 1, Math.round(num(base.active, 0)))) : 0,
        items,
      };
    }
    case 'dashboard':
      return { id, type: 'dashboard', title: str(base.title, 'Dashboard') };
    case 'liquidity':
      return {
        id,
        type: 'liquidity',
        title: str(base.title, 'Liquidity'),
        hint: str(base.hint),
        pair: oneOf(base.pair, PAIRS, 'ETH/USDC'),
        fee: oneOf(base.fee, FEES, 3000),
        amount: str(base.amount, '100'),
        button: str(base.button, 'Add liquidity'),
        lowPct: Math.max(1, Math.min(80, Math.round(num(base.lowPct, 12)))),
        highPct: Math.max(1, Math.min(80, Math.round(num(base.highPct, 12)))),
      };
    case 'enclave':
      return {
        id,
        type: 'enclave',
        title: str(base.title, 'Credit enclave'),
        hint: str(base.hint),
        capital: str(base.capital, '1000'),
        minTx: str(base.minTx, '10'),
        maxTx: str(base.maxTx, '250'),
        days: Math.max(1, Math.round(num(base.days, 30))),
        feePct: Math.max(0, Math.min(100, Math.round(num(base.feePct, 10)))),
        operator: str(base.operator),
        openOperator: bool(base.openOperator, true),
        description: str(base.description),
        button: str(base.button, 'Create enclave'),
      };
    case 'enclaveMine':
      return { id, type: 'enclaveMine', title: str(base.title, 'My enclaves') };
    case 'enclaveOffers':
      return { id, type: 'enclaveOffers', title: str(base.title, 'Open offers') };
    case 'enclaveManage':
      return { id, type: 'enclaveManage', title: str(base.title, 'Manage enclave') };
    case 'enclavePortfolio':
      return { id, type: 'enclavePortfolio', title: str(base.title, 'Enclave portfolio') };
    default:
      return null;
  }
}

export function parseProtocol(input: unknown): ProtocolDocument {
  const value = unwrap(input);
  if (!value || typeof value !== 'object') throw new Error('Empty document');
  const rec = value as { kind?: string; meta?: Record<string, unknown>; theme?: Record<string, unknown>; blocks?: unknown };
  if (rec.kind !== 'sendra') throw new Error('Not a Sendra protocol');
  const meta = rec.meta ?? {};
  const themeRaw = rec.theme ?? {};
  const preset = oneOf(themeRaw.preset, [...PRESET_LIST.map((item) => item.id), 'custom'] as const, 'acid');
  const colors = preset === 'custom' ? PRESETS.acid : PRESETS[preset];
  const theme: Theme = {
    font: oneOf(themeRaw.font, FONTS.map((item) => item.id), DEFAULT_THEME.font),
    background: oneOf(themeRaw.background, BACKGROUNDS.map((item) => item.id), DEFAULT_THEME.background),
    preset,
    ink: str(themeRaw.ink, colors.ink),
    paper: str(themeRaw.paper, colors.paper),
    accent: str(themeRaw.accent, colors.accent),
    accentInk: str(themeRaw.accentInk, colors.accentInk),
    muted: str(themeRaw.muted, colors.muted),
    radius: Math.max(0, Math.min(32, Math.round(num(themeRaw.radius, 18)))),
    button: oneOf(themeRaw.button, BUTTONS.map((item) => item.id), 'solid'),
    input: oneOf(themeRaw.input, INPUTS.map((item) => item.id), 'filled'),
    width: pageWidth(themeRaw.width),
    credit: bool(themeRaw.credit, true),
  };
  const pages = parsePages(rec);
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'sendra',
    meta: {
      id: str(meta.id) || uid('snd'),
      title: str(meta.title, 'Untitled protocol'),
      titleTouched: bool(meta.titleTouched, false),
      slug: str(meta.slug),
      status: meta.status === 'published' ? 'published' : 'draft',
      template: str(meta.template, 'custom'),
      updatedAt: str(meta.updatedAt, now),
      publishedAt: str(meta.publishedAt) || undefined,
    },
    theme,
    pages,
  };
}

export function pageSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function makePage(kind: PageKind, name: string, path: string, blocks: Block[] = [], html = ''): StudioPage {
  return { id: uid('page'), name, path: pageSlug(path), kind, blocks, html };
}

function parsePages(rec: { pages?: unknown; blocks?: unknown }): StudioPage[] {
  const rawPages = Array.isArray(rec.pages) ? rec.pages : null;
  const pages = rawPages
    ? rawPages.map(parsePage).filter((page): page is StudioPage => page !== null)
    : [
        makePage(
          'canvas',
          'Home',
          '',
          Array.isArray(rec.blocks) ? rec.blocks.map(parseBlock).filter((block): block is Block => block !== null) : [],
        ),
      ];
  const ready = pages.length ? pages : [makePage('canvas', 'Home', '', [])];
  const seen = new Set<string>();
  return ready.map((page, index) => {
    let path = index === 0 ? page.path : page.path || pageSlug(page.name) || `page-${index + 1}`;
    if (seen.has(path)) path = `${path || 'page'}-${index + 1}`;
    seen.add(path);
    return { ...page, path };
  });
}

function parsePage(raw: unknown): StudioPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const kind: PageKind = row.kind === 'html' || row.kind === 'portfolio' ? row.kind : 'canvas';
  const blocks = Array.isArray(row.blocks) ? row.blocks.map(parseBlock).filter((block): block is Block => block !== null) : [];
  return {
    id: str(row.id) || uid('page'),
    name: str(row.name, 'Page'),
    path: pageSlug(str(row.path)),
    kind,
    blocks,
    html: str(row.html),
    mobile: parseLayout(row.mobile),
  };
}

function parseLayout(raw: unknown): PageLayout | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const blocks = Array.isArray(row.blocks) ? row.blocks.map(parseBlock).filter((block): block is Block => block !== null) : [];
  return { blocks, html: str(row.html) };
}

export function landingPage(doc: { pages: StudioPage[] }) {
  return (
    doc.pages.find((page) => page.name.trim().toLowerCase() === 'landing') ??
    doc.pages.find((page) => page.path === '') ??
    doc.pages[0]
  );
}

export function findPage(doc: ProtocolDocument, path = '') {
  const slug = pageSlug(path);
  const exact = doc.pages.find((page) => page.path === slug);
  if (exact) return exact;
  if (!slug) return doc.pages[0];
  return doc.pages.find((page) => page.path === '' && pageSlug(page.name) === slug) ?? doc.pages[0];
}

export function heroTitle(doc: ProtocolDocument) {
  const home = doc.pages[0];
  const hero = home?.blocks.find((block) => block.type === 'hero');
  if (hero && hero.type === 'hero' && hero.title.trim()) return hero.title.trim();
  return 'Untitled protocol';
}
