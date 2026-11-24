export const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
export const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as const;
export const WBTC = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' as const;
export const AAVE_TOKEN = '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' as const;
export const LINK = '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' as const;
export const UNI = '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' as const;
export const USDT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as const;

export const ACCOUNTS_MANAGER = '0xe275859A271362490d7C792Ce4A48570967dc1E2' as const;
export const LENDING_ACCOUNTS = '0x9bF3D396202e96934D210e2247a52A5689032250' as const;
export const ENCLAVE_FACTORY = '0x8489aDC3EfF8a7516249F35510bcF8C787C251f0' as const;
export const ENCLAVES_STORAGE = '0x21e81f52024d36F3F1560A7Fc2fe8Cf048f9b526' as const;
export const RPFP_STORAGE = '0xCE57938Af57631EDE6B253358B041189dAb18b8B' as const;
export const MAIN_READER = '0x5Ff21b1b98C30873A27C8AA481Bb24cfa77f62A0' as const;
export const SENDRA_STORAGE = '0xBBECE20bc76a94270548d43131f4e457d39B5079' as const;

export const RAILS = [
  { name: 'Spot', contract: 'AccountsManager', address: ACCOUNTS_MANAGER },
  { name: 'Aave', contract: 'LendingAccounts', address: LENDING_ACCOUNTS },
  { name: 'Liquidity', contract: 'Same spot account', address: ACCOUNTS_MANAGER },
  { name: 'Enclave', contract: 'CreditEnclaveFactory', address: ENCLAVE_FACTORY },
] as const;
