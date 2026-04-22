'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

const REWARDS_CATALOG = [
  {
    id: 'double_points',
    icon: '2️⃣',
    name: 'Double Points (24 Hours)',
    desc: 'Earn double points in all your matches for the next 24 hours.',
    cost: 500,
  },
  {
    id: 'amazon_gift_card_10',
    icon: '💳',
    name: '$10 Amazon Gift Card',
    desc: 'Redeem an actual $10 Amazon voucher code sent to your email.',
    cost: 1500,
  },
  {
    id: 'amazon_gift_card_50',
    icon: '🎁',
    name: '$50 Amazon Gift Card',
    desc: 'Redeem a $50 Amazon voucher to buy premium equipment.',
    cost: 5000,
  },
  {
    id: 'streak_shield',
    icon: '🛡️',
    name: 'Streak Shield',
    desc: 'Protects your ELO from dropping on your next loss.',
    cost: 300,
  },
  {
    id: 'custom_title',
    icon: '🏷️',
    name: 'Custom Profile Title',
    desc: 'Add a custom title below your username on the leaderboard.',
    cost: 100,
  },
  {
    id: 'nft_mint',
    icon: '🎨',
    name: 'Mint Achievement NFT',
    desc: 'Mint a custom achievement NFT badge to your wallet.',
    cost: 1000,
  },
];

export default function RewardsPage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchClaimedRewards();
  }, [user]);

  async function fetchClaimedRewards() {
    try {
      const { data } = await supabase
        .from('user_rewards')
        .select('reward_id')
        .eq('user_id', user.id);
      if (data) setClaimedRewards(data.map(r => r.reward_id));
    } catch (err) {
      console.log('No rewards table yet');
    }
  }

  async function claimReward(reward) {
    if (!profile || (profile.points || 0) < reward.cost) {
      alert('Not enough points!');
      return;
    }

    if (claimedRewards.includes(reward.id)) {
      alert('Already claimed!');
      return;
    }

    setClaiming(reward.id);
    try {
      // Deduct points
      await updateProfile({
        points: (profile.points || 0) - reward.cost
      });

      // Record claim
      await supabase.from('user_rewards').insert({
        user_id: user.id,
        reward_id: reward.id,
      });

      setClaimedRewards(prev => [...prev, reward.id]);
    } catch (err) {
      console.error('Failed to claim reward:', err);
    } finally {
      setClaiming(null);
    }
  }

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
      <div className="container rewards-page">
        <h1 className="animate-in">🎁 <span className="gradient-text">Rewards</span></h1>
        <div className="rewards-balance animate-in animate-in-delay-1">
          ⭐ {profile.points || 0} Points Available
        </div>

        <div className="rewards-grid">
          {REWARDS_CATALOG.map((reward, i) => {
            const claimed = claimedRewards.includes(reward.id);
            const canAfford = (profile.points || 0) >= reward.cost;

            return (
              <div
                key={reward.id}
                className={`glass-card reward-card animate-in animate-in-delay-${Math.min(i + 1, 4)}`}
                style={claimed ? {opacity: 0.5} : {}}
              >
                <div className="reward-icon">{reward.icon}</div>
                <div className="reward-name">{reward.name}</div>
                <div className="reward-desc">{reward.desc}</div>
                <div className="reward-cost">⭐ {reward.cost} points</div>
                <button
                  className={`btn btn-sm ${claimed ? 'btn-secondary' : canAfford ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => claimReward(reward)}
                  disabled={claimed || !canAfford || claiming === reward.id}
                >
                  {claiming === reward.id ? (
                    <span className="loading-spinner"></span>
                  ) : claimed ? (
                    '✅ Claimed'
                  ) : canAfford ? (
                    'Claim Reward'
                  ) : (
                    '🔒 Not Enough Points'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
