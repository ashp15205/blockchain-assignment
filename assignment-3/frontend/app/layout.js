import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WalletProvider } from '@/context/WalletContext';

export const metadata = {
  title: 'KodeBattle — Blockchain-Powered 1v1 DSA Platform',
  description: 'A hybrid Web2+Web3 competitive quiz platform demonstrating blockchain staking, NFT badges, and smart contract integration for trustless match resolution.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
