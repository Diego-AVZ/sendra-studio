import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { shortAddr } from '@/lib/uid';
import { useWallet } from '@/web3/useWallet';
import { ensureWallet, publicClient } from '@/web3/run';
import { SENDRA_STORAGE } from '@/web3/addresses';

export const storageAbi = [
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
    name: 'getUserGlobalAccumulators',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'totalCapitalIn', type: 'uint256' },
          { name: 'totalCapitalOut', type: 'uint256' },
          { name: 'peakSimultaneousExposure', type: 'uint256' },
          { name: 'currentExposure', type: 'uint256' },
          { name: 'cumulativeRealizedPnl', type: 'int256' },
          { name: 'grossProfit', type: 'uint256' },
          { name: 'grossLoss', type: 'uint256' },
          { name: 'highWaterMark', type: 'int256' },
          { name: 'maxDrawdown', type: 'uint256' },
          { name: 'totalPositionsOpened', type: 'uint256' },
          { name: 'totalPositionsClosed', type: 'uint256' },
          { name: 'winCount', type: 'uint256' },
          { name: 'lossCount', type: 'uint256' },
          { name: 'totalDurationSeconds', type: 'uint256' },
          { name: 'firstActivityTimestamp', type: 'uint256' },
          { name: 'lastActivityTimestamp', type: 'uint256' },
          { name: 'totalLiquidationEvents', type: 'uint256' },
          { name: 'consecutiveLosses', type: 'uint256' },
          { name: 'maxConsecutiveLosses', type: 'uint256' },
          { name: 'totalLosingCapitalIn', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getAccountingOverview',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'userId', type: 'uint256' },
          { name: 'root', type: 'address' },
          { name: 'globalPnl', type: 'int256' },
          { name: 'totalPositions', type: 'uint256' },
          { name: 'activePositions', type: 'uint256' },
          { name: 'transactionCount', type: 'uint256' },
          { name: 'walletCount', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getAccountingWallets',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [{ name: 'wallets', type: 'address[]' }],
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

const KIND: Record<number, string> = {
  0: 'Pair',
  2: 'Liquidity',
  3: 'Enclave',
  4: 'Spot',
  5: 'Aave supply',
  6: 'Aave loop',
  7: 'Aave short',
  8: 'Aave LP',
  9: 'Aave basket',
};

type Row = { key: string; id: string; kind: string; active: boolean; pnl: bigint; wallet: string };
type Book = { value: bigint; realized: bigint; unrealized: bigint; capital: bigint; open: number; total: number };
type Filter = 'all' | 'active' | 'closed';

function usd(value: bigint, signed = false) {
  const neg = value < 0n;
  const text = Number(formatUnits(neg ? -value : value, 6)).toLocaleString('en', { style: 'currency', currency: 'USD' });
  if (!signed || value === 0n) return neg ? `-${text}` : text;
  return `${neg ? '-' : '+'}${text}`;
}

function tone(value: bigint) {
  return value > 0n ? 'pf-up' : value < 0n ? 'pf-down' : '';
}

function rowFrom(wallet: string, id: bigint, positionType: bigint | number, active: boolean, pnl: bigint, labelWallet: boolean): Row {
  const type = Number(positionType);
  return {
    key: `${wallet.toLowerCase()}:${id}`,
    id: id.toString(),
    kind: KIND[type] ?? `Type ${type}`,
    active,
    pnl,
    wallet: labelWallet ? shortAddr(wallet) : '',
  };
}

async function readAccounting(address: `0x${string}`) {
  const count = Number(
    await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getAccountingPositionCount', args: [address] }),
  );
  const [overview, wallets, books] = await Promise.all([
    publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getAccountingOverview', args: [address] }),
    publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getAccountingWallets', args: [address] }),
    publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserGlobalAccumulators', args: [address] }),
  ]);
  const labelWallet = wallets.length > 1;
  const rows: Row[] = [];
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
      rows.push(rowFrom(wallet, position.id, position.positionType, position.isActive, position.pnl, labelWallet));
    }
  }
  rows.reverse();
  return {
    rows,
    books,
    open: Number(overview.activePositions),
    total: Number(overview.totalPositions),
  };
}

async function readOwnWallet(address: `0x${string}`) {
  const known = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'isUser', args: [address] });
  if (!known) return { rows: [] as Row[], books: null, open: 0, total: 0 };
  const id = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserIdByAddress', args: [address] });
  const data = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserDataById', args: [id] });
  const info = data[0];
  const books = await publicClient.readContract({ address: SENDRA_STORAGE, abi: storageAbi, functionName: 'getUserGlobalAccumulators', args: [address] });
  const total = Number(info.totalPositions);
  const rows: Row[] = [];
  for (let end = total; end >= 1; end -= 40) {
    const from = Math.max(1, end - 39);
    const positions = await publicClient.readContract({
      address: SENDRA_STORAGE,
      abi: storageAbi,
      functionName: 'getUserPositionsByRange',
      args: [address, BigInt(from), BigInt(end)],
    });
    rows.push(...[...positions].reverse().map((item) => rowFrom(address, item.id, item.positionType, item.isActive, item.pnl, false)));
  }
  return { rows, books, open: Number(info.activePositions), total };
}

export function PortfolioView({ interactive = true, board = false }: { interactive?: boolean; board?: boolean }) {
  const wallet = useWallet();
  const [rows, setRows] = useState<Row[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const address = wallet.address as `0x${string}` | undefined;
    if (!address) {
      setRows([]);
      setBook(null);
      setNote(interactive ? '' : 'Visitors connect a wallet and read their Sendra book.');
      return;
    }
    let alive = true;
    setBusy(true);
    setNote('');
    void (async () => {
      const loaded = await readAccounting(address).catch(() => readOwnWallet(address));
      if (!alive) return;
      const unrealized = loaded.rows.filter((item) => item.active).reduce((sum, item) => sum + item.pnl, 0n);
      setBook(
        loaded.books
          ? {
              value: loaded.books.currentExposure,
              realized: loaded.books.cumulativeRealizedPnl,
              unrealized,
              capital: loaded.books.totalCapitalIn,
              open: loaded.open,
              total: loaded.total,
            }
          : null,
      );
      setRows(loaded.rows);
      setNote(loaded.rows.length ? '' : 'No positions found');
    })()
      .catch((err: unknown) => {
        if (alive) setNote(err instanceof Error ? err.message : 'SendraStorage did not answer.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [interactive, wallet.address]);

  const shown = rows.filter((row) => (filter === 'all' ? true : filter === 'active' ? row.active : !row.active));
  const realized = book?.realized ?? 0n;
  const unrealized = book?.unrealized ?? 0n;
  const profit = realized + unrealized;
  const capital = book?.capital ?? 0n;
  const percent = capital === 0n ? '0.0%' : `${profit > 0n ? '+' : ''}${((Number(profit) / Number(capital)) * 100).toFixed(1)}%`;
  const usdc = wallet.usdc ? Number(wallet.usdc) : 0;

  const mix = [...rows.reduce((map, row) => map.set(row.kind, (map.get(row.kind) ?? 0) + (row.active ? 1 : 0)), new Map<string, number>())].filter(([, count]) => count > 0);

  return (
    <section className={board ? 'pf pf-board' : 'pf'}>
      <header className="pf-head">
        <div>
          <p className="pf-kicker">Value in open positions</p>
          <p className="pf-hero">{usd(book?.value ?? 0n)}</p>
        </div>
        <div className="pf-side">
          <div>
            <p className="pf-kicker">PnL</p>
            <p className={`pf-side-num ${tone(profit)}`}>{usd(profit, true)}</p>
            <p className={`pf-sub ${tone(profit)}`}>{percent}</p>
          </div>
          <div>
            <p className="pf-kicker">Open positions</p>
            <p className="pf-side-num">{book?.open ?? 0}</p>
            <p className="pf-sub">of {book?.total ?? 0} total</p>
          </div>
        </div>
      </header>
      <div className="pf-stats">
        {[
          ['Realized PnL', usd(realized, true), tone(realized)],
          ['Unrealized PnL', usd(unrealized, true), tone(unrealized)],
          ['Capital put in', usd(capital), ''],
          ['USDC balance', usdc.toLocaleString('en', { style: 'currency', currency: 'USD' }), ''],
        ].map(([label, value, color]) => (
          <div key={label} className="pf-stat">
            <p className="pf-kicker">{label}</p>
            <strong className={color}>{value}</strong>
          </div>
        ))}
      </div>
      {board ? (
        <div className="pf-mix">
          {mix.length ? (
            mix.map(([kind, count]) => (
              <span key={kind} className="pf-chip">
                {kind}
                <b>{count}</b>
              </span>
            ))
          ) : (
            <p className="pf-empty">{busy ? 'Reading Arbitrum…' : note || 'Connect a wallet to read the book.'}</p>
          )}
        </div>
      ) : null}
      <div className={board ? 'pf-body pf-body-off' : 'pf-body'}>
        <div className="pf-bar">
          {(['all', 'active', 'closed'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item === 'all' ? 'All' : item === 'active' ? 'Active' : 'Closed'}
            </button>
          ))}
          {interactive ? (
            <button
              type="button"
              className="pf-link"
              onClick={() => void ensureWallet().catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Connect a wallet.'))}
            >
              {wallet.address ? 'Wallet connected' : 'Connect wallet'}
            </button>
          ) : null}
        </div>
        <div className="pf-list">
          {shown.length ? (
            shown.map((row) => (
              <div key={row.key} className="pf-row">
                <span>{row.kind}</span>
                <span className="pf-id">#{row.id}{row.wallet ? ` · ${row.wallet}` : ''}</span>
                <span>{row.active ? 'Active' : 'Closed'}</span>
                <span className={tone(row.pnl)}>{usd(row.pnl, true)}</span>
              </div>
            ))
          ) : (
            <p className="pf-empty">{busy ? 'Reading Arbitrum…' : note || 'No positions found'}</p>
          )}
        </div>
      </div>
    </section>
  );
}
