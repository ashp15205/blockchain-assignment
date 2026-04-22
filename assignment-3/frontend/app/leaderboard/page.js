'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, elo, wins, losses, matches_played')
        .order('elo', { ascending: false })
        .limit(50);
      
      if (!error && data) setPlayers(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <Navbar />
      <div className="container leaderboard-page animate-in">
        <div style={{textAlign: 'center', marginBottom: '40px'}}>
          <h1 style={{fontSize: '2.5rem', marginBottom: '10px'}}>🏆 <span className="gradient-text">Leaderboard</span></h1>
          <p style={{color: 'var(--text-secondary)'}}>Real-time global rankings based on ELO and match performance.</p>
        </div>

        <div className="glass-card" style={{overflow:'hidden', padding: 0}}>
          {loading ? (
            <div style={{textAlign:'center',padding:'80px'}}>
              <span className="loading-spinner" style={{width:40,height:40}}></span>
            </div>
          ) : players.length === 0 ? (
            <div style={{textAlign: 'center', padding: '100px', color: 'var(--text-secondary)'}}>
              <div style={{fontSize: '3rem', marginBottom: '20px'}}>⚔️</div>
              <p>No matches played yet. Start a battle to appear here!</p>
            </div>
          ) : (
            <div className="leaderboard-table">
              <div className="leaderboard-header" style={{gridTemplateColumns: '100px 2fr 1fr 1fr', padding: '20px 30px', background: 'rgba(255,255,255,0.03)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px'}}>
                <span>Rank</span>
                <span>Username</span>
                <span style={{textAlign: 'center'}}>ELO</span>
                <span style={{textAlign: 'center'}}>Record</span>
              </div>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="leaderboard-row"
                  style={{
                    gridTemplateColumns: '100px 2fr 1fr 1fr',
                    padding: '15px 30px',
                    background: p.id === user.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s'
                  }}
                >
                  <span style={{
                    fontSize: '1.2rem', 
                    fontWeight: 900, 
                    color: i === 0 ? '#f59e0b' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--text-muted)'))
                  }}>
                    {i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `#${i + 1}`))}
                  </span>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div className="lb-avatar" style={{width: '35px', height: '35px', fontSize: '1rem'}}>
                      {(p.username || '?')[0].toUpperCase()}
                    </div>
                    <span style={{fontWeight: p.id === user.id ? 800 : 500, color: p.id === user.id ? 'var(--text-primary)' : 'var(--text-secondary)'}}>
                      {p.username}
                      {p.id === user.id && <span style={{fontSize: '0.6rem', background: 'var(--accent-purple)', padding: '2px 6px', borderRadius: '4px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 900}}>YOU</span>}
                      {i < 10 && <span style={{fontSize: '0.65rem', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', color: '#000', padding: '3px 8px', borderRadius: '4px', marginLeft: '10px', fontWeight: 900, boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'}}>TOP 10</span>}
                    </span>
                  </div>
                  <span style={{textAlign: 'center', fontWeight: 800, color: 'var(--accent-orange)', fontSize: '1.1rem'}}>{p.elo}</span>
                  <span style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem'}}>{p.wins}W / {p.losses}L</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .leaderboard-row:hover {
          background: rgba(255,255,255,0.02) !important;
        }
        .lb-avatar {
          background: var(--bg-card);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          border: 2px solid rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
