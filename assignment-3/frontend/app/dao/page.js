'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { uploadJSONToIPFS } from '@/lib/ipfs';

export default function DaoPage() {
  const { user, profile } = useAuth();
  
  const [proposals, setProposals] = useState([]);
  const [userVotes, setUserVotes] = useState({}); // proposal_id -> 'FOR' | 'AGAINST'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProp, setNewProp] = useState({ title: '', desc: '', type: 'Governance' });

  useEffect(() => {
    fetchDaoData();
  }, [user]);

  async function fetchDaoData() {
    setLoading(true);
    try {
      // 1. Fetch proposals
      const { data: props, error } = await supabase
        .from('dao_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (props) setProposals(props);

      // 2. Fetch my votes
      if (user) {
        const { data: votes } = await supabase
          .from('dao_votes')
          .select('proposal_id, vote_type')
          .eq('user_id', user.id);
        
        if (votes) {
          const voteMap = {};
          votes.forEach(v => voteMap[v.proposal_id] = v.vote_type);
          setUserVotes(voteMap);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleVote(proposal, isFor) {
    if (!profile) {
      alert("Must be logged in to vote");
      return;
    }
    if (userVotes[proposal.id]) {
      alert("You already voted on this proposal!");
      return;
    }
    
    // Weight vote by ELO (1 ELO = 1 Vote power)
    const voteWeight = profile.elo || 200;

    try {
      // 1. Insert vote log
      await supabase.from('dao_votes').insert({
        proposal_id: proposal.id,
        user_id: user.id,
        vote_type: isFor ? 'FOR' : 'AGAINST'
      });

      // 2. Update proposal counts
      const updatedFor = isFor ? (proposal.votes_for + voteWeight) : proposal.votes_for;
      const updatedAgainst = isFor ? proposal.votes_against : (proposal.votes_against + voteWeight);
      
      let newStatus = proposal.status;
      // Example Condition: If total votes exceed 5000 power, calculate pass/fail early
      if ((updatedFor + updatedAgainst) > 5000) {
         newStatus = updatedFor > updatedAgainst ? 'Passed' : 'Failed';
      }

      await supabase.from('dao_proposals').update({
        votes_for: updatedFor,
        votes_against: updatedAgainst,
        status: newStatus
      }).eq('id', proposal.id);

      // Mutate local state immediately so UI feels fast
      setUserVotes(prev => ({...prev, [proposal.id]: isFor ? 'FOR' : 'AGAINST'}));
      setProposals(prev => prev.map(p => {
        if (p.id === proposal.id) return { ...p, votes_for: updatedFor, votes_against: updatedAgainst, status: newStatus };
        return p;
      }));

    } catch (e) {
      console.error(e);
      alert('Failed to submit vote');
    }
  }

  async function submitProposal() {
    if (!newProp.title || !newProp.desc) return;
    try {
      // Create JSON artifact to pin to IPFS natively
      const proposalData = {
        title: newProp.title,
        description: newProp.desc,
        creator: user.id,
        timestamp: new Date().toISOString()
      };

      // 1. Actually upload to IPFS!
      const realIpfsHash = await uploadJSONToIPFS(proposalData);

      // 2. Commit transaction to Database
      const { data, error } = await supabase.from('dao_proposals').insert({
        creator_id: user.id,
        title: newProp.title,
        description: newProp.desc,
        proposal_type: newProp.type,
        ipfs_hash: realIpfsHash
      }).select().single();

      if (data) {
        setProposals([data, ...proposals]);
        setShowModal(false);
        setNewProp({ title: '', desc: '', type: 'Governance' });
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!user) return null;

  return (
    <div>
      <Navbar />
      
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(10, 10, 15, 0.85)',backdropFilter:'blur(10px)',zIndex:999,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div className="glass-card animate-in" style={{width: '600px', padding: '40px', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.2)'}}>
            <h2 style={{marginBottom: '26px', fontSize: '1.8rem'}}>Deploy <span className="gradient-text">Proposal</span></h2>

            <label style={{display:'block', marginBottom:'10px', fontSize:'0.9rem', color:'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'}}>Proposal Title</label>
            <input className="form-input" style={{width:'100%', marginBottom:'28px', padding: '16px', fontSize: '1.05rem'}} placeholder="E.g., Decrease Platform Fee..." value={newProp.title} onChange={(e)=>setNewProp({...newProp, title: e.target.value})} />

            <label style={{display:'block', marginBottom:'10px', fontSize:'0.9rem', color:'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'}}>Governance Payload (Pinned to IPFS)</label>
            <textarea className="form-input" style={{width:'100%', height:'140px', marginBottom:'32px', padding: '16px', fontSize: '1.05rem', resize:'none'}} placeholder="Detail the exact mechanics of this proposal..." value={newProp.desc} onChange={(e)=>setNewProp({...newProp, desc: e.target.value})} />

            <div style={{display:'flex', gap:'16px', justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" style={{padding: '12px 24px'}} onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{padding: '12px 30px'}} onClick={submitProposal}>Deploy to DAO 🚀</button>
            </div>
          </div>
        </div>
      )}

      <div className="container animate-in">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px'}}>
          <div>
            <h1>⚖️ <span className="gradient-text">KodeBattle DAO</span></h1>
            <p style={{color: 'var(--text-secondary)'}}>Layer 5 Governance. Protocol decisions <strong>gated by BadgeNFT</strong>.</p>
          </div>
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
               <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800}}>My Voting Power</div>
               <div style={{fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-purple)'}}>{profile?.elo || 200} VP</div>
            </div>
            <div style={{height: '40px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 10px'}} />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Proposal</button>
          </div>
        </div>

        <div style={{background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 20px', borderRadius: '12px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem'}}>
          <span style={{fontSize: '1.2rem'}}>🛡️</span>
          <p style={{margin: 0, color: 'var(--text-secondary)'}}>
            <strong>Layer 5 Governance:</strong> Off-chain votes are weighted by your <strong>ELO skill rating</strong>. Official on-chain execution requires a <span style={{color: '#f59e0b', fontWeight: 700}}>Verified BadgeNFT</span>.
          </p>
        </div>

        {loading ? (
           <div style={{textAlign: 'center', padding: '50px'}}><span className="loading-spinner" style={{width:40,height:40}}></span></div>
        ) : proposals.length === 0 ? (
           <div className="glass-card" style={{textAlign: 'center', padding: '50px', color: 'var(--text-secondary)'}}>
              No active proposals natively found in the DAO.
           </div>
        ) : (
          <div className="grid" style={{gridTemplateColumns: 'repeat(1, 1fr)', gap: '28px'}}>
            {proposals.map((prop, index) => {
              const totalVotes = prop.votes_for + prop.votes_against;
              const forPct = totalVotes > 0 ? (prop.votes_for / totalVotes) * 100 : 0;
              const againstPct = totalVotes > 0 ? (prop.votes_against / totalVotes) * 100 : 0;
              
              const isPassed = prop.status === 'Passed';
              const isFailed = prop.status === 'Failed';
              const borderGlow = isPassed ? 'var(--accent-green)' : (isFailed ? 'var(--accent-red)' : 'var(--accent-purple)');

              return (
                <div key={prop.id} className="glass-card animate-in" style={{borderLeft: `4px solid ${borderGlow}`, padding: '30px', animationDelay: `${index * 0.1}s`}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                    <div>
                      <div style={{display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px'}}>
                        <h3 style={{margin: 0, fontSize: '1.3rem'}}>{prop.title}</h3>
                        <span style={{
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          background: prop.status === 'Passed' ? 'rgba(16, 185, 129, 0.2)' : (prop.status === 'Failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                          color: prop.status === 'Passed' ? 'var(--accent-green)' : (prop.status === 'Failed' ? 'var(--accent-red)' : '#60a5fa')
                        }}>
                          {prop.status}
                        </span>
                      </div>
                      <span style={{color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600}}>
                        Data Layer: <span style={{textDecoration: 'underline'}}>{prop.ipfs_hash}</span>
                      </span>
                    </div>
                  </div>
                  
                  <p style={{color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px'}}>
                    {prop.description}
                  </p>

                  <div style={{background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '12px', display: 'flex', gap: '30px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600}}>
                        <span style={{color: 'var(--accent-green)', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)'}}>✅ APPROVE ({prop.votes_for.toLocaleString()} VP)</span>
                        <span style={{color: 'var(--accent-red)', textShadow: '0 0 10px rgba(239, 68, 68, 0.4)'}}>❌ REJECT ({prop.votes_against.toLocaleString()} VP)</span>
                      </div>
                      <div style={{height: '10px', background: 'var(--bg-primary)', borderRadius: '5px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', marginBottom: '12px'}}>
                         <div style={{height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', width: `${forPct}%`, transition: 'width 0.5s ease-out'}}></div>
                         <div style={{height: '100%', background: 'linear-gradient(90deg, #ef4444, #b91c1c)', width: `${againstPct}%`, transition: 'width 0.5s ease-out'}}></div>
                      </div>
                      
                      {prop.status === 'Active' && (
                        <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between'}}>
                          <span>QUORUM PROGRESS ({Math.min(100, Math.floor((totalVotes/5000)*100))}%)</span>
                          <span>{totalVotes.toLocaleString()} / 5,000 VP</span>
                        </div>
                      )}
                    </div>
                    
                    {prop.status === 'Active' && !userVotes[prop.id] && (
                      <div style={{display: 'flex', gap: '12px'}}>
                        <button className="btn btn-sm" style={{background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.5)', color: 'var(--accent-green)', padding: '10px 16px', fontWeight: 'bold'}} onClick={() => handleVote(prop, true)}>+ Vote For</button>
                        <button className="btn btn-sm" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'var(--accent-red)', padding: '10px 16px', fontWeight: 'bold'}} onClick={() => handleVote(prop, false)}>- Vote Against</button>
                      </div>
                    )}
                    {userVotes[prop.id] && (
                      <div style={{background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '8px', fontSize:'0.85rem', color:'var(--text-primary)', fontWeight:700, border: '1px solid rgba(255,255,255,0.1)'}}>
                        You Voted: <span style={{marginLeft: '6px', color: userVotes[prop.id] === 'FOR' ? 'var(--accent-green)' : 'var(--accent-red)'}}>{userVotes[prop.id]}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
