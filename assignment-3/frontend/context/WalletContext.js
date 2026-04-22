'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext({});

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const SEPOLIA_CHAIN_ID = '0xaa36a7';

  // On mount: silently restore wallet from localStorage if MetaMask is still authorized
  useEffect(() => {
    const savedAddress = localStorage.getItem('kb_wallet');
    if (!savedAddress || typeof window === 'undefined' || !window.ethereum) return;

    // eth_accounts has NO pop-up — just checks if we're already connected
    window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts) => {
      if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(accounts[0]);
        const network = await provider.getNetwork();
        setAddress(accounts[0]);
        setBalance(ethers.formatEther(bal));
        setChainId(Number(network.chainId));
      } else {
        localStorage.removeItem('kb_wallet'); // session expired
      }
    }).catch(() => {});

    // Sync with MetaMask state changes globally
    const onAccountsChanged = (accs) => {
      if (accs.length === 0) {
        setAddress(null); setBalance(null); setChainId(null);
        localStorage.removeItem('kb_wallet');
      } else {
        setAddress(accs[0]);
        localStorage.setItem('kb_wallet', accs[0]);
      }
    };
    const onChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener('chainChanged', onChainChanged);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask to use blockchain features!');
      return null;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const bal = await provider.getBalance(accounts[0]);

      if (network.chainId !== 11155111n) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: SEPOLIA_CHAIN_ID, chainName: 'Sepolia Testnet', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.sepolia.org'], blockExplorerUrls: ['https://sepolia.etherscan.io'] }]
            });
          }
        }
      }

      setAddress(accounts[0]);
      setBalance(ethers.formatEther(bal));
      setChainId(Number(network.chainId));
      localStorage.setItem('kb_wallet', accounts[0]); // Persist!
      return accounts[0];
    } catch (err) {
      console.error('Wallet connection failed:', err);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    localStorage.removeItem('kb_wallet');
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address || typeof window === 'undefined' || !window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const bal = await provider.getBalance(address);
    setBalance(ethers.formatEther(bal));
  }, [address]);

  return (
    <WalletContext.Provider value={{ address, balance, chainId, connecting, connectWallet, disconnectWallet, refreshBalance, isConnected: !!address }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
