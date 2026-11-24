import { formatUnits } from 'viem';
import { arbitrum } from 'viem/chains';
import { useAccount, useBalance, useDisconnect, useReadContract } from 'wagmi';
import { ERC20_ABI } from '@/web3/abi';
import { USDC } from '@/web3/addresses';

export function formatAmount(value: bigint, decimals: number, digits: number) {
  const [whole, frac = ''] = formatUnits(value, decimals).split('.');
  const cut = frac.slice(0, digits).replace(/0+$/, '');
  return cut ? `${whole}.${cut}` : whole;
}

export function formatUsdc(value: bigint) {
  return formatAmount(value, 6, 2);
}

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const balance = useReadContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arbitrum.id,
    query: { enabled: Boolean(address) },
  });
  const native = useBalance({
    address,
    chainId: arbitrum.id,
    query: { enabled: Boolean(address) },
  });
  return {
    address,
    isConnected,
    chainOk: chainId === arbitrum.id,
    usdc: typeof balance.data === 'bigint' ? formatUsdc(balance.data) : '',
    eth: native.data ? formatAmount(native.data.value, native.data.decimals, 4) : '',
    disconnect,
  };
}
