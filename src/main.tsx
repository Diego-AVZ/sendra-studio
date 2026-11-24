import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import '@fontsource/fraunces/latin-500-italic.css';
import '@fontsource/fraunces/latin-600-italic.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/syne/latin-600.css';
import '@fontsource/syne/latin-700.css';
import App from './App';
import { SessionProvider } from '@/lib/session';
import { wagmiConfig } from '@/web3/config';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </QueryClientProvider>
  </WagmiProvider>,
);
