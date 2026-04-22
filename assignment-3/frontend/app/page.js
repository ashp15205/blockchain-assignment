'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  return (
    <div>
      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-badge">⛓️ Powered by Blockchain</div>
        <h1 className="hero-title">
          <span className="gradient-text">Compete. Stake. Win.</span>
          <br />The Web3 Quiz Arena
        </h1>
        <p className="hero-subtitle">
          1v1 DSA quiz battles with crypto staking, automated reward distribution via smart contracts,
          and NFT achievement badges — all on Ethereum Sepolia.
        </p>
        <div className="hero-buttons">
          <Link href="/register" className="btn btn-primary btn-lg">Get Started →</Link>
          <Link href="/login" className="btn btn-secondary btn-lg">Sign In</Link>
        </div>

      </section>

      {/* Features */}
      <section className="container">
        <div className="features-grid">
          <div className="glass-card feature-card animate-in animate-in-delay-1">
            <div className="feature-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>⚔️</div>
            <h3>Ranked Battles (Web3)</h3>
            <p>Stake cryptocurrency in 1v1 quiz matches. Smart contracts lock funds and auto-distribute rewards to the winner — no middleman.</p>
          </div>
          <div className="glass-card feature-card animate-in animate-in-delay-3">
            <div className="feature-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>🏅</div>
            <h3>NFT Badges</h3>
            <p>Top players earn dynamic NFT badges. Limited supply, real-time rotation — if you drop out, your NFT is burned.</p>
          </div>
          <div className="glass-card feature-card animate-in animate-in-delay-4">
            <div className="feature-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>🎁</div>
            <h3>Rewards System</h3>
            <p>Earn points for every correct answer and match win. Redeem points for exclusive rewards through the platform.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
