const SWAP = {
  components: [
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    {
      name: 'swapInstructions',
      type: 'tuple[]',
      components: [
        { name: 'protocol', type: 'uint8' },
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'poolOrPair', type: 'address' },
        { name: 'fee', type: 'uint24' },
        {
          name: 'poolKey',
          type: 'tuple',
          components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ],
        },
      ],
    },
    { name: 'amountIn0', type: 'uint256' },
    { name: 'to', type: 'address' },
  ],
  name: 'swap',
  type: 'tuple',
} as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const ACCOUNTS_MANAGER_ABI = [
  {
    type: 'function',
    name: 'initializeAccount',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'accountAddress', type: 'address' }],
  },
  {
    type: 'function',
    name: 'accountByOwner',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export const LENDING_ACCOUNTS_ABI = [
  {
    type: 'function',
    name: 'open',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'cell', type: 'address' }],
  },
  {
    type: 'function',
    name: 'cellsOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'cells', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'cellByOwner',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export const LENDING_CELL_ABI = [
  {
    type: 'function',
    name: 'openSupply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'usdcAmount', type: 'uint256' },
      SWAP,
    ],
    outputs: [],
  },
] as const;

export const ENCLAVE_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createEnclave',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'creditInUsd', type: 'uint256' },
          { name: 'maxUsdcPerTx', type: 'uint256' },
          { name: 'minUsdcPerTx', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'operatorFee', type: 'uint256' },
          { name: 'allowedTokens', type: 'address[]' },
          { name: 'allowedOperator', type: 'address' },
          { name: 'lender', type: 'address' },
          { name: 'description', type: 'string' },
        ],
      },
    ],
    outputs: [
      { name: 'enclaveId', type: 'uint256' },
      { name: 'enclaveAddress', type: 'address' },
    ],
  },
] as const;
