import { useEffect, useState } from 'react';
import { decodeAbiParameters, formatUnits } from 'viem';
import { useWallet } from '@/web3/useWallet';
import { publicClient } from '@/web3/run';
import { SENDRA_STORAGE } from '@/web3/addresses';
import { storageAbi } from '@/player/Portfolio';

const SYMBOLS: Record<string, string> = {
  '0x47c031236e19d024b42f8ae6780e44a573170703': 'BTC',
  '0x70d95587d40a2caf56bd97485ab3eec10bee6336': 'ETH',
  '0x7f1fa204bb700853d36994da19f830b6ad18455c': 'LINK',
  '0x09400d9db990d5ed3f35d7be61dfaeb900af03c9': 'SOL',
  '0x7b2d09fca2395713dcc2f67323e4876f27b9ecb2': 'DOT',
  '0x7bbbf946883a5701350007320f525c5379b8178a': 'AVAX',
  '0x2d340912aa47e33c90efb078e69e70efe2b34b9b': 'BNB',
  '0x6853ea96ff216fab11d2d930ce3c508556a4bdc4': 'DOGE',
  '0x2b477989a149b17073d9c9c82ec9cb03591e20c6': 'PEPE',
  '0x0418643f94ef14917f1345ce5c460c37de463ef7': 'WIF',
  '0x784292e87715d93afd7cb8c941bacafaaa9a5102': 'PENDLE',
  '0xc25cef6061cf5de5eb761b50e4743c1f5d7e5407': 'ARB',
  '0x4fdd333ff9ca409df583f306b6f5a7ffde790739': 'OP',
  '0xdab21c4d1f569486334c93685da2b3f9b0a078e8': 'APE',
  '0x55391d178ce46e7ac8eaa50a72d1a5a8a622da': 'GMX',
  '0x1cbba6346f110c8a5ea739ef2d1eb182990e4eb2': 'AAVE',
  '0xc7abb2c5f3bf3ceb389df0eecd6120d451170b50': 'UNI',
  '0xcacb964144f9056a8f99447a303e60b4873ca9b4': 'ADA',
  '0xe55e1a29985488a2c8846a91e925c2b7c6564db1': 'TAO',
  '0x248c35760068ce009a13076d573ed3497a47bcd4': 'ATOM',
  '0xe61e608ba010ff48a7dce8edd8b906744263d33e': 'LDO',
  '0x63dc80ee90f26363b3fcd609007cc9e14c8991be': 'NEAR',
  '0xbeb1f4ebc9af627ca1e5a75981ce1ae97efeda22': 'TIA',
  '0xde967676db7b1ccdba2bd94b01b5b19de4b563e4': 'CAKE',
  '0x9e79146b3a022af44e0708c6794f03ef798381a5': 'ZRO',
  '0xfec8f404fbca3b11afd3b3f0c57507c2a06de636': 'TRUMP',
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'ETH',
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USDC',
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT',
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'BTC',
  '0xf97f4df75117a78c1a5a0dbb814af92458539fb4': 'LINK',
  '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0': 'UNI',
  '0xba5ddd1f9d7f570dc94a51479a000e3bce967196': 'AAVE',
};

export type MarkKind = 'pair' | 'lp' | 'enclave' | 'spot' | 'aave';

export type Mark = {
  key: string;
  id: string;
  kind: MarkKind;
  label: string;
  pnl: number;
  open: number;
  close: number;
  active: boolean;
};

export type PulseRecord = {
  capitalIn: number;
  capitalOut: number;
  realized: number;
  grossLoss: number;
  losingCapital: number;
  opened: number;
  closed: number;
  wins: number;
  duration: number;
  first: number;
  last: number;
  exposure: number;
};

type RawPosition = {
  positionType: bigint | number;
  id: bigint;
  pnl: bigint;
  isActive: boolean;
  positionData: readonly `0x${string}`[];
};

const AAVE = ['', '', '', '', '', 'Supply', 'Loop', 'Short', 'LP', 'Basket'];

function symbol(address: string) {
  const key = address.toLowerCase();
  return SYMBOLS[key] ?? `${address.slice(0, 6)}…`;
}

function word(data: readonly `0x${string}`[], index: number, type: 'uint256' | 'address') {
  const raw = data[index];
  if (!raw) return type === 'address' ? '' : 0n;
  try {
    return decodeAbiParameters([{ type }], raw)[0] as bigint | string;
  } catch {
    return type === 'address' ? '' : 0n;
  }
}

function unix(value: bigint) {
  if (value <= 0n) return 0;
  let n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 10_000_000_000 && n < 10_000_000_000_000) n = Math.floor(n / 1000);
  const latest = Date.now() / 1000 + 86_400;
  if (n < 1_577_836_800 || n > latest) return 0;
  return Math.floor(n);
}

function signed(value: bigint) {
  const neg = value < 0n;
  const n = Number(formatUnits(neg ? -value : value, 6));
  return neg ? -n : n;
}

function plain(value: bigint) {
  return Number(formatUnits(value, 6));
}

function markFrom(wallet: string, position: RawPosition): Mark {
  const type = Number(position.positionType);
  const data = position.positionData ?? [];
  const base = {
    key: `${wallet.toLowerCase()}:${position.id}`,
    id: position.id.toString(),
    pnl: signed(position.pnl),
    active: position.isActive,
  };
  const addr = (index: number) => symbol(String(word(data, index, 'address')));
  const at = (index: number) => unix(word(data, index, 'uint256') as bigint);
  if (type === 0 && data.length > 10) {
    return { ...base, kind: 'pair', label: `${addr(2)}/${addr(3)}`, open: at(9), close: at(10) };
  }
  if (type === 2 && data.length > 2) {
    return { ...base, kind: 'lp', label: `${addr(0)}/${addr(1)}`, open: at(2), close: data.length > 16 ? at(16) : 0 };
  }
  if (type === 3 && data.length > 5) {
    return { ...base, kind: 'enclave', label: 'Enclave', open: at(1) || at(2), close: at(5) };
  }
  if (type === 4 && data.length > 7) {
    return { ...base, kind: 'spot', label: addr(0), open: at(2), close: at(7) };
  }
  if (type >= 5 && type <= 9 && data.length > 9) {
    return { ...base, kind: 'aave', label: `${AAVE[type]} ${addr(0)}`, open: at(2), close: at(9) };
  }
  const kind: MarkKind = type === 2 ? 'lp' : type === 3 ? 'enclave' : type === 4 ? 'spot' : type >= 5 && type <= 9 ? 'aave' : 'pair';
  const name = kind === 'pair' ? 'Pair' : kind === 'lp' ? 'Liquidity' : kind === 'enclave' ? 'Enclave' : kind === 'spot' ? 'Spot' : 'Aave';
  return { ...base, kind, label: name, open: 0, close: 0 };
}

function toPulse(books: {
  totalCapitalIn: bigint;
  totalCapitalOut: bigint;
  cumulativeRealizedPnl: bigint;
  grossLoss: bigint;
  totalLosingCapitalIn: bigint;
  totalPositionsOpened: bigint;
  totalPositionsClosed: bigint;
  winCount: bigint;
  totalDurationSeconds: bigint;
  firstActivityTimestamp: bigint;
  lastActivityTimestamp: bigint;
  currentExposure: bigint;
}): PulseRecord {
  return {
    capitalIn: plain(books.totalCapitalIn),
    capitalOut: plain(books.totalCapitalOut),
    realized: signed(books.cumulativeRealizedPnl),
    grossLoss: plain(books.grossLoss),
    losingCapital: plain(books.totalLosingCapitalIn),
    opened: Number(books.totalPositionsOpened),
    closed: Number(books.totalPositionsClosed),
    wins: Number(books.winCount),
    duration: Number(books.totalDurationSeconds),
    first: unix(books.firstActivityTimestamp),
    last: unix(books.lastActivityTimestamp),
    exposure: plain(books.currentExposure),
  };
}

async function readPulse(address: `0x${string}`) {
  const books = await publicClient.readContract({
    address: SENDRA_STORAGE,
    abi: storageAbi,
    functionName: 'getUserGlobalAccumulators',
    args: [address],
  });
  return toPulse(books);
}

async function readAccounting(address: `0x${string}`) {
  const count = Number(
    await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getAccountingPositionCount', args: [address] }),
  );
  const marks: Mark[] = [];
  for (let start = 0; start < count; start += 30) {
    const end = Math.min(count, start + 30);
    const batch = await publicClient.multicall({
      allowFailure: true,
      contracts: Array.from({ length: end - start }, (_, offset) => ({
        address: SENDRA_STORAGE,
        abi: storageAbi,
        functionName: 'getAccountingPosition' as const,
        args: [address, BigInt(start + offset)] as const,
      })),
    });
    for (const item of batch) {
      if (item.status !== 'success') continue;
      const [wallet, , position] = item.result;
      marks.push(markFrom(wallet, position));
    }
  }
  marks.reverse();
  const pulse = await readPulse(address).catch(() => null);
  return { marks, pulse };
}

async function readOwn(address: `0x${string}`) {
  const known = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'isUser', args: [address] });
  if (!known) return { marks: [] as Mark[], pulse: null };
  const id = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserIdByAddress', args: [address] });
  const data = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserDataById', args: [id] });
  const total = Number(data[0].totalPositions);
  const marks: Mark[] = [];
  for (let end = total; end >= 1; end -= 40) {
    const from = Math.max(1, end - 39);
    const positions = await publicClient.readContract({
      address: SENDRA_STORAGE,
      abi: storageAbi,
      functionName: 'getUserPositionsByRange',
      args: [address, BigInt(from), BigInt(end)],
    });
    marks.push(...[...positions].reverse().map((position) => markFrom(address, position)));
  }
  const pulse = await readPulse(address).catch(() => null);
  return { marks, pulse };
}

export function useLedger() {
  const wallet = useWallet();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pulse, setPulse] = useState<PulseRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const address = wallet.address as `0x${string}` | undefined;
    if (!address) {
      setMarks([]);
      setPulse(null);
      setNote('');
      setBusy(false);
      return;
    }
    let alive = true;
    setBusy(true);
    setNote('');
    void readAccounting(address)
      .catch(() => readOwn(address))
      .then((loaded) => {
        if (!alive) return;
        setMarks(loaded.marks);
        setPulse(loaded.pulse);
        setNote(loaded.marks.length ? '' : 'No positions found');
      })
      .catch((err: unknown) => {
        if (alive) setNote(err instanceof Error ? err.message : 'SendraStorage did not answer.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [wallet.address]);

  return { address: wallet.address, marks, pulse, busy, note };
}
