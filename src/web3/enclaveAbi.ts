export const ENCLAVE_STRUCT = [
  { name: 'operator', type: 'address' },
  { name: 'lender', type: 'address' },
  { name: 'sendraExecutor', type: 'address' },
  { name: 'isPaused', type: 'bool' },
  { name: 'isDeposited', type: 'bool' },
  { name: 'creditInUsd', type: 'uint256' },
  { name: 'operatorFee', type: 'uint256' },
  { name: 'lenderPositionId', type: 'uint256' },
  { name: 'operatorPositionId', type: 'uint256' },
  { name: 'batchId', type: 'uint256' },
  { name: 'maxUsdcPerTx', type: 'uint256' },
  { name: 'minUsdcPerTx', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
  { name: 'rpfpId', type: 'uint256' },
  { name: 'description', type: 'string' },
] as const;

export const ENCLAVES_STORAGE_ABI = [
  {
    type: 'function',
    name: 'getUserEnclaves',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_type', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getEnclave',
    stateMutability: 'view',
    inputs: [{ name: '_enclaveId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: ENCLAVE_STRUCT }],
  },
  {
    type: 'function',
    name: 'getLenderOffers',
    stateMutability: 'view',
    inputs: [{ name: '_batchId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;

const CREATE_PARAMS = [
  { name: 'creditInUsd', type: 'uint256' },
  { name: 'maxUsdcPerTx', type: 'uint256' },
  { name: 'minUsdcPerTx', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
  { name: 'operatorFee', type: 'uint256' },
  { name: 'allowedTokens', type: 'address[]' },
  { name: 'allowedOperator', type: 'address' },
  { name: 'lender', type: 'address' },
  { name: 'description', type: 'string' },
] as const;

export const ENCLAVE_FACTORY_WRITE_ABI = [
  {
    type: 'function',
    name: 'createEnclave',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'params', type: 'tuple', components: CREATE_PARAMS }],
    outputs: [
      { name: 'enclaveId', type: 'uint256' },
      { name: 'enclaveAddress', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'acceptOffer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_batchId', type: 'uint256' },
      { name: '_enclaveId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelOffer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_batchId', type: 'uint256' },
      { name: '_enclaveId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'EnclaveCreated',
    inputs: [
      { name: 'enclaveId', type: 'uint256', indexed: true },
      { name: 'sendraExecutor', type: 'address', indexed: true },
    ],
  },
] as const;

export const EXECUTOR_ABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'executionParams',
        type: 'tuple',
        components: [
          { name: 'targetFunction', type: 'uint256' },
          { name: 'rpfpId', type: 'uint256' },
          { name: 'actionData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes' }],
  },
] as const;

export const RPFP_STORAGE_ABI = [
  {
    type: 'function',
    name: 'readRPFPById',
    stateMutability: 'view',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: '_type', type: 'uint16' },
          { name: 'id', type: 'uint256' },
          { name: 'executor', type: 'address' },
          { name: 'implementation', type: 'address' },
          { name: 'ruler', type: 'address' },
          { name: 'owners', type: 'address[]' },
          { name: 'description', type: 'string' },
          { name: 'extraData', type: 'bytes' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

export const MAIN_READER_ABI = [
  {
    type: 'function',
    name: 'getGlobalUserData',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalPnl', type: 'int256' },
          { name: 'totalVolume', type: 'uint256' },
          { name: 'totalTransactions', type: 'uint256' },
          { name: 'totalPositions', type: 'uint256' },
          { name: 'totalActivePositions', type: 'uint256' },
          { name: 'totalValueLocked', type: 'uint256' },
          { name: 'averagePositionSize', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getPositions',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_from', type: 'uint256' },
      { name: '_to', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
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
] as const;

export const DEPOSIT_CREDIT_ABI = [
  {
    type: 'function',
    name: 'depositCredit',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'creditInUsd', type: 'uint256' }],
    outputs: [],
  },
] as const;

export const WITHDRAW_CREDIT_ABI = [
  { type: 'function', name: 'withdrawCredit', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

export const PAUSE_ABI = [
  { type: 'function', name: 'pauseExecution', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

export const UNPAUSE_ABI = [
  { type: 'function', name: 'unpauseExecution', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

export const REVOKE_ABI = [
  { type: 'function', name: 'revokeEnclave', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

/** Indexes in the enclave RPFP bundle. Same as the Sendra frontend UniversalExecutor constants. */
export const TARGET = {
  deposit: 0n,
  provide: 1n,
  finalize: 2n,
  revoke: 3n,
  pause: 4n,
  unpause: 5n,
  close: 6n,
} as const;
