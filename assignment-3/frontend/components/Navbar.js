'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();

  const isActive = (path) => pathname === path ? 'navbar-link active' : 'navbar-link';

  if (!user) return null;

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/dashboard" className="navbar-logo">
          <span>⚔️</span> KodeBattle
        </Link>

        <div className="navbar-links">
          <Link href="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
          <Link href="/leaderboard" className={isActive('/leaderboard')}>Leaderboard</Link>
          <Link href="/rewards" className={isActive('/rewards')}>Rewards</Link>
          <Link href="/profile" className={isActive('/profile')}>Profile</Link>
          <Link href="/dao" className={isActive('/dao')}>⚖️ DAO</Link>
        </div>

        <div className="navbar-actions">
          {address ? (
            <button className="wallet-btn" onClick={disconnectWallet} title="Click to disconnect">
              <span className="wallet-dot"></span>
              {shortAddr}
            </button>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={connectWallet} disabled={connecting}>
              {connecting ? <span className="loading-spinner"></span> : '🔗'} 
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={signOut}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
