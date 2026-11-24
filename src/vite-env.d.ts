/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENDRA_TX_BUILDER_URL?: string;
  readonly VITE_ARBITRUM_RPC_URL?: string;
}
