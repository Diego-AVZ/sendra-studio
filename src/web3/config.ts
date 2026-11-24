import { createConfig, http } from 'wagmi';
import { arbitrum } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const rpc = import.meta.env.VITE_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

export const wagmiConfig = createConfig({
  chains: [arbitrum],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arbitrum.id]: http(rpc),
  },
});
