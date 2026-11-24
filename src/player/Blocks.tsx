import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { InlineCopy } from '@/studio/inlineCopy';
import { shortAddr } from '@/lib/uid';
import { useWallet } from '@/web3/useWallet';
import type {
  AaveAsset,
  AaveBlock,
  Action,
  Block,
  ButtonBlock,
  MenuBlock,
  EnclaveBlock,
  FeeTier,
  FieldBlock,
  LiquidityBlock,
  LogoBlock,
  MultiBlock,
  BalanceBlock,
  WalletBlock,
  PairId,
  SpotAsset,
  SpotBlock,
  Theme,
} from '@/schema/protocol';
import { AAVE_ASSETS, AAVE_STRATEGIES, FEES, MULTI_CAP, PAIRS, SPOT_ASSETS, blockPad, labelOf } from '@/schema/protocol';
import { ActionButton, TextField, cardStyle, headline } from '@/player/chrome';
import { Menu } from '@/studio/ui';
import { CalendarDesk } from '@/player/CalendarDesk';
import { CreateEnclaveDesk, EnclavePortfolioDesk, ManageEnclaveDesk, MyEnclavesDesk, OffersDesk } from '@/player/Enclaves';
import { PortfolioView } from '@/player/Portfolio';
import { PairsDesk } from '@/player/PairsDesk';
import { LiquidityDesk } from '@/player/LiquidityDesk';
import { PulseDesk } from '@/player/PulseDesk';
import { SpotBookView } from '@/player/SpotBook';
import { TerminalView } from '@/player/Terminal';

export type PlayerApi = {
  interactive: boolean;
  pending: boolean;
  address?: string;
  usdc: string;
  chainOk: boolean;
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  connect: () => void;
  disconnect: () => void;
  openSpot: () => void;
  openAave: () => void;
  runAction: (action: Action, label: string) => void;
  runSpot: (order: { asset: SpotAsset; side: 'buy' | 'sell'; amount: string }) => Promise<boolean>;
  runAave: (block: AaveBlock) => void;
  runLiquidity: (block: LiquidityBlock) => void;
  runEnclave: (block: EnclaveBlock) => void;
};

export const quietApi: PlayerApi = {
  interactive: false,
  pending: false,
  usdc: '',
  chainOk: false,
  values: {},
  setValue: () => undefined,
  connect: () => undefined,
  disconnect: () => undefined,
  openSpot: () => undefined,
  openAave: () => undefined,
  runAction: () => undefined,
  runSpot: async () => false,
  runAave: () => undefined,
  runLiquidity: () => undefined,
  runEnclave: () => undefined,
};

type Patch = (recipe: (block: Block) => Block) => void;

function setText(edit: Patch | undefined, type: Block['type'], key: string) {
  if (!edit) return undefined;
  return (next: string) =>
    edit((block) => {
      if (block.type !== type) return block;
      return { ...block, [key]: next } as Block;
    });
}

function copy(value: string, onCommit?: (next: string) => void, multiline = false) {
  if (!onCommit) return value;
  return <InlineCopy value={value} multiline={multiline} onCommit={onCommit} />;
}

function edited(value: string, onCommit?: (next: string) => void) {
  if (!onCommit) return undefined;
  return <InlineCopy value={value} onCommit={onCommit} />;
}

function Label({ theme, children, onCommit }: { theme: Theme; children: string; onCommit?: (next: string) => void }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
      {copy(children, onCommit)}
    </span>
  );
}

function Shell({
  theme,
  kicker,
  title,
  hint,
  pad,
  onTitle,
  onHint,
  children,
}: {
  theme: Theme;
  kicker: string;
  title: string;
  hint?: string;
  pad: number;
  onTitle?: (next: string) => void;
  onHint?: (next: string) => void;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col justify-between overflow-auto" style={{ ...cardStyle(theme), padding: pad, gap: pad }}>
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
        {kicker}
      </p>
      <h3 className={`text-[1.7rem] leading-none ${headline(theme.font)}`}>{copy(title, onTitle)}</h3>
      {children}
      {hint ? (
        <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
          {copy(hint, onHint, true)}
        </p>
      ) : null}
    </section>
  );
}

function fitted(pad: number, node: ReactNode) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto" style={{ padding: pad, gap: pad }}>
      <div className="min-h-0 flex-1">{node}</div>
    </div>
  );
}

function Select<T extends string | number>({
  theme,
  value,
  options,
  disabled,
  onChange,
}: {
  theme: Theme;
  value: T;
  options: readonly { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <Menu
      value={value}
      options={options.map((item) => ({ value: item.value, label: item.label }))}
      disabled={disabled}
      onChange={onChange}
      ink={theme.ink}
      paper={theme.paper}
      accent={theme.accent}
      accentInk={theme.accentInk}
      className="mt-0 w-full px-3 py-3 text-sm outline-none"
      style={{
        color: theme.ink,
        borderRadius: theme.input === 'line' ? 0 : theme.radius,
        background: `color-mix(in srgb, ${theme.ink} 8%, ${theme.paper})`,
        border: `1px solid color-mix(in srgb, ${theme.ink} 16%, transparent)`,
      }}
    />
  );
}

export function BlockView({
  block,
  theme,
  api,
  onLogoFile,
  edit,
}: {
  block: Block;
  theme: Theme;
  api: PlayerApi;
  onLogoFile?: (id: string, file: File) => void;
  edit?: Patch;
}) {
  if (block.type === 'multi') return <MultiView block={block} theme={theme} api={api} edit={edit} onLogoFile={onLogoFile} />;
  if (block.type === 'dashboard') return fitted(blockPad(block), <PortfolioView interactive board />);
  const pad = blockPad(block);
  if (block.type === 'hero') {
    return (
      <header className="flex h-full min-h-0 flex-col overflow-auto" style={{ gap: pad, padding: pad }}>
        {block.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
            {copy(block.kicker, setText(edit, 'hero', 'kicker'))}
          </p>
        ) : null}
        <h1 className={`max-w-[14ch] text-5xl leading-[0.92] sm:text-6xl ${headline(theme.font)}`}>
          {copy(block.title, setText(edit, 'hero', 'title'))}
        </h1>
        {block.body ? (
          <p className="max-w-md text-base leading-relaxed" style={{ color: theme.muted }}>
            {copy(block.body, setText(edit, 'hero', 'body'), true)}
          </p>
        ) : null}
        <div className="h-px w-12" style={{ background: theme.accent }} />
      </header>
    );
  }
  if (block.type === 'text') {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-auto" style={{ gap: pad, padding: pad }}>
        {block.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            {copy(block.kicker, setText(edit, 'text', 'kicker'))}
          </p>
        ) : null}
        {block.title ? <h2 className={`text-3xl ${headline(theme.font)}`}>{copy(block.title, setText(edit, 'text', 'title'))}</h2> : null}
        {block.body ? (
          <p className="max-w-prose text-base leading-relaxed" style={{ color: theme.muted }}>
            {copy(block.body, setText(edit, 'text', 'body'), true)}
          </p>
        ) : null}
      </section>
    );
  }
  if (block.type === 'metric') {
    return (
      <section className="flex h-full min-h-0 flex-col justify-between overflow-auto" style={{ ...cardStyle(theme), padding: pad, gap: pad }}>
        <Label theme={theme} onCommit={setText(edit, 'metric', 'label')}>
          {block.label}
        </Label>
        <p className={`text-4xl ${headline(theme.font)}`}>{copy(block.value, setText(edit, 'metric', 'value'))}</p>
        {block.hint ? (
          <p className="text-sm" style={{ color: theme.muted }}>
            {copy(block.hint, setText(edit, 'metric', 'hint'))}
          </p>
        ) : null}
      </section>
    );
  }
  if (block.type === 'spacer') {
    const height = block.size === 's' ? 12 : block.size === 'l' ? 64 : 32;
    return <div style={{ height }} />;
  }
  if (block.type === 'field') return <FieldView block={block} theme={theme} api={api} edit={edit} />;
  if (block.type === 'button') return <ButtonView block={block} theme={theme} api={api} edit={edit} />;
  if (block.type === 'menu') return <MenuView block={block} theme={theme} api={api} edit={edit} />;
  if (block.type === 'wallet') return <WalletView block={block} theme={theme} api={api} onLabel={setText(edit, 'wallet', 'label')} />;
  if (block.type === 'balance') return <BalanceView block={block} theme={theme} onLabel={setText(edit, 'balance', 'label')} />;
  if (block.type === 'spot') return <SpotView block={block} theme={theme} api={api} edit={edit} />;
  if (block.type === 'terminal') {
    return fitted(pad, <TerminalView block={block} theme={theme} api={api} titleSlot={edited(block.title, setText(edit, 'terminal', 'title'))} />);
  }
  if (block.type === 'spotbook') {
    return fitted(pad, <SpotBookView block={block} theme={theme} api={api} titleSlot={edited(block.title, setText(edit, 'spotbook', 'title'))} />);
  }
  if (block.type === 'pairs') return fitted(pad, <PairsDesk block={block} theme={theme} titleSlot={edited(block.title, setText(edit, 'pairs', 'title'))} />);
  if (block.type === 'aave') return <AaveView block={block} theme={theme} api={api} edit={edit} />;
  if (block.type === 'liquidity') {
    return fitted(
      pad,
      <LiquidityDesk
        block={block}
        theme={theme}
        api={api}
        titleSlot={edited(block.title, setText(edit, 'liquidity', 'title'))}
        buttonSlot={edited(block.button, setText(edit, 'liquidity', 'button'))}
        hintSlot={block.hint ? edited(block.hint, setText(edit, 'liquidity', 'hint')) : undefined}
        onRange={edit ? (next) => edit((current) => (current.type === 'liquidity' ? { ...current, ...next } : current)) : undefined}
      />,
    );
  }
  if (block.type === 'portfolio') return fitted(pad, <PortfolioView interactive />);
  if (block.type === 'calendar') return fitted(pad, <CalendarDesk block={block} theme={theme} titleSlot={edited(block.title, setText(edit, 'calendar', 'title'))} />);
  if (block.type === 'pulse') return fitted(pad, <PulseDesk block={block} theme={theme} titleSlot={edited(block.title, setText(edit, 'pulse', 'title'))} />);
  if (block.type === 'logo') return <LogoView block={block} theme={theme} onFile={onLogoFile ? (file) => onLogoFile(block.id, file) : undefined} />;
  if (block.type === 'enclaveMine') return fitted(pad, <MyEnclavesDesk block={block} theme={theme} live={api} />);
  if (block.type === 'enclaveOffers') return fitted(pad, <OffersDesk block={block} theme={theme} live={api} />);
  if (block.type === 'enclaveManage') return fitted(pad, <ManageEnclaveDesk block={block} theme={theme} live={api} />);
  if (block.type === 'enclavePortfolio') return fitted(pad, <EnclavePortfolioDesk block={block} theme={theme} />);
  return fitted(pad, <CreateEnclaveDesk block={block} theme={theme} live={api} />);
}

function LogoView({ block, theme, onFile }: { block: LogoBlock; theme: Theme; onFile?: (file: File) => void }) {
  const [broken, setBroken] = useState(false);
  const src = /^https?:\/\//i.test(block.src) ? block.src : '';
  useEffect(() => setBroken(false), [src]);
  const show = Boolean(src) && !broken;
  const pad = blockPad(block);
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden" style={{ ...cardStyle(theme), padding: pad }}>
      {show ? (
        <img src={src} alt={block.alt || 'Logo'} draggable={false} className="h-full w-full object-contain" onError={() => setBroken(true)} />
      ) : (
        <div className="grid h-full place-items-center">
          <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: theme.muted }}>
            Logo
          </span>
        </div>
      )}
      {!show && onFile ? (
        <label className="absolute inset-0 cursor-pointer">
          <span className="sr-only">Upload logo</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onFile(file);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

function FieldView({ block, theme, api, edit }: { block: FieldBlock; theme: Theme; api: PlayerApi; edit?: Patch }) {
  const onLabel = setText(edit, 'field', 'label');
  const pad = blockPad(block);
  const Tag = onLabel ? 'div' : 'label';
  return (
    <Tag className="flex h-full min-h-0 flex-col" style={{ gap: pad, padding: pad }}>
      <Label theme={theme} onCommit={onLabel}>
        {block.label}
      </Label>
      <TextField
        theme={theme}
        look={block.input}
        grow
        value={api.values[block.key] ?? ''}
        placeholder={block.placeholder}
        readOnly={!api.interactive}
        onChange={(value) => api.setValue(block.key, value)}
      />
    </Tag>
  );
}

function ButtonView({ block, theme, api, edit }: { block: ButtonBlock; theme: Theme; api: PlayerApi; edit?: Patch }) {
  return (
    <ActionButton
      theme={theme}
      look={block.style}
      fill
      pad={blockPad(block)}
      disabled={api.interactive && api.pending}
      onClick={() => {
        if (api.interactive) api.runAction(block.action, block.label);
      }}
    >
      {api.pending ? 'Signing…' : copy(block.label, setText(edit, 'button', 'label'))}
    </ActionButton>
  );
}

function MenuView({ block, theme, api, edit }: { block: MenuBlock; theme: Theme; api: PlayerApi; edit?: Patch }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 220 });
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = wrap.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 220) });
    };
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrap.current?.contains(target)) return;
      if (target instanceof HTMLElement && target.closest('[data-menu-panel]')) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const pad = blockPad(block);
  return (
    <div ref={wrap} className="h-full">
      <ActionButton
        theme={theme}
        fill
        pad={pad}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('[data-inline]')) return;
          setOpen((value) => !value);
        }}
      >
        {copy(block.label, setText(edit, 'menu', 'label'))}
      </ActionButton>
      {open
        ? createPortal(
            <div data-menu-panel="" className="fixed z-50 grid max-h-80 gap-2 overflow-auto p-2" style={{ ...cardStyle(theme), top: box.top, left: box.left, width: box.width }}>
              {block.items.length === 0 ? (
                <p className="px-2 py-2 text-sm" style={{ color: theme.muted }}>
                  Add buttons in the inspector.
                </p>
              ) : (
                block.items.map((item) => (
                  <ActionButton
                    key={item.id}
                    theme={theme}
                    onClick={() => {
                      setOpen(false);
                      if (api.interactive) api.runAction({ kind: 'link', href: item.href }, item.label);
                    }}
                  >
                    {item.label.trim() || 'Button'}
                  </ActionButton>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function walletDetail(api: PlayerApi) {
  return [api.usdc ? `${api.usdc} USDC` : '', api.chainOk ? '' : 'wrong network'].filter(Boolean).join(' · ');
}

function StatusDot({ color, hollow }: { color: string; hollow?: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: hollow ? 'transparent' : color, boxShadow: hollow ? `inset 0 0 0 1.5px ${color}` : undefined }}
    />
  );
}

function WalletView({ block, theme, api, onLabel }: { block: WalletBlock; theme: Theme; api: PlayerApi; onLabel?: (next: string) => void }) {
  const pad = blockPad(block);
  const linked = Boolean(api.address);
  const busy = api.interactive && api.pending;
  const address = shortAddr(api.address || '');
  const detail = linked ? walletDetail(api) : '';
  const connect = () => {
    if (api.interactive) api.connect();
  };
  const disconnect = () => {
    if (api.interactive) api.disconnect();
  };
  if (block.look === 'button') {
    return (
      <ActionButton theme={theme} fill pad={pad} radius={theme.radius} disabled={busy && !linked} onClick={linked ? disconnect : connect}>
        {linked ? (
          <span className="inline-flex max-w-full items-center gap-2">
            <StatusDot color={theme.accentInk} />
            <span className="truncate">{address}</span>
            {!api.chainOk ? <span className="shrink-0 opacity-70">wrong network</span> : null}
          </span>
        ) : (
          copy(block.label, onLabel)
        )}
      </ActionButton>
    );
  }
  if (block.look === 'account') return <WalletAccount block={block} theme={theme} pad={pad} onLabel={onLabel} linked={linked} busy={busy} address={address} detail={detail} chainOk={api.chainOk} connect={connect} disconnect={disconnect} />;
  if (block.look === 'hover') return <WalletHover block={block} theme={theme} api={api} pad={pad} onLabel={onLabel} linked={linked} busy={busy} address={address} detail={detail} connect={connect} disconnect={disconnect} />;
  return (
    <section className="flex h-full min-h-0 flex-col justify-center overflow-auto" style={{ ...cardStyle(theme), padding: pad, gap: pad }}>
      <div>
        <Label theme={theme}>Wallet · Arbitrum</Label>
        <p className="mt-1 text-sm">
          {linked ? address : 'Not connected'}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      {linked ? (
        <button type="button" className="text-sm underline" style={{ color: theme.muted }} onClick={disconnect}>
          Disconnect
        </button>
      ) : (
        <div className="w-full sm:w-auto sm:min-w-40">
          <ActionButton theme={theme} radius={theme.radius} disabled={busy} onClick={connect}>
            {copy(block.label, onLabel)}
          </ActionButton>
        </div>
      )}
    </section>
  );
}

function WalletAccount({
  block,
  theme,
  pad,
  onLabel,
  linked,
  busy,
  address,
  detail,
  chainOk,
  connect,
  disconnect,
}: {
  block: WalletBlock;
  theme: Theme;
  pad: number;
  onLabel?: (next: string) => void;
  linked: boolean;
  busy: boolean;
  address: string;
  detail: string;
  chainOk: boolean;
  connect: () => void;
  disconnect: () => void;
}) {
  const chrome = { borderRadius: theme.radius, background: theme.accent, color: theme.accentInk, padding: pad };
  const seam = { background: `color-mix(in srgb, ${theme.accentInk} 16%, transparent)` };
  const face = (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <StatusDot color={linked && !chainOk ? '#e3a008' : theme.accentInk} hollow={!linked} />
      <span className={`truncate ${linked ? '' : 'opacity-80'}`}>{linked ? address : 'Not connected'}</span>
      {detail ? <span className="shrink-0 opacity-70">{detail}</span> : null}
    </span>
  );
  const clearance = onLabel ? 'pr-14' : '';
  if (!linked) {
    return (
      <button type="button" disabled={busy} onClick={connect} className={`flex h-full min-h-11 w-full items-stretch overflow-hidden text-left text-sm disabled:opacity-45 ${clearance}`} style={chrome}>
        {face}
        <span className="flex shrink-0 items-center px-4 font-medium" style={seam}>
          {copy(block.label, onLabel)}
        </span>
      </button>
    );
  }
  return (
    <div className={`flex h-full min-h-11 w-full items-stretch overflow-hidden text-sm ${clearance}`} style={chrome}>
      {face}
      <button type="button" className="shrink-0 px-4 font-medium" style={seam} onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}

function WalletHover({
  block,
  theme,
  api,
  pad,
  onLabel,
  linked,
  busy,
  address,
  detail,
  connect,
  disconnect,
}: {
  block: WalletBlock;
  theme: Theme;
  api: PlayerApi;
  pad: number;
  onLabel?: (next: string) => void;
  linked: boolean;
  busy: boolean;
  address: string;
  detail: string;
  connect: () => void;
  disconnect: () => void;
}) {
  const [over, setOver] = useState(false);
  const swap = linked || Boolean(onLabel);
  const hot = swap && over;
  const quiet = `color-mix(in srgb, ${theme.ink} 8%, transparent)`;
  const line = `color-mix(in srgb, ${theme.ink} 18%, transparent)`;
  return (
    <button
      type="button"
      disabled={busy && !linked}
      aria-label={linked ? `Disconnect ${address}` : undefined}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      onClick={linked ? disconnect : connect}
      className={`relative flex h-full min-h-11 w-full items-center justify-center text-sm font-medium transition-colors duration-150 disabled:opacity-45 ${onLabel ? 'pr-14' : ''}`}
      style={{
        padding: pad,
        borderRadius: theme.radius,
        background: hot ? theme.accent : quiet,
        color: hot ? theme.accentInk : theme.ink,
        border: `1px solid ${hot ? 'transparent' : line}`,
      }}
    >
      <span className="flex min-w-0 items-center gap-2 transition-opacity duration-150" style={{ opacity: hot ? 0 : 1 }}>
        {linked ? <StatusDot color={api.chainOk ? theme.accent : '#e3a008'} /> : null}
        <span className="truncate">{linked ? address : copy(block.label, onLabel)}</span>
        {linked && detail ? <span className="shrink-0 opacity-60">{detail}</span> : null}
      </span>
      {swap ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150" style={{ opacity: hot ? 1 : 0 }} aria-hidden>
          Disconnect
        </span>
      ) : null}
    </button>
  );
}

function BalanceView({ block, theme, onLabel }: { block: BalanceBlock; theme: Theme; onLabel?: (next: string) => void }) {
  const wallet = useWallet();
  const pad = blockPad(block);
  const amount = block.asset === 'ETH' ? wallet.eth : wallet.usdc;
  const shown = wallet.address ? amount || '…' : '—';
  return (
    <section className="flex h-full min-h-0 flex-col justify-between overflow-auto" style={{ ...cardStyle(theme), padding: pad, gap: pad }}>
      <Label theme={theme} onCommit={onLabel}>
        {block.label}
      </Label>
      <p className={`text-4xl leading-none ${headline(theme.font)}`}>
        {shown}
        <span className="ml-2 text-lg" style={{ color: theme.muted }}>
          {block.asset}
        </span>
      </p>
      <p className="text-sm" style={{ color: theme.muted }}>
        {wallet.address ? shortAddr(wallet.address) : 'Connect a wallet'}
        {wallet.address && !wallet.chainOk ? ' · wrong network' : ''}
      </p>
    </section>
  );
}

function SpotView({ block, theme, api, edit }: { block: SpotBlock; theme: Theme; api: PlayerApi; edit?: Patch }) {
  const [asset, setAsset] = useState(block.asset);
  const [side, setSide] = useState(block.side);
  const [amount, setAmount] = useState(block.amount);
  const live = api.interactive;
  const current = live ? { asset, side, amount } : block;
  return (
    <Shell theme={theme} pad={blockPad(block)} kicker="Sendra spot" title={block.title} hint={block.hint} onTitle={setText(edit, 'spot', 'title')} onHint={setText(edit, 'spot', 'hint')}>
      <div className="grid grid-cols-2" style={{ gap: blockPad(block) }}>
        <Select
          theme={theme}
          value={current.asset}
          disabled={!live}
          options={SPOT_ASSETS.map((item) => ({ value: item, label: item }))}
          onChange={setAsset}
        />
        <Select
          theme={theme}
          value={current.side}
          disabled={!live}
          options={[
            { value: 'buy' as const, label: 'Buy' },
            { value: 'sell' as const, label: 'Sell' },
          ]}
          onChange={setSide}
        />
      </div>
      <TextField theme={theme} value={current.amount} readOnly={!live} placeholder="USDC" onChange={setAmount} />
      <ActionButton
        theme={theme}
        disabled={live && api.pending}
        onClick={() => live && api.runSpot({ ...block, asset: current.asset, side: current.side, amount: current.amount })}
      >
        {copy(block.button, setText(edit, 'spot', 'button'))}
      </ActionButton>
      <button type="button" className="text-left text-sm underline" style={{ color: theme.muted }} onClick={() => live && api.openSpot()}>
        Open Sendra account
      </button>
    </Shell>
  );
}

function MultiView({
  block,
  theme,
  api,
  edit,
  onLogoFile,
}: {
  block: MultiBlock;
  theme: Theme;
  api: PlayerApi;
  edit?: Patch;
  onLogoFile?: (id: string, file: File) => void;
}) {
  const items = block.items.slice(0, MULTI_CAP);
  const stored = items.length ? Math.max(0, Math.min(items.length - 1, block.active)) : 0;
  const [local, setLocal] = useState(stored);
  const index = items.length ? Math.max(0, Math.min(items.length - 1, edit ? stored : local)) : 0;
  const child = items[index];
  function pick(next: number) {
    if (edit) {
      edit((current) => (current.type === 'multi' ? { ...current, active: next } : current));
      return;
    }
    setLocal(next);
  }
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" style={{ ...cardStyle(theme), gap: blockPad(block) }}>
      <div
        className="flex shrink-0 items-center overflow-x-auto"
        style={{ gap: blockPad(block), padding: blockPad(block), borderBottom: `1px solid color-mix(in srgb, ${theme.ink} 12%, transparent)` }}
      >
        {block.title ? (
          <span className="shrink-0 pr-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.accent }}>
            {copy(block.title, setText(edit, 'multi', 'title'))}
          </span>
        ) : null}
        {items.map((item, itemIndex) => {
          const on = itemIndex === index;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(itemIndex)}
              className="shrink-0 rounded-full px-3 py-1 text-xs"
              style={{ background: on ? theme.accent : 'transparent', color: on ? theme.accentInk : theme.muted }}
            >
              {labelOf(item)}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {child ? (
          <BlockView
            key={child.id}
            block={child}
            theme={theme}
            api={api}
            onLogoFile={onLogoFile}
            edit={
              edit
                ? (recipe) =>
                    edit((current) => {
                      if (current.type !== 'multi') return current;
                      return { ...current, items: current.items.map((item) => (item.id === child.id ? recipe(item) : item)) };
                    })
                : undefined
            }
          />
        ) : (
          <p className="p-5 text-sm" style={{ color: theme.muted }}>
            Add up to five modules. The selector switches them.
          </p>
        )}
      </div>
    </section>
  );
}

function AaveView({ block, theme, api, edit }: { block: AaveBlock; theme: Theme; api: PlayerApi; edit?: Patch }) {
  const strategy = AAVE_STRATEGIES.find((item) => item.id === block.strategy) ?? AAVE_STRATEGIES[0];
  const [asset, setAsset] = useState(block.asset);
  const [amount, setAmount] = useState(block.amount);
  const [loops, setLoops] = useState(block.loops);
  const [short, setShort] = useState(block.short);
  const [assets, setAssets] = useState(block.assets);
  const [pair, setPair] = useState(block.pair);
  const [fee, setFee] = useState(block.fee);
  const live = api.interactive;
  const currentAsset = live ? asset : block.asset;
  const currentAmount = live ? amount : block.amount;
  const currentLoops = live ? loops : block.loops;
  const currentShort = live ? short : block.short;
  const currentAssets = live ? assets : block.assets;
  const currentPair = live ? pair : block.pair;
  const currentFee = live ? fee : block.fee;
  function toggleAsset(next: AaveAsset) {
    if (!live) return;
    setAssets((current) => {
      const on = current.includes(next);
      if (on && current.length === 1) return current;
      return AAVE_ASSETS.filter((item) => (item === next ? !on : current.includes(item)));
    });
  }
  return (
    <Shell theme={theme} pad={blockPad(block)} kicker={`Aave · ${strategy.name}`} title={block.title} hint={block.hint} onTitle={setText(edit, 'aave', 'title')} onHint={setText(edit, 'aave', 'hint')}>
      {block.strategy === 'basket' ? (
        <div className="flex flex-wrap" style={{ gap: blockPad(block) }}>
          {AAVE_ASSETS.map((item) => {
            const on = currentAssets.includes(item);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAsset(item)}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: on ? theme.accent : 'transparent', color: on ? theme.accentInk : theme.muted, border: `1px solid color-mix(in srgb, ${theme.ink} 16%, transparent)` }}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : block.strategy === 'lp' ? (
        <div className="grid grid-cols-2" style={{ gap: blockPad(block) }}>
          <Select theme={theme} value={currentPair} disabled={!live} options={PAIRS.map((item) => ({ value: item, label: item }))} onChange={(value: PairId) => setPair(value)} />
          <Select
            theme={theme}
            value={currentFee}
            disabled={!live}
            options={FEES.map((item) => ({ value: item, label: item === 500 ? '0.05%' : item === 3000 ? '0.3%' : '1%' }))}
            onChange={(value: FeeTier) => setFee(value)}
          />
        </div>
      ) : block.strategy === 'short' ? (
        <div className="grid grid-cols-2" style={{ gap: blockPad(block) }}>
          <div className="grid" style={{ gap: blockPad(block) }}>
            <Label theme={theme}>Collateral</Label>
            <Select theme={theme} value={currentAsset} disabled={!live} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={setAsset} />
          </div>
          <div className="grid" style={{ gap: blockPad(block) }}>
            <Label theme={theme}>Short</Label>
            <Select theme={theme} value={currentShort} disabled={!live} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={setShort} />
          </div>
        </div>
      ) : (
        <Select theme={theme} value={currentAsset} disabled={!live} options={AAVE_ASSETS.map((item) => ({ value: item, label: item }))} onChange={setAsset} />
      )}
      {block.strategy === 'loop' ? (
        <div className="flex flex-wrap" style={{ gap: blockPad(block) }}>
          {[1, 2, 3, 4, 5].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={currentLoops === item}
              onClick={() => live && setLoops(item)}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                background: currentLoops === item ? theme.accent : 'transparent',
                color: currentLoops === item ? theme.accentInk : theme.muted,
                border: `1px solid color-mix(in srgb, ${theme.ink} 16%, transparent)`,
              }}
            >
              {item}×
            </button>
          ))}
        </div>
      ) : null}
      <TextField theme={theme} value={currentAmount} readOnly={!live} placeholder="USDC" onChange={setAmount} />
      <ActionButton
        theme={theme}
        disabled={live && api.pending}
        onClick={() =>
          live &&
          api.runAave({
            ...block,
            asset: currentAsset,
            amount: currentAmount,
            loops: currentLoops,
            short: currentShort,
            assets: currentAssets,
            pair: currentPair,
            fee: currentFee,
          })
        }
      >
        {copy(block.button, setText(edit, 'aave', 'button'))}
      </ActionButton>
      <button type="button" className="text-left text-sm underline" style={{ color: theme.muted }} onClick={() => live && api.openAave()}>
        Open lending cell
      </button>
    </Shell>
  );
}
