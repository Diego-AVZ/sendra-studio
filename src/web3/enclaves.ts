import { decodeEventLog, encodeFunctionData, formatUnits, isAddress, parseUnits, zeroAddress, type Address } from 'viem';
import { arbitrum } from 'viem/chains';
import { writeContract } from 'wagmi/actions';
import { explain } from '@/lib/uid';
import {
  DEPOSIT_CREDIT_ABI,
  ENCLAVE_FACTORY_WRITE_ABI,
  ENCLAVES_STORAGE_ABI,
  EXECUTOR_ABI,
  MAIN_READER_ABI,
  PAUSE_ABI,
  REVOKE_ABI,
  RPFP_STORAGE_ABI,
  TARGET,
  UNPAUSE_ABI,
  WITHDRAW_CREDIT_ABI,
} from '@/web3/enclaveAbi';
import { ENCLAVE_FACTORY, MAIN_READER, RPFP_STORAGE, SENDRA_STORAGE, USDC, USDT, WBTC, WETH, ENCLAVES_STORAGE } from '@/web3/addresses';
import { ERC20_ABI } from '@/web3/abi';
import { wagmiConfig } from '@/web3/config';
import { ensureWallet, publicClient } from '@/web3/run';

/**
 * Credit-enclave reads and writes ported from web-frontend:
 * liquidityCreditEnclaveFactory, enclavesStorage, lenderOffers, acceptOffer,
 * depositEnclaveCredit, finalizeEnclaveCredit, cancelEnclaveOffer,
 * pauseEnclaveExecution, revokeEnclave, resolveRpfpId, enclavePositions (book rows).
 * Provide-liquidity and close-position still need the Uniswap Trade API route
 * the frontend builds in buildProvideLiquidityMint / withdrawLiquidity.
 */

const USDC_DECIMALS = 6;
const ZERO = zeroAddress.toLowerCase();
const OFFER_BATCH = 0n;
const RPFP_SCAN = 64n;

export type EnclaveRole = 'lender' | 'operator';
export type EnclaveStatus = 'pending-match' | 'awaiting-deposit' | 'active' | 'settling';
export type RoleFilter = 'all' | EnclaveRole;
export type ManageAction =
  | 'deposit-capital'
  | 'provide-liquidity'
  | 'pause-enclave'
  | 'unpause-enclave'
  | 'finalize-enclave'
  | 'cancel-offer'
  | 'revoke-enclave';

export type EnclaveTerms = {
  capitalAmount: number;
  minUsdcPerTx: number;
  maxUsdcPerTx: number;
  durationDays: number;
  splitProviderPct: number;
  splitExecutorPct: number;
  description: string;
};

export type StudioEnclave = {
  id: string;
  contractAddress: Address;
  batchId: bigint;
  isPaused: boolean;
  isDeposited: boolean;
  creditInUsdWei: bigint;
  rpfpId: bigint;
  status: EnclaveStatus;
  lender: Address;
  operator?: Address;
  terms: EnclaveTerms;
  endsAt: number;
  capitalDeployed: number;
  capitalAvailable: number;
};

export type EnclaveOffer = {
  enclaveId: string;
  batchId: bigint;
  lender: Address;
  creditInUsd: number;
  minUsdcPerTx: number;
  maxUsdcPerTx: number;
  splitExecutorPct: number;
  durationDays: number;
  deadline: number;
  description: string;
};

export type BookRow = {
  id: string;
  kind: string;
  active: boolean;
  pnl: bigint;
};

export type CreateInput = {
  terms: EnclaveTerms;
  allowedOperator: string;
  openOperator: boolean;
};

export type CreateResult = {
  enclaveId: bigint;
  enclaveAddress: Address;
  hash: `0x${string}`;
};

type RawEnclave = {
  operator: Address;
  lender: Address;
  sendraExecutor: Address;
  isPaused: boolean;
  isDeposited: boolean;
  creditInUsd: bigint;
  operatorFee: bigint;
  batchId: bigint;
  maxUsdcPerTx: bigint;
  minUsdcPerTx: bigint;
  deadline: bigint;
  rpfpId: bigint;
  description: string;
};

export const LP_POOLS = [
  {
    id: 'eth-usdc',
    label: 'ETH / USDC',
    poolAddress: '0xC6962004f452bE9203591991D15f6b388e09E8D0' as Address,
    token0: WETH,
    token1: USDC,
    feeTier: 500,
  },
  {
    id: 'btc-eth',
    label: 'BTC / ETH',
    poolAddress: '0x2f5e87C9312fa29aed5c179E456625D79015299c' as Address,
    token0: WBTC,
    token1: WETH,
    feeTier: 500,
  },
  {
    id: 'btc-usdt',
    label: 'BTC / USDT',
    poolAddress: '0x5969EFddE3cF5C0D9a88aE51E47d721096A97203' as Address,
    token0: WBTC,
    token1: USDT,
    feeTier: 500,
  },
] as const;

export const ROUTE_GAP =
  'That action calls the enclave executor with a Uniswap swap route. This studio has no Trade API key, so the transaction was not sent.';

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

export function isZeroAddress(addr?: string) {
  return !addr || addr.toLowerCase() === ZERO;
}

export function hasExecutor(addr?: string) {
  return !isZeroAddress(addr);
}

export function usd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function signedUsd(n: number) {
  const text = usd(Math.abs(n));
  if (n > 0) return `+${text}`;
  if (n < 0) return `-${text}`;
  return text;
}

export function timeLeft(deadline: number) {
  const seconds = deadline - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return 'Ended';
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(seconds / 60))}m left`;
}

export function statusLabel(status: EnclaveStatus) {
  if (status === 'pending-match') return 'Open offer';
  if (status === 'awaiting-deposit') return 'Needs deposit';
  if (status === 'settling') return 'Settling';
  return 'Active';
}

export function txLink(hash: string) {
  return `https://arbiscan.io/tx/${hash}`;
}

export function applyCapital(terms: EnclaveTerms, amount: number): EnclaveTerms {
  return {
    ...terms,
    capitalAmount: amount,
    minUsdcPerTx: amount > 0 ? Math.max(1, Math.round(amount * 0.1)) : 0,
    maxUsdcPerTx: amount,
  };
}

export function validateTerms(terms: EnclaveTerms, openOperator: boolean, operator: string) {
  if (terms.capitalAmount <= 0) return 'Enter a capital amount first';
  if (terms.minUsdcPerTx < 1) return 'Min USDC per tx must be at least 1';
  if (terms.maxUsdcPerTx < 1) return 'Max USDC per tx must be at least 1';
  if (terms.minUsdcPerTx > terms.maxUsdcPerTx) return 'Min USDC per tx cannot exceed max USDC per tx';
  if (terms.maxUsdcPerTx > terms.capitalAmount) return 'Max USDC per tx cannot exceed total capital';
  if (terms.durationDays < 1) return 'The duration has to be at least one day';
  if (!openOperator && !isAddress(operator)) return 'Enter a valid operator address, or leave the offer open';
  return null;
}

function raise(err: unknown): never {
  throw new Error(explain(err));
}

function num6(value: bigint) {
  return Number.parseFloat(formatUnits(value, USDC_DECIMALS));
}

function deriveStatus(raw: RawEnclave): EnclaveStatus {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(raw.deadline);
  if (isZeroAddress(raw.operator)) return 'pending-match';
  if (!raw.isDeposited) return 'awaiting-deposit';
  if (deadline <= now || deadline - now <= 2 * 86400) return 'settling';
  return 'active';
}

function mapEnclave(id: bigint, raw: RawEnclave, balanceWei: bigint, rpfpId: bigint): StudioEnclave {
  const credit = num6(raw.creditInUsd);
  const balance = num6(balanceWei);
  const fee = Number(raw.operatorFee);
  const deadline = Number(raw.deadline);
  const now = Math.floor(Date.now() / 1000);
  const executor = isZeroAddress(raw.sendraExecutor) ? zeroAddress : raw.sendraExecutor;
  return {
    id: id.toString(),
    contractAddress: executor,
    batchId: raw.batchId,
    isPaused: raw.isPaused,
    isDeposited: raw.isDeposited,
    creditInUsdWei: raw.creditInUsd,
    rpfpId,
    status: deriveStatus(raw),
    lender: raw.lender,
    operator: isZeroAddress(raw.operator) ? undefined : raw.operator,
    terms: {
      capitalAmount: credit,
      minUsdcPerTx: num6(raw.minUsdcPerTx),
      maxUsdcPerTx: num6(raw.maxUsdcPerTx),
      durationDays: deadline > now ? Math.ceil((deadline - now) / 86400) : 0,
      splitProviderPct: Math.max(0, 100 - fee),
      splitExecutorPct: fee,
      description: raw.description,
    },
    endsAt: deadline,
    capitalDeployed: raw.isDeposited ? Math.max(0, credit - balance) : 0,
    capitalAvailable: balance,
  };
}

async function readRaw(id: bigint) {
  return (await publicClient.readContract({
    address: ENCLAVES_STORAGE,
    abi: ENCLAVES_STORAGE_ABI,
    functionName: 'getEnclave',
    args: [id],
  })) as RawEnclave;
}

async function usdcBalance(account: Address) {
  if (isZeroAddress(account)) return 0n;
  return publicClient.readContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  });
}

let rpfpCache: { at: number; map: Map<string, bigint> } | null = null;

async function rpfpMap() {
  const now = Date.now();
  if (rpfpCache && now - rpfpCache.at < 60_000) return rpfpCache.map;
  const ids = Array.from({ length: Number(RPFP_SCAN) + 1 }, (_, index) => BigInt(index));
  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: ids.map((id) => ({
      address: RPFP_STORAGE,
      abi: RPFP_STORAGE_ABI,
      functionName: 'readRPFPById' as const,
      args: [id] as const,
    })),
  });
  const map = new Map<string, bigint>();
  results.forEach((result, index) => {
    if (result.status !== 'success') return;
    const executor = result.result.executor;
    if (isZeroAddress(executor)) return;
    map.set(executor.toLowerCase(), ids[index]);
  });
  rpfpCache = { at: now, map };
  return map;
}

export async function resolveEnclaveRpfpId(executor: Address, stored?: bigint) {
  if (isZeroAddress(executor)) return null;
  try {
    const found = (await rpfpMap()).get(executor.toLowerCase());
    if (found != null) return found;
  } catch {
    /* fall through to the id stored on the enclave */
  }
  if (stored == null) return null;
  try {
    const bundle = await publicClient.readContract({
      address: RPFP_STORAGE,
      abi: RPFP_STORAGE_ABI,
      functionName: 'readRPFPById',
      args: [stored],
    });
    if (bundle.executor.toLowerCase() !== executor.toLowerCase()) return null;
    return stored;
  } catch {
    return null;
  }
}

async function materialize(id: bigint, raw: RawEnclave) {
  const balance = await usdcBalance(raw.sendraExecutor);
  const rpfpId = (await resolveEnclaveRpfpId(raw.sendraExecutor, raw.rpfpId)) ?? raw.rpfpId;
  return mapEnclave(id, raw, balance, rpfpId);
}

export async function fetchEnclave(id: string) {
  const raw = await readRaw(BigInt(id));
  return materialize(BigInt(id), raw);
}

export type EnclaveListItem = {
  id: string;
  enclave: StudioEnclave;
  roles: EnclaveRole[];
};

export function mergeRoles(enclaves: { enclave: StudioEnclave; role: EnclaveRole }[]): EnclaveListItem[] {
  const byId = new Map<string, EnclaveListItem>();
  for (const row of enclaves) {
    const current = byId.get(row.enclave.id);
    if (!current) {
      byId.set(row.enclave.id, { id: row.enclave.id, enclave: row.enclave, roles: [row.role] });
      continue;
    }
    if (!current.roles.includes(row.role)) {
      current.roles = (['lender', 'operator'] as const).filter((role) => role === row.role || current.roles.includes(role));
    }
    if (row.role === 'lender') current.enclave = row.enclave;
  }
  return [...byId.values()];
}

export async function fetchMyEnclaves(user: Address): Promise<EnclaveListItem[]> {
  const idResults = await publicClient.multicall({
    allowFailure: true,
    contracts: ([0n, 1n] as const).map((type) => ({
      address: ENCLAVES_STORAGE,
      abi: ENCLAVES_STORAGE_ABI,
      functionName: 'getUserEnclaves' as const,
      args: [user, type] as const,
    })),
  });
  const tagged: { id: bigint; role: EnclaveRole }[] = [];
  idResults.forEach((result, index) => {
    if (result.status !== 'success') return;
    for (const id of result.result) tagged.push({ id, role: index === 0 ? 'lender' : 'operator' });
  });
  const seen = new Set<string>();
  const unique = tagged.filter((entry) => {
    const key = `${entry.id}:${entry.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) return [];
  const rawResults = await publicClient.multicall({
    allowFailure: true,
    contracts: unique.map((entry) => ({
      address: ENCLAVES_STORAGE,
      abi: ENCLAVES_STORAGE_ABI,
      functionName: 'getEnclave' as const,
      args: [entry.id] as const,
    })),
  });
  const rows: { id: bigint; role: EnclaveRole; raw: RawEnclave }[] = [];
  unique.forEach((entry, index) => {
    const result = rawResults[index];
    if (result?.status === 'success') rows.push({ id: entry.id, role: entry.role, raw: result.result as RawEnclave });
  });
  const balances = rows.length
    ? await publicClient.multicall({
        allowFailure: true,
        contracts: rows.map((row) => ({
          address: USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf' as const,
          args: [isZeroAddress(row.raw.sendraExecutor) ? zeroAddress : row.raw.sendraExecutor] as const,
        })),
      })
    : [];
  const rpfp = await rpfpMap().catch(() => new Map<string, bigint>());
  return mergeRoles(
    rows.map((row, index) => ({
      role: row.role,
      enclave: mapEnclave(
        row.id,
        row.raw,
        balances[index]?.status === 'success' ? balances[index].result : 0n,
        rpfp.get(row.raw.sendraExecutor.toLowerCase()) ?? row.raw.rpfpId,
      ),
    })),
  ).sort((a, b) => Number(b.id) - Number(a.id));
}

export async function fetchOffers(): Promise<EnclaveOffer[]> {
  const ids = await publicClient.readContract({
    address: ENCLAVES_STORAGE,
    abi: ENCLAVES_STORAGE_ABI,
    functionName: 'getLenderOffers',
    args: [OFFER_BATCH],
  });
  if (!ids.length) return [];
  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: ids.map((id) => ({
      address: ENCLAVES_STORAGE,
      abi: ENCLAVES_STORAGE_ABI,
      functionName: 'getEnclave' as const,
      args: [id] as const,
    })),
  });
  const now = Math.floor(Date.now() / 1000);
  const offers: EnclaveOffer[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'success') return;
    const raw = result.result as RawEnclave;
    const deadline = Number(raw.deadline);
    if (deadline <= now) return;
    if (!isZeroAddress(raw.operator)) return;
    offers.push({
      enclaveId: ids[index].toString(),
      batchId: raw.batchId,
      lender: raw.lender,
      creditInUsd: num6(raw.creditInUsd),
      minUsdcPerTx: num6(raw.minUsdcPerTx),
      maxUsdcPerTx: num6(raw.maxUsdcPerTx),
      splitExecutorPct: Number(raw.operatorFee),
      durationDays: Math.ceil((deadline - now) / 86400),
      deadline,
      description: raw.description,
    });
  });
  return offers.sort((a, b) => Number(b.enclaveId) - Number(a.enclaveId));
}

export function rolesFor(enclave: StudioEnclave, wallet?: string): EnclaveRole[] {
  if (!wallet) return [];
  const mine = wallet.toLowerCase();
  const roles: EnclaveRole[] = [];
  if (enclave.lender.toLowerCase() === mine) roles.push('lender');
  if (enclave.operator && enclave.operator.toLowerCase() === mine) roles.push('operator');
  return roles;
}

export function isOpenOffer(enclave: StudioEnclave) {
  return isZeroAddress(enclave.contractAddress) && !enclave.operator && !enclave.isDeposited;
}

export type ManageState = {
  roles: EnclaveRole[];
  isLender: boolean;
  isOperator: boolean;
  isBoth: boolean;
  hasExec: boolean;
  openOffer: boolean;
  windowEnded: boolean;
  needsDeposit: boolean;
  canFinalize: boolean;
  canOperate: boolean;
  canProvide: boolean;
  canRevoke: boolean;
  provideBlocker: string | null;
  notice: string | null;
  primary: ManageAction | null;
};

export function deriveManage(enclave: StudioEnclave, roles: EnclaveRole[], openPositions: number, positionsReady: boolean): ManageState {
  const isLender = roles.includes('lender');
  const isOperator = roles.includes('operator');
  const hasExec = hasExecutor(enclave.contractAddress);
  const openOffer = isLender && isOpenOffer(enclave);
  const now = Math.floor(Date.now() / 1000);
  const windowEnded = enclave.endsAt > 0 && enclave.endsAt <= now;
  const canOperate = enclave.isDeposited && hasExec && !enclave.isPaused;
  const canProvide = isOperator && canOperate && !windowEnded;
  const needsDeposit = isLender && !enclave.isDeposited && hasExec;
  const canFinalize = isLender && hasExec && positionsReady && openPositions === 0;
  const canRevoke = isOperator && hasExec && !enclave.isDeposited;
  const provideBlocker = canProvide
    ? null
    : enclave.isPaused
      ? 'The enclave is paused.'
      : !enclave.isDeposited
        ? 'The lender has not deposited the capital yet.'
        : windowEnded
          ? 'The operating window has ended.'
          : 'Provide liquidity is for the operator.';
  const primary: ManageAction | null = needsDeposit
    ? 'deposit-capital'
    : canProvide
      ? 'provide-liquidity'
      : canFinalize
        ? 'finalize-enclave'
        : null;
  const notice = enclave.isPaused
    ? 'The enclave is paused. New positions stay blocked until it is unpaused. Closing stays available.'
    : openOffer
      ? 'Waiting for an operator to accept this offer. No USDC is deposited yet.'
      : needsDeposit
        ? 'Deposit the USDC to start this enclave. Until then the operator cannot open positions.'
        : canRevoke && !isLender
          ? 'Waiting for the lender to deposit. You can revoke this enclave if they never fund it.'
          : isOperator && windowEnded && openPositions > 0
            ? 'The operating window has ended. Close every open position so the lender can finalize.'
            : isLender && openPositions > 0
              ? 'Capital is inside open positions. Finalizing becomes available once every position is closed.'
              : isLender && windowEnded && openPositions === 0 && canFinalize
                ? 'The operating window has ended. Finalize to withdraw the remaining capital.'
                : isOperator && windowEnded
                  ? 'The operating window has ended, so no new positions can be opened.'
                  : null;
  return {
    roles,
    isLender,
    isOperator,
    isBoth: isLender && isOperator,
    hasExec,
    openOffer,
    windowEnded,
    needsDeposit,
    canFinalize,
    canOperate,
    canProvide,
    canRevoke,
    provideBlocker,
    notice,
    primary,
  };
}

async function send(hashPromise: Promise<`0x${string}`>) {
  const hash = await hashPromise;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('The transaction reverted.');
  return { hash, receipt };
}

export async function createEnclave(input: CreateInput): Promise<CreateResult> {
  const problem = validateTerms(input.terms, input.openOperator, input.allowedOperator);
  if (problem) throw new Error(problem);
  const lender = await ensureWallet();
  const params = {
    creditInUsd: parseUnits(input.terms.capitalAmount.toString(), USDC_DECIMALS),
    maxUsdcPerTx: parseUnits(input.terms.maxUsdcPerTx.toString(), USDC_DECIMALS),
    minUsdcPerTx: parseUnits(input.terms.minUsdcPerTx.toString(), USDC_DECIMALS),
    deadline: BigInt(Math.floor(Date.now() / 1000) + input.terms.durationDays * 86400),
    operatorFee: BigInt(Math.max(0, Math.min(100, Math.round(input.terms.splitExecutorPct)))),
    allowedTokens: [] as Address[],
    allowedOperator: input.openOperator || !input.allowedOperator ? zeroAddress : (input.allowedOperator as Address),
    lender,
    description: input.terms.description || '',
  };
  try {
    await publicClient.simulateContract({
      address: ENCLAVE_FACTORY,
      abi: ENCLAVE_FACTORY_WRITE_ABI,
      functionName: 'createEnclave',
      args: [params],
      account: lender,
    });
  } catch (err) {
    raise(err);
  }
  let hash: `0x${string}`;
  let receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>;
  try {
    ({ hash, receipt } = await send(
      writeContract(wagmiConfig, {
        address: ENCLAVE_FACTORY,
        abi: ENCLAVE_FACTORY_WRITE_ABI,
        functionName: 'createEnclave',
        args: [params],
        chainId: arbitrum.id,
      }),
    ));
  } catch (err) {
    raise(err);
  }
  let enclaveId = 0n;
  let enclaveAddress: Address = zeroAddress;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ENCLAVE_FACTORY.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: ENCLAVE_FACTORY_WRITE_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'EnclaveCreated') {
        enclaveId = decoded.args.enclaveId;
        enclaveAddress = decoded.args.sendraExecutor;
      }
    } catch {
      /* factory emits other logs */
    }
  }
  if (enclaveId === 0n) throw new Error('The enclave was created, but the id was missing from the receipt.');
  return { enclaveId, enclaveAddress, hash };
}

export async function acceptOffer(batchId: bigint, enclaveId: bigint) {
  await ensureWallet();
  try {
    const { hash } = await send(
      writeContract(wagmiConfig, {
        address: ENCLAVE_FACTORY,
        abi: ENCLAVE_FACTORY_WRITE_ABI,
        functionName: 'acceptOffer',
        args: [batchId, enclaveId],
        chainId: arbitrum.id,
      }),
    );
    return hash;
  } catch (err) {
    raise(err);
  }
}

export async function cancelOffer(enclave: StudioEnclave) {
  const account = await ensureWallet();
  try {
    await publicClient.simulateContract({
      address: ENCLAVE_FACTORY,
      abi: ENCLAVE_FACTORY_WRITE_ABI,
      functionName: 'cancelOffer',
      args: [enclave.batchId, BigInt(enclave.id)],
      account,
    });
    const { hash } = await send(
      writeContract(wagmiConfig, {
        address: ENCLAVE_FACTORY,
        abi: ENCLAVE_FACTORY_WRITE_ABI,
        functionName: 'cancelOffer',
        args: [enclave.batchId, BigInt(enclave.id)],
        chainId: arbitrum.id,
      }),
    );
    return hash;
  } catch (err) {
    raise(err);
  }
}

async function execute(enclave: StudioEnclave, targetFunction: bigint, actionData: `0x${string}`) {
  const account = await ensureWallet();
  if (isZeroAddress(enclave.contractAddress)) throw new Error('This enclave has no executor yet.');
  const rpfpId = await resolveEnclaveRpfpId(enclave.contractAddress, enclave.rpfpId);
  if (rpfpId == null) throw new Error('RPFP rules were not found for this enclave executor.');
  const args = [{ targetFunction, rpfpId, actionData }] as const;
  try {
    await publicClient.simulateContract({
      address: enclave.contractAddress,
      abi: EXECUTOR_ABI,
      functionName: 'execute',
      args,
      account,
    });
    const { hash } = await send(
      writeContract(wagmiConfig, {
        address: enclave.contractAddress,
        abi: EXECUTOR_ABI,
        functionName: 'execute',
        args,
        chainId: arbitrum.id,
      }),
    );
    return hash;
  } catch (err) {
    raise(err);
  }
}

export async function depositCredit(enclave: StudioEnclave, onPhase?: (phase: string) => void) {
  const account = await ensureWallet();
  if (account.toLowerCase() !== enclave.lender.toLowerCase()) throw new Error('Only the lender can deposit credit.');
  if (isZeroAddress(enclave.contractAddress)) throw new Error('The executor is deployed when an operator accepts.');
  onPhase?.('Reading the enclave…');
  const fresh = await readRaw(BigInt(enclave.id));
  if (fresh.isDeposited) throw new Error('Credit is already deposited.');
  const credit = fresh.creditInUsd;
  if (credit <= 0n) throw new Error('Invalid credit amount.');
  const allowance = await publicClient.readContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account, enclave.contractAddress],
  });
  if (allowance < credit) {
    onPhase?.('Approving USDC…');
    try {
      await send(
        writeContract(wagmiConfig, {
          address: USDC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [enclave.contractAddress, credit],
          chainId: arbitrum.id,
        }),
      );
    } catch (err) {
      raise(err);
    }
  }
  onPhase?.('Depositing credit…');
  const actionData = encodeFunctionData({ abi: DEPOSIT_CREDIT_ABI, functionName: 'depositCredit', args: [credit] });
  const next = { ...enclave, creditInUsdWei: credit, rpfpId: fresh.rpfpId, contractAddress: fresh.sendraExecutor };
  return execute(next, TARGET.deposit, actionData);
}

export async function finalizeEnclave(enclave: StudioEnclave) {
  const actionData = encodeFunctionData({ abi: WITHDRAW_CREDIT_ABI, functionName: 'withdrawCredit' });
  return execute(enclave, TARGET.finalize, actionData);
}

export async function pauseEnclave(enclave: StudioEnclave, pause: boolean) {
  const account = await ensureWallet();
  if (account.toLowerCase() !== enclave.lender.toLowerCase()) throw new Error('Only the lender can pause or unpause.');
  if (!enclave.isDeposited) throw new Error('Credit must be deposited before pausing.');
  const actionData = pause
    ? encodeFunctionData({ abi: PAUSE_ABI, functionName: 'pauseExecution' })
    : encodeFunctionData({ abi: UNPAUSE_ABI, functionName: 'unpauseExecution' });
  return execute(enclave, pause ? TARGET.pause : TARGET.unpause, actionData);
}

export async function revokeEnclave(enclave: StudioEnclave) {
  const account = await ensureWallet();
  if (!enclave.operator || account.toLowerCase() !== enclave.operator.toLowerCase()) {
    throw new Error('Only the operator can revoke the enclave.');
  }
  if (enclave.isDeposited) throw new Error('Cannot revoke after the lender has deposited.');
  const actionData = encodeFunctionData({ abi: REVOKE_ABI, functionName: 'revokeEnclave' });
  return execute(enclave, TARGET.revoke, actionData);
}

export async function fetchBook(executor?: string): Promise<BookRow[]> {
  if (isZeroAddress(executor)) return [];
  const owner = executor as Address;
  try {
    const global = await publicClient.readContract({
      address: MAIN_READER,
      abi: MAIN_READER_ABI,
      functionName: 'getGlobalUserData',
      args: [owner],
    });
    const total = global.totalPositions;
    if (total > 0n) {
      const [upper, lower] = await Promise.all([
        publicClient.readContract({
          address: MAIN_READER,
          abi: MAIN_READER_ABI,
          functionName: 'getPositions',
          args: [owner, 1n, total],
        }),
        publicClient.readContract({
          address: MAIN_READER,
          abi: MAIN_READER_ABI,
          functionName: 'getPositions',
          args: [owner, 0n, total - 1n],
        }),
      ]);
      const byId = new Map<string, BookRow>();
      for (const position of [...upper, ...lower]) {
        if (position.id <= 0n) continue;
        const type = Number(position.positionType);
        byId.set(position.id.toString(), {
          id: position.id.toString(),
          kind: KIND[type] ?? `Type ${type}`,
          active: position.isActive,
          pnl: position.pnl,
        });
      }
      if (byId.size) return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
    }
  } catch {
    /* MainReader can miss an executor that is only in SendraStorage */
  }
  try {
    const known = await publicClient.readContract({
      address: SENDRA_STORAGE,
      abi: [
        {
          type: 'function',
          name: 'isUser',
          stateMutability: 'view',
          inputs: [{ name: '_user', type: 'address' }],
          outputs: [{ type: 'bool' }],
        },
      ] as const,
      functionName: 'isUser',
      args: [owner],
    });
    if (!known) return [];
    const positions = await publicClient.readContract({
      address: SENDRA_STORAGE,
      abi: [
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
      ] as const,
      functionName: 'getUserPositionsByRange',
      args: [owner, 1n, 80n],
    });
    return positions
      .filter((position) => position.id > 0n)
      .map((position) => {
        const type = Number(position.positionType);
        return {
          id: position.id.toString(),
          kind: KIND[type] ?? `Type ${type}`,
          active: position.isActive,
          pnl: position.pnl,
        };
      })
      .reverse();
  } catch {
    return [];
  }
}

export const ACTION_COPY: Record<ManageAction, { title: string; cta: string; description: string; busy: string }> = {
  'deposit-capital': {
    title: 'Deposit capital',
    cta: 'Deposit',
    description: 'Move the agreed USDC into the enclave so the operator can start. The wallet approves USDC first when it needs to.',
    busy: 'Depositing credit…',
  },
  'provide-liquidity': {
    title: 'Provide liquidity',
    cta: 'Provide',
    description: 'Open a position with the enclave USDC on a whitelisted pool. The position stays inside the enclave.',
    busy: 'Providing liquidity…',
  },
  'pause-enclave': {
    title: 'Pause enclave',
    cta: 'Pause',
    description: 'The operator cannot open new positions until you unpause.',
    busy: 'Pausing…',
  },
  'unpause-enclave': {
    title: 'Unpause enclave',
    cta: 'Unpause',
    description: 'Let the operator open positions again.',
    busy: 'Unpausing…',
  },
  'finalize-enclave': {
    title: 'Finalize enclave',
    cta: 'Finalize',
    description: 'Withdraw the capital left in the enclave and close it.',
    busy: 'Withdrawing credit…',
  },
  'cancel-offer': {
    title: 'Cancel offer',
    cta: 'Cancel offer',
    description: 'Remove this offer from the book. Only possible before an operator accepts it.',
    busy: 'Cancelling offer…',
  },
  'revoke-enclave': {
    title: 'Revoke enclave',
    cta: 'Revoke',
    description: 'Leave this enclave before the lender deposits. The offer goes back to the book.',
    busy: 'Revoking…',
  },
};
