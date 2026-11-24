import { useEffect, useState } from 'react';
import { decodeAbiParameters, formatUnits } from 'viem';
import type { ChartInterval, SpotAsset } from '@/schema/protocol';
import { SPOT_ASSETS } from '@/schema/protocol';
import { AAVE_TOKEN, LINK, SENDRA_STORAGE, UNI, WBTC, WETH } from '@/web3/addresses';
import { publicClient } from '@/web3/run';

const HL = 'https://api.hyperliquid.xyz/info';

export const SPOT_MARKET: Record<SpotAsset, { address: `0x${string}`; decimals: number; receipt: string }> = {
  BTC: { address: WBTC, decimals: 8, receipt: 'senBTC' },
  ETH: { address: WETH, decimals: 18, receipt: 'senETH' },
  AAVE: { address: AAVE_TOKEN, decimals: 18, receipt: 'senAAVE' },
  LINK: { address: LINK, decimals: 18, receipt: 'senLINK' },
  UNI: { address: UNI, decimals: 18, receipt: 'senUNI' },
};

const LOOKBACK: Record<ChartInterval, number> = {
  '15m': 36 * 15 * 60_000,
  '1h': 48 * 60 * 60_000,
  '4h': 42 * 4 * 60 * 60_000,
  '1d': 30 * 24 * 60 * 60_000,
};

export type Quote = { px: number; prev: number };

export function spotAssetOf(underlying: string): SpotAsset | null {
  const key = underlying.toLowerCase();
  return (Object.keys(SPOT_MARKET) as SpotAsset[]).find((asset) => SPOT_MARKET[asset].address.toLowerCase() === key) ?? null;
}

export function tokenText(amount: bigint, decimals: number) {
  return formatUnits(amount, decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function sliceTokens(amount: bigint, bps: number) {
  return (amount * BigInt(bps)) / 10_000n;
}

export function usd(value: number, signed = false) {
  const abs = Math.abs(value);
  const digits = abs >= 0.0001 && abs < 0.01 ? 4 : 2;
  const text = abs.toLocaleString('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: digits });
  if (!signed || abs < 0.005) return text;
  return `${value > 0 ? '+' : '−'}${text}`;
}

export function priceText(value: number) {
  const digits = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return value.toLocaleString('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: digits });
}

async function postInfo<T>(body: unknown): Promise<T> {
  const res = await fetch(HL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Hyperliquid did not answer.');
  return (await res.json()) as T;
}

export function useQuotes(active: boolean) {
  const [quotes, setQuotes] = useState<Partial<Record<SpotAsset, Quote>>>({});
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const [meta, ctxs] = await postInfo<[{ universe: { name: string }[] }, { markPx?: string; midPx?: string; prevDayPx?: string }[]]>({
        type: 'metaAndAssetCtxs',
      });
      const next: Partial<Record<SpotAsset, Quote>> = {};
      meta.universe.forEach((asset, index) => {
        if (!(SPOT_ASSETS as readonly string[]).includes(asset.name)) return;
        const ctx = ctxs[index];
        const px = Number(ctx?.midPx || ctx?.markPx);
        const prev = Number(ctx?.prevDayPx);
        if (Number.isFinite(px) && px > 0) next[asset.name as SpotAsset] = { px, prev: Number.isFinite(prev) && prev > 0 ? prev : px };
      });
      if (alive) setQuotes(next);
    };
    void load().catch(() => undefined);
    const id = window.setInterval(() => void load().catch(() => undefined), 8_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [active]);
  return quotes;
}

export function useCandles(coin: string, interval: ChartInterval, active: boolean) {
  const [candles, setCandles] = useState<number[]>([]);
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const rows = await postInfo<{ c: string | number }[]>({
        type: 'candleSnapshot',
        req: { coin, interval, startTime: Date.now() - LOOKBACK[interval] },
      });
      const closes = rows.map((row) => Number(row.c)).filter((value) => Number.isFinite(value) && value > 0);
      if (!alive) return;
      setCandles(closes);
      setQuiet(closes.length < 2);
    };
    void load().catch(() => {
      if (alive) setQuiet(true);
    });
    const id = window.setInterval(() => void load().catch(() => undefined), 20_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [active, coin, interval]);
  return { candles, quiet };
}

const storageAbi = [
  {
    type: 'function',
    name: 'isUser',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getUserDataById',
    stateMutability: 'view',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'globalPnl', type: 'int256' },
          { name: 'totalPositions', type: 'uint256' },
          { name: 'activePositions', type: 'uint256' },
          { name: 'transactionCount', type: 'uint256' },
          { name: 'userData', type: 'bytes[]' },
        ],
      },
      { type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'getUserIdByAddress',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAccountingPositionCount',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAccountingPosition',
    stateMutability: 'view',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_index', type: 'uint256' },
    ],
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'positionId', type: 'uint256' },
      {
        type: 'tuple',
        name: 'position',
        components: [
          { name: 'positionType', type: 'uint128' },
          { name: 'id', type: 'uint256' },
          { name: 'pnl', type: 'int256' },
          { name: 'isActive', type: 'bool' },
          { name: 'positionData', type: 'bytes[]' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getUserPositionsByRange',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_fromId', type: 'uint256' },
      { name: '_toId', type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'positionType', type: 'uint8' },
          { name: 'id', type: 'uint256' },
          { name: 'pnl', type: 'int256' },
          { name: 'isActive', type: 'bool' },
          { name: 'positionData', type: 'bytes[]' },
        ],
      },
    ],
  },
] as const;

function decodeSpot(words: readonly `0x${string}`[]) {
  if (words.length < 10) return null;
  const word = (index: number, type: 'address' | 'uint256') => decodeAbiParameters([{ type }], words[index])[0];
  try {
    return {
      underlying: String(word(0, 'address')),
      tokenAmount: word(4, 'uint256') as bigint,
      usdcOut: word(6, 'uint256') as bigint,
      closedAt: word(7, 'uint256') as bigint,
      principal: word(8, 'uint256') as bigint,
    };
  } catch {
    return null;
  }
}

export type SpotRow = {
  id: string;
  owner: `0x${string}`;
  asset: SpotAsset | null;
  closed: boolean;
  tokenAmount: bigint;
  decimals: number;
  receipt: string;
  principal: number;
  received: number;
  amount: number;
};

function spotRow(owner: `0x${string}`, id: bigint, words: readonly `0x${string}`[], active: boolean): SpotRow | null {
  const decoded = decodeSpot(words);
  if (!decoded) return null;
  const asset = spotAssetOf(decoded.underlying);
  const market = asset ? SPOT_MARKET[asset] : null;
  const decimals = market?.decimals ?? 18;
  return {
    id: id.toString(),
    owner,
    asset,
    closed: !active || decoded.closedAt > 0n,
    tokenAmount: decoded.tokenAmount,
    decimals,
    receipt: market?.receipt ?? 'token',
    principal: Number(formatUnits(decoded.principal, 6)),
    received: Number(formatUnits(decoded.usdcOut, 6)),
    amount: Number(formatUnits(decoded.tokenAmount, decimals)),
  };
}

async function readAccountingSpot(owner: `0x${string}`) {
  const count = Number(
    await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getAccountingPositionCount', args: [owner] }),
  );
  const rows: SpotRow[] = [];
  let missed = false;
  for (let start = 0; start < count; start += 30) {
    const end = Math.min(count, start + 30);
    const batch = await publicClient.multicall({
      allowFailure: true,
      contracts: Array.from({ length: end - start }, (_, offset) => ({
        address: SENDRA_STORAGE,
        abi: storageAbi,
        functionName: 'getAccountingPosition' as const,
        args: [owner, BigInt(start + offset)] as const,
      })),
    });
    for (const item of batch) {
      if (item.status !== 'success') {
        missed = true;
        continue;
      }
      const [wallet, , position] = item.result;
      if (Number(position.positionType) !== 4) continue;
      const row = spotRow(wallet, position.id, position.positionData, position.isActive);
      if (row) rows.push(row);
    }
  }
  rows.reverse();
  return { rows, truncated: missed };
}

async function readOwnSpot(owner: `0x${string}`) {
  const known = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'isUser', args: [owner] });
  if (!known) return { rows: [] as SpotRow[], truncated: false };
  const id = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserIdByAddress', args: [owner] });
  const data = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserDataById', args: [id] });
  const total = Number(data[0].totalPositions);
  const rows: SpotRow[] = [];
  for (let end = total; end >= 1; end -= 40) {
    const from = Math.max(1, end - 39);
    const positions = await publicClient.readContract({
      address: SENDRA_STORAGE,
      abi: storageAbi,
      functionName: 'getUserPositionsByRange',
      args: [owner, BigInt(from), BigInt(end)],
    });
    for (const item of [...positions].reverse()) {
      if (item.positionType !== 4) continue;
      const row = spotRow(owner, item.id, item.positionData, item.isActive);
      if (row) rows.push(row);
    }
  }
  return { rows, truncated: false };
}

export async function readSpotBook(owner: `0x${string}`) {
  try {
    return await readAccountingSpot(owner);
  } catch {
    return readOwnSpot(owner);
  }
}
