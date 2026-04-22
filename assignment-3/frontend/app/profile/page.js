'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getNFTContract } from '@/lib/contracts';
import { uploadJSONToIPFS } from '@/lib/ipfs';

const ALL_BADGES = [
  { id: 'genesis', icon: '⚡', name: 'Genesis Block', desc: 'Secure your first block by playing a match.', rarity: 'Common', condition: (p) => (p.matches_played || 0) >= 1 },
  { id: 'diamond_hands', icon: '💎', name: 'Diamond Hands', desc: 'Achieve 5 ranked match victories.', rarity: 'Rare', condition: (p) => (p.wins || 0) >= 5 },
  { id: 'whale', icon: '🐋', name: 'Alpha Whale', desc: 'Dominate the leaderboard (1200+ ELO).', rarity: 'Epic', condition: (p) => (p.elo || 1000) >= 1200 },
  { id: 'degen', icon: '🦍', name: 'Degen Scholar', desc: 'Play 10 grueling DSA matches.', rarity: 'Rare', condition: (p) => (p.matches_played || 0) >= 10 },
  { id: 'moon', icon: '🚀', name: 'To The Moon', desc: 'Accumulate over 500 total points.', rarity: 'Legendary', condition: (p) => (p.points || 0) >= 500 },
  { id: 'bull', icon: '🐂', name: 'Bull Market', desc: 'Win your very first crypto-staked battle.', rarity: 'Common', condition: (p) => (p.wins || 0) >= 1 },
];

function getRarityStyle(rarity) {
  if (rarity === 'Legendary') return { background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))', border: '1px solid rgba(245, 158, 11, 0.5)' };
  if (rarity === 'Epic') return { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(139, 92, 246, 0.5)' };
  if (rarity === 'Rare') return { background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(6, 182, 212, 0.5)' };
  return { background: 'var(--bg-card)', border: '1px solid var(--border-color)' };
}

function buildBadgeMetadata(badge, profile, address) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="36" fill="url(#bg)" />
      <circle cx="256" cy="168" r="96" fill="rgba(255,255,255,0.06)" />
      <text x="256" y="192" text-anchor="middle" font-size="120">${badge.icon}</text>
      <text x="256" y="320" text-anchor="middle" font-size="34" fill="#ffffff" font-family="Arial, sans-serif">${badge.name}</text>
      <text x="256" y="368" text-anchor="middle" font-size="20" fill="#94a3b8" font-family="Arial, sans-serif">${profile.username}</text>
      <text x="256" y="416" text-anchor="middle" font-size="18" fill="#f59e0b" font-family="Arial, sans-serif">${badge.rarity}</text>
    </svg>
  `;

  return {
    name: badge.name,
    description: badge.desc,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    attributes: [
      { trait_type: 'Badge ID', value: badge.id },
      { trait_type: 'Rarity', value: badge.rarity },
      { trait_type: 'Player', value: profile.username },
      { trait_type: 'Wallet', value: address }
    ]
  };
}

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, deleteAccount, signOut } = useAuth();
  const { address, balance, isConnected, connectWallet } = useWallet();
  const router = useRouter();
  const [nftCount, setNftCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [mintedBadges, setMintedBadges] = useState({});
  const [mintingBadge, setMintingBadge] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) setNewUsername(profile.username || '');
  }, [profile]);

  useEffect(() => {
    if (address) {
      checkNFTs();
    } else {
      setNftCount(0);
      setMintedBadges({});
    }
  }, [address]);

  async function checkNFTs() {
    try {
      const contract = await getNFTContract();
      if (!contract || !address) return;

      const count = await contract.balanceOf(address);
      setNftCount(Number(count));

      const mintedEntries = await Promise.all(
        ALL_BADGES.map(async (badge) => [badge.id, await contract.hasMintedBadge(address, badge.id)])
      );
      setMintedBadges(Object.fromEntries(mintedEntries));
    } catch (err) {
      console.log('NFT check skipped:', err.message);
    }
  }

  async function saveWalletAddress(nextAddress = address) {
    if (nextAddress && profile) {
      await updateProfile({ wallet_address: nextAddress });
    }
  }

  async function saveUsername() {
    if (newUsername.length >= 3) {
      await updateProfile({ username: newUsername });
      setEditing(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? This will wipe your stats and cannot be undone.');
    if (confirmed) {
      await deleteAccount();
      router.push('/login');
    }
  }

  async function handleConnectWallet() {
    const nextAddress = await connectWallet();
    if (nextAddress) {
      await saveWalletAddress(nextAddress);
    }
  }

  async function mintBadgeNFT(badge) {
    if (!address) {
      alert('Connect your wallet first.');
      return;
    }
    if (!badge.condition(profile)) {
      alert('This badge is still locked.');
      return;
    }
    if (mintedBadges[badge.id]) {
      alert('This badge is already minted.');
      return;
    }

    setMintingBadge(badge.id);
    try {
      const metadataUri = await uploadJSONToIPFS(buildBadgeMetadata(badge, profile, address));
      const contract = await getNFTContract(true);
      if (!contract) throw new Error('NFT contract is not connected.');

      const tx = await contract.mintBadge(badge.id, metadataUri);
      await tx.wait();
      await checkNFTs();
      alert(`${badge.name} minted successfully.`);
    } catch (err) {
      console.error('BADGE_MINT_FAILED:', err);
      alert(`Badge mint failed: ${err.reason || err.message}`);
    } finally {
      setMintingBadge(null);
    }
  }

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="loading-spinner" style={{ width: 40, height: 40 }}></span>
      </div>
    );
  }

  const winRate = profile.matches_played > 0
    ? ((profile.wins / profile.matches_played) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <Navbar />
      <div className="container profile-page">
        <div className="profile-header animate-in">
          <div className="profile-avatar">
            {(profile.username || '?')[0].toUpperCase()}
          </div>
          <div className="profile-info">
            {editing ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ width: '200px', padding: '8px 12px' }}
                />
                <button className="btn btn-sm btn-primary" onClick={saveUsername}>Save</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <h1>
                {profile.username}
                <button
                  onClick={() => setEditing(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}
                >
                  Edit
                </button>
              </h1>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {address ? (
                <div className="wallet-address" style={{ margin: 0 }}>{address}</div>
              ) : (
                <button className="btn btn-sm btn-secondary" onClick={handleConnectWallet}>
                  Connect Wallet
                </button>
              )}
              <button className="btn btn-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }} onClick={handleDeleteAccount}>
                Delete Account
              </button>
              <button className="btn btn-sm btn-secondary" onClick={signOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="glass-card stat-card animate-in animate-in-delay-1">
            <div className="stat-card-label">ELO Rating</div>
            <div className="stat-card-value gradient-text">{profile.elo || 1000}</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-2">
            <div className="stat-card-label">Total Points</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-orange)' }}>{profile.points || 0}</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-3">
            <div className="stat-card-label">Win Rate</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{winRate}%</div>
          </div>
          <div className="glass-card stat-card animate-in animate-in-delay-4">
            <div className="stat-card-label">Matches</div>
            <div className="stat-card-value">{profile.matches_played || 0}</div>
            <div className="stat-card-sub">{profile.wins || 0}W / {profile.losses || 0}L</div>
          </div>
        </div>

        {isConnected && (
          <div className="profile-section animate-in">
            <h2>Wallet</h2>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Address</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>
                    {address}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Balance</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{parseFloat(balance || 0).toFixed(4)} ETH</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>NFT Badges</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-purple)' }}>{nftCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="profile-section animate-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Badges <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '12px' }}>(L1 Minted)</span></h2>
            <div style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              L4 Storage: <strong style={{ color: 'var(--text-primary)' }}>IPFS Data Integrity Layer Active</strong>
            </div>
          </div>
          <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Unlocked badges can now be minted into real NFTs with metadata pinned to IPFS.</p>
          <div className="badges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {ALL_BADGES.map((badge, i) => {
              const unlocked = badge.condition(profile);
              const minted = !!mintedBadges[badge.id];
              const customStyle = unlocked ? getRarityStyle(badge.rarity) : { opacity: 0.4, filter: 'grayscale(100%)' };

              return (
                <div
                  key={badge.id}
                  className="glass-card animate-in"
                  style={{ ...customStyle, padding: '24px', textAlign: 'center', transition: 'transform 0.2s', cursor: unlocked ? 'pointer' : 'default', animationDelay: `${i * 0.1}s` }}
                  onMouseEnter={(e) => { if (unlocked) e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'; }}
                  onMouseLeave={(e) => { if (unlocked) e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '12px', filter: unlocked ? 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' : 'none' }}>{badge.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>{badge.name}</div>
                  {unlocked && (
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: 'var(--accent-orange)' }}>
                      {badge.rarity} NFT
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{badge.desc}</div>
                  {unlocked ? (
                    <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '12px', display: 'inline-block' }}>
                      {minted ? 'Minted On-Chain' : 'Ready To Mint'}
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Locked
                    </div>
                  )}
                  {unlocked && (
                    <button
                      className={`btn btn-sm ${minted ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ marginTop: '14px', width: '100%' }}
                      onClick={() => mintBadgeNFT(badge)}
                      disabled={!isConnected || minted || mintingBadge === badge.id}
                    >
                      {mintingBadge === badge.id ? 'Minting...' : minted ? 'Minted' : 'Mint NFT'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
