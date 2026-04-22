'use client';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { address, balance } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !profile) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <span className="loading-spinner" style={{width:40,height:40}}></span>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="dashboard-header animate-in">
          <h1>Welcome, <span className="gradient-text">{profile.username}</span> ⚔️</h1>
          <p>Ready for your next battle?</p>
        </div>

        {/* Stats */}
        <div className="dashboard-grid">
          <div className="glass-card stat-card animate-in animate-in-delay-1">
            <div className="stat-card-label">ELO Rating</div>
            <div className="stat-card-value gradient-text">{profile.elo || 1000}</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-2">
            <div className="stat-card-label">Points</div>
            <div className="stat-card-value" style={{color:'var(--accent-orange)'}}>{profile.points || 0}</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-3">
            <div className="stat-card-label">Matches</div>
            <div className="stat-card-value">{profile.matches_played || 0}</div>
            <div className="stat-card-sub">{profile.wins || 0}W / {profile.losses || 0}L</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-4">
            <div className="stat-card-label">Wallet</div>
            <div className="stat-card-value" style={{fontSize:'1rem',fontFamily:'var(--font-mono)',color:'var(--accent-cyan)'}}>
              {address ? `${parseFloat(balance || 0).toFixed(4)} ETH` : 'Not Connected'}
            </div>
          </div>
        </div>

        {/* Game Modes */}
        <div className="mode-cards">
          <Link href="/battle" style={{textDecoration:'none',color:'inherit'}}>
            <div className="glass-card mode-card ranked animate-in animate-in-delay-2">
              <div className="mode-card-icon">⚔️</div>
              <h3>Ranked Battle</h3>
              <p>Stake crypto and compete in a timed DSA quiz. Winner takes all — powered by smart contracts on Ethereum Sepolia.</p>
              <span className="mode-tag web3">⛓️ Web3 — Crypto Staking</span>
            </div>
          </Link>
          <Link href="/playground" style={{textDecoration:'none',color:'inherit'}}>
            <div className="glass-card mode-card playground animate-in animate-in-delay-3">
              <div className="mode-card-icon">🧠</div>
              <h3>Playground</h3>
              <p>Practice DSA questions at your own pace. No staking, no pressure — just pure learning and skill improvement.</p>
              <span className="mode-tag web2">🌐 Web2 — No Wallet Needed</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
