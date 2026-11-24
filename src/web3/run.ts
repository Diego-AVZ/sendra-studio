import { createPublicClient, http, isAddress, parseUnits, zeroAddress } from 'viem';
import { arbitrum } from 'viem/chains';
import { connect, getAccount, sendTransaction, switchChain, writeContract } from 'wagmi/actions';
import type { AaveAsset, AaveStrategy, FeeTier, PairId, SpotAsset } from '@/schema/protocol';
import { explain } from '@/lib/uid';
import { ACCOUNTS_MANAGER_ABI, ENCLAVE_FACTORY_ABI, ERC20_ABI, LENDING_ACCOUNTS_ABI, LENDING_CELL_ABI } from '@/web3/abi';
import { AAVE_TOKEN, ACCOUNTS_MANAGER, ENCLAVE_FACTORY, LENDING_ACCOUNTS, LINK, UNI, USDC, WBTC, WETH } from '@/web3/addresses';
import { wagmiConfig } from '@/web3/config';

export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(import.meta.env.VITE_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'),
});

const SPOT: Record<SpotAsset, { address: `0x${string}`; decimals: number }> = {
  BTC: { address: WBTC, decimals: 8 },
  ETH: { address: WETH, decimals: 18 },
  AAVE: { address: AAVE_TOKEN, decimals: 18 },
  LINK: { address: LINK, decimals: 18 },
  UNI: { address: UNI, decimals: 18 },
};

const AAVE: Record<AaveAsset, `0x${string}`> = {
  USDC,
  BTC: WBTC,
  ETH: WETH,
  LINK,
  AAVE: AAVE_TOKEN,
};

const PAIR: Record<PairId, { base: `0x${string}`; quote: `0x${string}` }> = {
  'ETH/USDC': { base: WETH, quote: USDC },
  'BTC/USDC': { base: WBTC, quote: USDC },
  'LINK/USDC': { base: LINK, quote: USDC },
  'UNI/USDC': { base: UNI, quote: USDC },
};

export type Outcome = { text: string; href?: string };

type BuiltTx = { to: `0x${string}`; data: `0x${string}`; value?: bigint };

function isSet(address?: string): address is `0x${string}` {
  return !!address && /^0x[0-9a-fA-F]{40}$/.test(address) && address.toLowerCase() !== zeroAddress;
}

export function parseAmount(value: string, decimals: number) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error('Enter an amount.');
  const fraction = trimmed.split('.')[1] ?? '';
  if (fraction.length > decimals) throw new Error(`At most ${decimals} decimals.`);
  const amount = parseUnits(trimmed, decimals);
  if (amount <= 0n) throw new Error('The amount has to be greater than zero.');
  return amount;
}

function tx(hash: string, label: string): Outcome {
  return { text: label, href: `https://arbiscan.io/tx/${hash}` };
}

function builderBase() {
  return (import.meta.env.VITE_SENDRA_TX_BUILDER_URL || '').trim().replace(/\/$/, '');
}

export async function ensureWallet(): Promise<`0x${string}`> {
  let account = getAccount(wagmiConfig);
  if (!account.address) {
    const connector = wagmiConfig.connectors.find((item) => item.id === 'injected') ?? wagmiConfig.connectors[0];
    if (!connector) throw new Error('No wallet in this browser. Open MetaMask or Rabby.');
    try {
      await connect(wagmiConfig, { connector });
    } catch (err) {
      throw new Error(explain(err));
    }
    account = getAccount(wagmiConfig);
  }
  if (!account.address) throw new Error('Connect an injected wallet.');
  if (account.chainId !== arbitrum.id) {
    try {
      await switchChain(wagmiConfig, { chainId: arbitrum.id });
    } catch (err) {
      throw new Error(explain(err));
    }
  }
  const next = getAccount(wagmiConfig);
  if (!next.address) throw new Error('Connect a wallet.');
  return next.address;
}

async function ensureAllowance(owner: `0x${string}`, spender: `0x${string}`, amount: bigint) {
  const current = await publicClient.readContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });
  if (current >= amount) return;
  const hash = await writeContract(wagmiConfig, {
    address: USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
    chainId: arbitrum.id,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function ensureSpotAccount(owner: `0x${string}`) {
  const current = await publicClient.readContract({
    address: ACCOUNTS_MANAGER,
    abi: ACCOUNTS_MANAGER_ABI,
    functionName: 'accountByOwner',
    args: [owner],
  });
  if (isSet(current)) return { account: current, created: false };
  const hash = await writeContract(wagmiConfig, {
    address: ACCOUNTS_MANAGER,
    abi: ACCOUNTS_MANAGER_ABI,
    functionName: 'initializeAccount',
    chainId: arbitrum.id,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  const created = await publicClient.readContract({
    address: ACCOUNTS_MANAGER,
    abi: ACCOUNTS_MANAGER_ABI,
    functionName: 'accountByOwner',
    args: [owner],
  });
  if (!isSet(created)) throw new Error('The spot account did not appear.');
  return { account: created, created: true };
}

async function readCells(owner: `0x${string}`) {
  try {
    const cells = await publicClient.readContract({
      address: LENDING_ACCOUNTS,
      abi: LENDING_ACCOUNTS_ABI,
      functionName: 'cellsOf',
      args: [owner],
    });
    return cells.filter(isSet);
  } catch {
    const cell = await publicClient.readContract({
      address: LENDING_ACCOUNTS,
      abi: LENDING_ACCOUNTS_ABI,
      functionName: 'cellByOwner',
      args: [owner],
    });
    return isSet(cell) ? [cell] : [];
  }
}

async function ensureCell(owner: `0x${string}`) {
  const before = await readCells(owner);
  if (before[0]) return { cell: before[0], created: false };
  const hash = await writeContract(wagmiConfig, {
    address: LENDING_ACCOUNTS,
    abi: LENDING_ACCOUNTS_ABI,
    functionName: 'open',
    chainId: arbitrum.id,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  const after = await readCells(owner);
  const cell = after[0];
  if (!cell) throw new Error('The lending cell did not appear.');
  return { cell, created: true };
}

function identityUsdc(amount: bigint) {
  return {
    tokenIn: USDC,
    tokenOut: USDC,
    swapInstructions: [] as [],
    amountIn0: amount,
    to: zeroAddress,
  };
}

function asAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== 'string' || !isAddress(value)) throw new Error(`${label} is not an address.`);
  return value;
}

function asData(value: unknown): `0x${string}` {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) throw new Error('The builder returned invalid calldata.');
  return value as `0x${string}`;
}

function parseTxs(raw: unknown): BuiltTx[] {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(raw) ? raw : Array.isArray(record.transactions) ? record.transactions : record.to ? [record] : [];
  if (!Array.isArray(list) || list.length === 0) throw new Error('The builder returned no transactions.');
  return list.map((item) => {
    const row = item as { to?: unknown; data?: unknown; value?: unknown };
    const value = typeof row.value === 'string' && row.value ? BigInt(row.value) : 0n;
    return { to: asAddress(row.to, 'The destination'), data: asData(row.data), value };
  });
}

async function askBuilder(path: string, body: unknown) {
  const base = builderBase();
  if (!base) return null;
  const res = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 220);
    throw new Error(detail || 'The Transaction Builder rejected the order.');
  }
  return parseTxs((await res.json()) as unknown);
}

async function sendAll(txs: BuiltTx[]) {
  let last = '' as `0x${string}`;
  for (const txItem of txs) {
    const hash = await sendTransaction(wagmiConfig, {
      to: txItem.to,
      data: txItem.data,
      value: txItem.value ?? 0n,
      chainId: arbitrum.id,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    last = hash;
  }
  return last;
}

export async function openSpotAccount(): Promise<Outcome> {
  const owner = await ensureWallet();
  const { account, created } = await ensureSpotAccount(owner);
  return { text: created ? `Spot account created ${account}` : `Spot account ready ${account}` };
}

export async function openLendingCell(): Promise<Outcome> {
  const owner = await ensureWallet();
  const { cell, created } = await ensureCell(owner);
  return { text: created ? `Lending cell created ${cell}` : `Lending cell ready ${cell}` };
}

export async function runSpot(input: { asset: SpotAsset; side: 'buy' | 'sell'; amount: string }): Promise<Outcome> {
  if (!builderBase()) {
    throw new Error('The swap is signed through the Sendra Transaction Builder. VITE_SENDRA_TX_BUILDER_URL is missing. The other button opens the account.');
  }
  const owner = await ensureWallet();
  const market = SPOT[input.asset];
  const amount = input.side === 'buy' ? parseAmount(input.amount, 6) : parseAmount(input.amount, market.decimals);
  const { account } = await ensureSpotAccount(owner);
  const txs = await askBuilder('spot', {
    chainId: arbitrum.id,
    owner,
    account,
    asset: input.asset,
    token: market.address,
    side: input.side,
    amount: input.amount.trim(),
    amountRaw: amount.toString(),
  });
  if (!txs) throw new Error('The builder did not respond.');
  if (input.side === 'buy') await ensureAllowance(owner, account, amount);
  const hash = await sendAll(txs);
  return tx(hash, `Spot ${input.side === 'buy' ? 'buy' : 'sell'} ${input.asset} sent.`);
}

export async function runAave(input: {
  asset: AaveAsset;
  amount: string;
  strategy?: AaveStrategy;
  loops?: number;
  short?: AaveAsset;
  assets?: AaveAsset[];
  pair?: PairId;
  fee?: FeeTier;
}): Promise<Outcome> {
  const strategy = input.strategy ?? 'supply';
  const amount = parseAmount(input.amount, 6);
  if (strategy !== 'supply' && !builderBase()) {
    throw new Error(`Aave ${strategy} is signed through the Sendra Transaction Builder. VITE_SENDRA_TX_BUILDER_URL is missing.`);
  }
  if (strategy === 'supply' && input.asset !== 'USDC' && !builderBase()) {
    throw new Error(`Supplying ${input.asset} needs the Uniswap route from the Transaction Builder.`);
  }
  const owner = await ensureWallet();
  const { cell } = await ensureCell(owner);
  if (strategy !== 'supply' || input.asset !== 'USDC') {
    const txs = await askBuilder('aave', {
      chainId: arbitrum.id,
      owner,
      cell,
      strategy,
      asset: input.asset,
      token: AAVE[input.asset],
      amount: input.amount.trim(),
      amountRaw: amount.toString(),
      loops: input.loops,
      short: input.short,
      shortToken: input.short ? AAVE[input.short] : undefined,
      assets: input.assets,
      pair: input.pair,
      fee: input.fee,
    });
    if (!txs) throw new Error('The builder did not respond.');
    await ensureAllowance(owner, cell, amount);
    const hash = await sendAll(txs);
    return tx(hash, `Aave ${strategy} sent.`);
  }
  await ensureAllowance(owner, cell, amount);
  const hash = await writeContract(wagmiConfig, {
    address: cell,
    abi: LENDING_CELL_ABI,
    functionName: 'openSupply',
    args: [USDC, amount, identityUsdc(amount)],
    chainId: arbitrum.id,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('The supply reverted.');
  return tx(hash, 'USDC supplied on Aave.');
}

export async function runLiquidity(input: { pair: PairId; fee: FeeTier; amount: string }): Promise<Outcome> {
  if (!builderBase()) {
    throw new Error('Liquidity is signed through the Transaction Builder. The other button opens the spot account.');
  }
  const owner = await ensureWallet();
  const amount = parseAmount(input.amount, 6);
  const { account } = await ensureSpotAccount(owner);
  const pair = PAIR[input.pair];
  const txs = await askBuilder('liquidity', {
    chainId: arbitrum.id,
    owner,
    account,
    pair: input.pair,
    fee: input.fee,
    base: pair.base,
    quote: pair.quote,
    amount: input.amount.trim(),
    amountRaw: amount.toString(),
  });
  if (!txs) throw new Error('The builder did not respond.');
  await ensureAllowance(owner, account, amount);
  const hash = await sendAll(txs);
  return tx(hash, `Liquidity ${input.pair} sent.`);
}

export async function runEnclave(input: {
  capital: string;
  minTx: string;
  maxTx: string;
  days: number;
  feePct: number;
  operator: string;
  openOperator: boolean;
  description: string;
}): Promise<Outcome> {
  const capital = parseAmount(input.capital, 6);
  const minTx = parseAmount(input.minTx, 6);
  const maxTx = parseAmount(input.maxTx, 6);
  if (minTx > maxTx) throw new Error('The minimum per transaction is above the maximum.');
  if (maxTx > capital) throw new Error('The maximum per transaction is above the credit.');
  if (input.days < 1) throw new Error('The duration has to be at least one day.');
  if (!input.openOperator && !isAddress(input.operator)) {
    throw new Error('Enter the operator, or leave the enclave open to anyone.');
  }
  const owner = await ensureWallet();
  const params = {
    creditInUsd: capital,
    maxUsdcPerTx: maxTx,
    minUsdcPerTx: minTx,
    deadline: BigInt(Math.floor(Date.now() / 1000) + input.days * 86400),
    operatorFee: BigInt(Math.max(0, Math.min(100, Math.round(input.feePct)))),
    allowedTokens: [] as `0x${string}`[],
    allowedOperator: input.openOperator ? zeroAddress : (input.operator as `0x${string}`),
    lender: owner,
    description: input.description.slice(0, 180),
  };
  try {
    await publicClient.simulateContract({
      address: ENCLAVE_FACTORY,
      abi: ENCLAVE_FACTORY_ABI,
      functionName: 'createEnclave',
      args: [params],
      account: owner,
    });
  } catch (err) {
    throw new Error(explain(err));
  }
  const hash = await writeContract(wagmiConfig, {
    address: ENCLAVE_FACTORY,
    abi: ENCLAVE_FACTORY_ABI,
    functionName: 'createEnclave',
    args: [params],
    chainId: arbitrum.id,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Enclave creation reverted.');
  return tx(hash, 'Enclave created.');
}
