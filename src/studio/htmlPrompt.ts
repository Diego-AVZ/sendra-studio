import {
  BACKGROUNDS,
  BUTTONS,
  FONTS,
  INPUTS,
  PRESET_LIST,
  blockName,
  type Action,
  type Block,
  type ProtocolDocument,
  type StudioPage,
  type Theme,
} from '@/schema/protocol';

export function findAppPage(doc: ProtocolDocument, exceptId?: string) {
  const rest = doc.pages.filter((page) => page.id !== exceptId);
  return (
    rest.find((page) => page.path === 'home') ??
    rest.find((page) => page.kind === 'canvas' && page.name.toLowerCase() === 'home') ??
    rest.find((page) => page.kind === 'canvas') ??
    rest[0]
  );
}

export function publicAppUrl(doc: ProtocolDocument, path: string) {
  const slug = doc.meta.slug || 'your-slug';
  const suffix = path ? `/${path}` : '';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/p/${slug}${suffix}`;
}

const BUILDER =
  /sendra studio|\bsendra account\b|sendra execution|ruta de sendra|sendra route|sendra factory|same account as spot|arrastra|drag fields|drag onto|execution module|m[oó]dulo de ejecuci[oó]n|product promise|promesa del producto|write the product|p[aá]gina p[uú]blica|public page|whoever opens the link|the desk, and every feature|\bcanvas\b|\bstudio\b/i;

function spoken(value: string) {
  const text = clip(value);
  if (!text || BUILDER.test(text)) return '';
  if (/^(sendra|new protocol|untitled protocol)$/i.test(text)) return '';
  return text;
}

export function promiseFrom(doc: ProtocolDocument) {
  for (const page of doc.pages) {
    for (const block of page.blocks) {
      if (block.type !== 'hero') continue;
      const body = spoken(block.body);
      if (body) return body;
    }
  }
  return '';
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function capabilities(doc: ProtocolDocument) {
  const lines: string[] = [];
  const seen = new Set<string>();
  const add = (key: string, line: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };
  for (const page of doc.pages) {
    if (page.kind === 'portfolio') add('book', 'read a book of value, PnL, capital, and USDC');
    for (const block of flatten(page.blocks)) {
      if (block.type === 'aave') add(`aave:${block.strategy}:${block.asset}`, `open an Aave ${block.strategy} on ${block.strategy === 'basket' ? block.assets.join(', ') : block.strategy === 'lp' ? block.pair : block.asset}`);
      if (block.type === 'dashboard') add('dashboard', 'read value, PnL, capital, and the mix of open positions');
      if (block.type === 'liquidity') add(`lp:${block.pair}`, `open a liquidity range on ${block.pair}`);
      if (block.type === 'spot') add(`spot:${block.side}:${block.asset}`, `${block.side} ${block.asset}`);
      if (block.type === 'terminal') add('terminal', `trade spot on ${(block.assets.length ? block.assets : [block.asset]).join(', ')} with a chart`);
      if (block.type === 'spotbook') add('spotbook', 'see spot positions and sell from the row');
      if (block.type === 'pairs') add('pairs', 'run a market-neutral pairs desk');
      if (block.type === 'enclave') add('enclave', `create a credit enclave of ${block.capital || '0'} USDC for ${block.days} days`);
      if (block.type === 'enclaveMine') add('mine', 'see the enclaves they lend or operate');
      if (block.type === 'enclaveOffers') add('offers', 'take an open capital offer');
      if (block.type === 'enclaveManage') add('manage', 'manage the selected enclave');
      if (block.type === 'enclavePortfolio') add('enclave-book', 'read the selected enclave’s positions');
      if (block.type === 'calendar') add('calendar', 'see positions on the days they open and close');
      if (block.type === 'pulse') add('pulse', 'see a reputation score');
      if (block.type === 'portfolio') add('book', 'read a book of value, PnL, capital, and USDC');
    }
  }
  return lines;
}

function flatten(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => (block.type === 'multi' ? flatten(block.items) : [block]));
}

function clip(value: string) {
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function actionLine(action: Action) {
  if (action.kind === 'wallet') return 'It connects a wallet on Arbitrum.';
  if (action.kind === 'spot') return `It ${action.side}s ${action.asset} against USDC.`;
  if (action.kind === 'aave') return `It supplies ${action.asset} on Aave.`;
  if (action.kind === 'liquidity') return `It adds liquidity on ${action.pair}.`;
  if (action.kind === 'enclave') return 'It creates the credit enclave.';
  if (action.kind === 'link' && action.href.trim()) return `It opens ${action.href.trim()}.`;
  return '';
}

function feePct(fee: number) {
  return `${fee / 10000}%`;
}

function note(value: string) {
  const text = spoken(value);
  return text ? ` ${text}` : '';
}

function featureLine(block: Block): string {
  if (block.type === 'hero') {
    const bits = [block.kicker, block.title, block.body].map(spoken).filter(Boolean);
    return bits.length ? `Words already on the screen: ${bits.join(' — ')}` : '';
  }
  if (block.type === 'text') {
    const bits = [block.kicker, block.title, block.body].map(spoken).filter(Boolean);
    return bits.length ? `Words already on the screen: ${bits.join(' — ')}` : '';
  }
  if (block.type === 'metric') return `Figure “${clip(block.label) || 'Figure'}”: ${clip(block.value)}${note(block.hint) ? `.${note(block.hint)}` : ''}`;
  if (block.type === 'field') return `Input “${clip(block.label) || 'Field'}”${clip(block.placeholder) ? `, placeholder “${clip(block.placeholder)}”` : ''}`;
  if (block.type === 'button') {
    const does = actionLine(block.action);
    return `Button “${clip(block.label) || 'Button'}”.${does ? ` ${does}` : ''}`;
  }
  if (block.type === 'menu') {
    const links = block.items.map((item) => `“${clip(item.label) || 'Button'}” opens ${item.href.trim() || 'the public page'}`);
    return `Button “${clip(block.label) || 'Open'}” opens a menu.${links.length ? ` ${links.join('; ')}.` : ''}`;
  }
  if (block.type === 'balance') return `${block.asset} balance of the connected wallet on Arbitrum. The label is “${clip(block.label) || block.asset}”.`;
  if (block.type === 'wallet') {
    const look =
      block.look === 'button'
        ? 'It is only a button.'
        : block.look === 'account'
          ? 'The connected address sits inside the button, with Disconnect beside it.'
          : block.look === 'hover'
            ? 'The address sits in the button. Hovering it shows Disconnect.'
            : 'Status sits beside the button.';
    return `Wallet connect on Arbitrum. ${look} The label is “${clip(block.label) || 'Connect wallet'}”.`;
  }
  if (block.type === 'logo') return clip(block.alt) ? `Logo, “${clip(block.alt)}”` : '';
  if (block.type === 'spot') {
    return `${clip(block.title) || 'Spot'}: ${block.side} ${block.asset} against USDC${block.amount ? `, starting amount ${block.amount}` : ''}. The button says “${clip(block.button) || 'Execute'}”.${note(block.hint)}`;
  }
  if (block.type === 'terminal') {
    const markets = block.assets.length ? block.assets.join(', ') : block.asset;
    const side = block.sides === 'both' ? 'buy and sell' : block.sides;
    return `${clip(block.title) || 'Terminal'}: spot markets ${markets}. ${block.chart ? `Candles at ${block.interval}.` : 'No chart.'} ${block.ticket ? `A ticket to ${side}.` : 'No ticket.'}`;
  }
  if (block.type === 'spotbook') {
    const markets = block.assets.length ? ` for ${block.assets.join(', ')}` : '';
    return `${clip(block.title) || 'Spot book'}: open spot positions${markets}.${block.sell ? ' The visitor can sell from the row.' : ''}`;
  }
  if (block.type === 'pairs') {
    const open = block.openOn === 'fixed' ? `Opens on ${block.long}/${block.short}.` : 'Opens on the strongest pair.';
    const panels = block.panels.length ? block.panels.join(', ') : 'none';
    const stats = block.stats.length ? block.stats.join(', ') : 'none';
    return `${clip(block.title) || 'Pairs'}: a market-neutral desk. ${open} Panels: ${panels}. Stats: ${stats}. Chart: ${block.interval}.`;
  }
  if (block.type === 'multi') {
    const inner = block.items.map((item) => featureLine(item)).filter(Boolean);
    return `${clip(block.title) || 'Multi'}: a selector across ${block.items.length} modules.${inner.length ? ` ${inner.join(' ')}` : ''}`;
  }
  if (block.type === 'dashboard') return `${clip(block.title) || 'Dashboard'}: value, PnL, capital, USDC, and a count per open strategy.`;
  if (block.type === 'aave') {
    const leg = block.strategy === 'basket' ? block.assets.join(', ') : block.strategy === 'lp' ? block.pair : block.strategy === 'short' ? `${block.short} against ${block.asset}` : block.strategy === 'loop' ? `${block.asset}, ${block.loops} loops` : block.asset;
    return `${clip(block.title) || 'Aave'} · ${block.strategy}: ${leg}${block.amount ? `, starting amount ${block.amount}` : ''}. The button says “${clip(block.button) || 'Supply'}”.${note(block.hint)}`;
  }
  if (block.type === 'liquidity') {
    return `${clip(block.title) || 'Liquidity'}: a range on ${block.pair}, fee ${feePct(block.fee)}, from ${block.lowPct}% to +${block.highPct}%. The button says “${clip(block.button) || 'Add'}”.${note(block.hint)}`;
  }
  if (block.type === 'enclave') {
    return `${clip(block.title) || 'Enclave'}: create a credit offer of ${block.capital || '0'} USDC for ${block.days} days, with a ${block.feePct}% split. The button says “${clip(block.button) || 'Create'}”.${note(block.description)}`;
  }
  if (block.type === 'enclaveMine') return `${clip(block.title) || 'My enclaves'}: enclaves the visitor lends or operates. Choosing a row selects the active one.`;
  if (block.type === 'enclaveOffers') return `${clip(block.title) || 'Offers'}: open capital offers. Taking one makes the visitor the operator.`;
  if (block.type === 'enclaveManage') return `${clip(block.title) || 'Manage'}: deposit, pause, finalize, cancel, or revoke the selected enclave.`;
  if (block.type === 'enclavePortfolio') return `${clip(block.title) || 'Enclave book'}: positions that belong to the selected enclave.`;
  if (block.type === 'portfolio') return 'Portfolio: value of open positions, realized and unrealized PnL, capital, and USDC.';
  if (block.type === 'calendar') return `${clip(block.title) || 'Calendar'}: positions painted on the days they open and close.`;
  if (block.type === 'pulse') return `${clip(block.title) || 'Pulse'}: reputation. Tier, score, and the five factors: risk, profit, win rate, experience, activity.`;
  return '';
}

function lookOf(theme: Theme) {
  const palette = theme.preset === 'custom' ? 'Custom' : (PRESET_LIST.find((item) => item.id === theme.preset)?.name ?? 'Custom');
  const font = FONTS.find((item) => item.id === theme.font)?.name ?? theme.font;
  const background = BACKGROUNDS.find((item) => item.id === theme.background)?.name ?? theme.background;
  const button = BUTTONS.find((item) => item.id === theme.button)?.name ?? theme.button;
  const input = INPUTS.find((item) => item.id === theme.input)?.name ?? theme.input;
  return [
    `Palette: ${palette}.`,
    `Background: ${background}.`,
    `Paper ${theme.paper}. Ink ${theme.ink}. Muted ${theme.muted}. Accent ${theme.accent}. Text on the accent ${theme.accentInk}.`,
    `Typeface: ${font}.`,
    `Buttons: ${button}. Inputs: ${input}. Corner radius ${theme.radius}px.`,
  ].join('\n');
}

function pageBrief(page: StudioPage) {
  if (page.kind === 'html') return '';
  const route = page.path ? `/${page.path}` : '/';
  if (page.kind === 'portfolio') return `${page.name} (${route})\n  - The book: value, realized and unrealized PnL, capital, and USDC.`;
  const lines = page.blocks.map(featureLine).filter(Boolean);
  if (!lines.length) return '';
  return `${page.name} (${route})\n${lines.map((line) => `  - ${line}`).join('\n')}`;
}

export function pageFact(page: StudioPage) {
  if (page.kind === 'portfolio') return 'The book: value, PnL, capital, and USDC.';
  if (page.kind === 'html') return 'The public landing.';
  const names = [...new Set(page.blocks.map((block) => blockName(block.type)))].filter((name) => name !== 'Space');
  return names.length ? names.join(', ') : 'Empty screen.';
}

export function landingPrompt(input: {
  doc: ProtocolDocument;
  page: StudioPage;
  name: string;
  promise: string;
  audience: string;
  tone: string;
  cta: string;
  language: string;
  extra: string;
}) {
  const app = findAppPage(input.doc, input.page.id);
  const appPath = app?.path ? app.path : '/';
  const url = publicAppUrl(input.doc, app?.path ?? '');
  const name = input.name.trim() || 'Untitled';
  const acts = capabilities(input.doc);
  const pitch = acts.length ? `${name} is the product. A visitor can ${joinList(acts)}.` : `${name} is the product. Describe only the screens below.`;
  const screens = input.doc.pages.map(pageBrief).filter(Boolean).join('\n\n');
  const own = spoken(input.promise);
  const audience = spoken(input.audience);
  const extra = input.extra.trim();
  return `Write the landing page for ${name}. Reply with one complete HTML document only, starting with <!doctype html>. No markdown and no explanation.

${name} is an app a visitor opens and uses. It is not a builder, not a studio, and not a tool for making pages.
The first heading is ${name}. The first paragraph is what a visitor can do. Write that paragraph from this sentence, in ${input.language}:
${pitch}
Do not invent features, markets, tokens, or yields. Never write “drag”, “fields”, “modules”, “canvas”, “studio”, “execution module”, or “Sendra account”. Do not rename ${name} to Sendra. The page is full viewport, with its own CSS.

Language of the copy: ${input.language}
Tone: ${input.tone}${audience ? `\nWho it is for: ${audience}` : ''}${own ? `\nA line to keep, in the author’s words: ${own}` : ''}

Look. Use this palette. Do not switch colors.
${lookOf(input.doc.theme)}

Screens the visitor uses:
${screens || '  - No screens yet.'}

The app opens on “${app?.name ?? 'Home'}”.
Put this control in the header and again after the pitch, exactly as written:
<a href="${url}" data-sendra-go="${appPath}">${input.cta.trim() || 'Open the app'}</a>
Keep data-sendra-go. That control only enters the app. Do not draw a trading screen on the landing, and do not add wallet or contract code here.${extra ? `\n\nAlso follow this:\n${extra}` : ''}`;
}
