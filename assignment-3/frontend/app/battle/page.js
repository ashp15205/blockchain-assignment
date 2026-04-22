'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getRandomQuestions } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import { getStakingContract, BATTLE_STAKING_ADDRESS } from '@/lib/contracts';
import { ethers } from 'ethers';
import { isSupabaseConfigured } from '@/lib/supabase';

const STAKE_OPTIONS = [
  { label: '0.0001 ETH', value: '0.0001', usd: '~$0.25' },
  { label: '0.0005 ETH', value: '0.0005', usd: '~$1.25' },
  { label: '0.001 ETH',  value: '0.001',  usd: '~$2.50' },
];

const POINTS_PER_CORRECT = 1;
const WIN_BONUS_POINTS = 10;
const TOTAL_TIME = 180;
const MAX_WARNINGS = 3;
const VS_COUNTDOWN = 10;

export default function BattlePage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const { isConnected, address } = useWallet();
  const router = useRouter();

  const [phase, setPhase] = useState('setup');
  const [selectedStake, setSelectedStake] = useState(STAKE_OPTIONS[0].value);
  const [isSearching, setIsSearching] = useState(false); 

  const [matchData, setMatchData] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [vsCountdown, setVsCountdown] = useState(VS_COUNTDOWN);
  const [startTime, setStartTime] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const [cheatDetected, setCheatDetected] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [stakingStatus, setStakingStatus] = useState(null); 
  const [matchmakingTime, setMatchmakingTime] = useState(0);
  const [latency, setLatency] = useState(0);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [animatedElo, setAnimatedElo] = useState(0);
  const [redirectTimer, setRedirectTimer] = useState(15);
  const [stakingTx, setStakingTx] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const channelRef = useRef(null);
  const isResumingRef = useRef(false);
  const phaseRef = useRef(phase);
  const cancellationHandledRef = useRef(false);
  const rewardsProcessedRef = useRef(false);
  const stakingAttemptRef = useRef(null);
  const stakingCompletedRef = useRef(null);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Not connected';

  const resetLocalMatchState = useCallback(() => {
    localStorage.removeItem('kb_mid');
    localStorage.removeItem('kb_score');
    localStorage.removeItem('kb_qindex');
    setMatchData(null);
    setStakingStatus(null);
    setStakingTx(null);
    setVsCountdown(VS_COUNTDOWN);
    setTimeLeft(TOTAL_TIME);
    cancellationHandledRef.current = false;
    rewardsProcessedRef.current = false;
    stakingAttemptRef.current = null;
    stakingCompletedRef.current = null;
  }, []);

  const refundCreatorStake = useCallback(async (match) => {
    if (!isPlayer1 || !match?.p1_staked || match?.p2_staked) return;
    const contract = await getStakingContract(true);
    if (!contract || BATTLE_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    const tx = await contract.cancelMatch(match.id);
    setStakingTx(tx.hash);
    await tx.wait();
  }, [isPlayer1]);

  const handleCancelledMatch = useCallback(async (match, reason = 'Match cancelled.') => {
    if (!match || cancellationHandledRef.current) return;
    cancellationHandledRef.current = true;
    try {
      await refundCreatorStake(match);
    } catch (err) {
      console.error('REFUND_FAILED:', err);
    }
    document.exitFullscreen?.().catch(() => {});
    resetLocalMatchState();
    setPhase('setup');
    alert(reason);
  }, [refundCreatorStake, resetLocalMatchState]);

  const finishMatch = useCallback(async (finalScoreVal, forcedForfeit = false) => {
    if (!matchData) return;
    const s = forcedForfeit ? 0 : (finalScoreVal ?? score);
    if (forcedForfeit) setScore(0);
    const startTimeVal = startTime || Date.now();
    const timeTaken = Date.now() - startTimeVal;
    const payload = isPlayer1 ? { p1_score: s, p1_time: timeTaken, p1_finished: true } : { p2_score: s, p2_time: timeTaken, p2_finished: true };
    const { data: updated } = await supabase.from('game_matches').update(payload).eq('id', matchData.id).select().single();
    setMatchData(updated);
    const opDone = isPlayer1 ? updated.p2_finished : updated.p1_finished;
    if (forcedForfeit || opDone) { setPhase('results'); processRewards(updated, s, forcedForfeit); }
    else setPhase('waiting_opponent');
  }, [matchData, isPlayer1, score, startTime]);

  async function processRewards(match, myScore, forcedForfeit = false) {
    if (!match || rewardsProcessedRef.current) return;
    rewardsProcessedRef.current = true;
    try {
      const contract = await getStakingContract(true);
      
      const opS = isPlayer1 ? (match.p2_score || 0) : (match.p1_score || 0);
      const myTime = isPlayer1 ? (match.p1_time || 0) : (match.p2_time || 0);
      const opTime = isPlayer1 ? (match.p2_time || 0) : (match.p1_time || 0);
      
      let won = myScore > opS;
      if (myScore === opS) won = myTime <= opTime;
      
      if (won && !forcedForfeit && contract) {

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const winnerAddress = await signer.getAddress();
        const onChainMatch = await contract.matches(match.id);
        const player1Address = (onChainMatch.player1 || '').toLowerCase();
        const player2Address = (onChainMatch.player2 || '').toLowerCase();
        const connectedAddress = winnerAddress.toLowerCase();

        if (connectedAddress !== player1Address && connectedAddress !== player2Address) {
          throw new Error(
            `Connected wallet ${winnerAddress} is not one of the on-chain match participants. ` +
            `Reconnect the wallet that actually paid the stake before claiming payout.`
          );
        }

        const tx = await contract.resolveMatch(match.id, winnerAddress);
        setStakingTx(tx.hash);
        await tx.wait();
      alert("🏆 Prize Distributed Successfully!");
      }
    } catch (err) { 
      console.error("REWARD_DISTRIBUTION_FAILED:", err);
      alert(`Payout failed: ${err.reason || err.message}. You may need to call resolveMatch from Remix.`);
    }
    document.exitFullscreen?.().catch(() => {});
    const opScore = isPlayer1 ? match.p2_score : match.p1_score;
    const myTime = isPlayer1 ? match.p1_time : match.p2_time;
    const opTime = isPlayer1 ? match.p2_time : match.p1_time;
    let won = false, tie = false;
    if (!forcedForfeit && myScore > opScore) won = true;
    else if (!forcedForfeit && myScore === opScore) { if (myTime < opTime) won = true; else if (myTime === opTime) tie = true; }
    const pts = (myScore * POINTS_PER_CORRECT) + (won ? WIN_BONUS_POINTS : 0);
    if (profile) await updateProfile({ points: (profile.points || 0) + pts, matches_played: (profile.matches_played || 0) + 1, wins: (profile.wins || 0) + (won ? 1 : 0), losses: (profile.losses || 0) + (!won && !tie ? 1 : 0), elo: (profile.elo || 200) + (won ? 25 : tie ? 0 : -15) });
    localStorage.removeItem('kb_mid'); 
    localStorage.removeItem('kb_score');
    localStorage.removeItem('kb_qindex');
  }

  function subscribeToMatch(mid, isP1) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`game_${mid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_matches', filter: `id=eq.${mid}` }, payload => {
        const d = payload.new;
        setMatchData(prev => {
          const updated = { ...prev, ...d };
          if (updated.status === 'matched' && (phaseRef.current === 'matchmaking' || phaseRef.current === 'setup')) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setStakingStatus(null);
            setStakingTx(null);
            setVsCountdown(VS_COUNTDOWN);
            setPhase('vs');
          }
          if (updated.status === 'cancelled') {
            handleCancelledMatch(updated, 'Match cancelled. Refunding confirmed stakes where possible.');
          }
          return updated;
        });
        
        const opS = isP1 ? d.p2_score : d.p1_score;
        if (opS != null) setOpponentScore(opS);

        const myDone = isP1 ? d.p1_finished : d.p2_finished;
        const opDone = isP1 ? d.p2_finished : d.p1_finished;
        if (myDone && opDone) {
          setPhase('results');
          const finalScore = isP1 ? (d.p1_score || 0) : (d.p2_score || 0);
          processRewards(d, finalScore, false);
        }
      }).subscribe();
    channelRef.current = channel;
  }

  async function initiateStaking(match) {
    if (!match) return;
    const roleKey = isPlayer1 ? 'p1' : 'p2';
    const stakeKey = `${match.id}:${roleKey}`;
    if (stakingCompletedRef.current === stakeKey || stakingAttemptRef.current === stakeKey) return;

    stakingAttemptRef.current = stakeKey;
    cancellationHandledRef.current = false;
    setStakingStatus('pending');
    try {
       const contract = await getStakingContract(true);
       if (contract && BATTLE_STAKING_ADDRESS !== '0x0000000000000000000000000000000000000000') {
         let tx;
         if (isPlayer1) {
            tx = await contract.createMatch(match.id, { value: ethers.parseEther(match.stake) });
         } else {
            // VERIFICATION: Check if match actually exists on blockchain before joining
            let existsOnChain = false;
            let retryCount = 0;
            while (!existsOnChain && retryCount < 15) {
               try {
                  const m = await contract.getMatch(match.id);
                  if (m && m.exists) {
                    existsOnChain = true; break;
                  }
               } catch(e) { console.log("Retrying match check...", e); }
               console.log(`Waiting for match to appear on-chain (Attempt ${retryCount+1}/15)...`);
               await new Promise(r => setTimeout(r, 2000));
               retryCount++;
            }
            if (!existsOnChain) throw new Error("Match not found on blockchain after 10s. Creator transaction might be slow.");
            
            tx = await contract.joinMatch(match.id, { value: ethers.parseEther(match.stake) });
         }
         
         setStakingTx(tx.hash);
         await tx.wait();
         
         const flag = isPlayer1 ? { p1_staked: true } : { p2_staked: true };
         const { error } = await supabase.from('game_matches').update(flag).eq('id', match.id);
         if (error) throw error;

         stakingCompletedRef.current = stakeKey;
         stakingAttemptRef.current = null;
         setStakingStatus('success');
       } else {
         const flag = isPlayer1 ? { p1_staked: true } : { p2_staked: true };
         await supabase.from('game_matches').update(flag).eq('id', match.id);
         stakingCompletedRef.current = stakeKey;
         stakingAttemptRef.current = null;
         setStakingStatus('demo'); 
       }
    } catch (err) { 
      console.error("BLOCKCHAIN_ERROR:", err);
      stakingAttemptRef.current = null;
      const cancelledFlag = isPlayer1
        ? { status: 'cancelled', p1_staked: false }
        : { status: 'cancelled', p2_staked: false };
      await supabase.from('game_matches').update(cancelledFlag).eq('id', match.id);
      setStakingStatus('failed');
      if (isPlayer1) {
        await handleCancelledMatch(
          { ...match, ...cancelledFlag },
          `Staking failed: ${err.reason || err.message || 'Transaction reverted'}. Match cancelled.`
        );
      }
    }
  }

  async function resumeMatch(mid) {
    isResumingRef.current = true;
    const { data, error } = await supabase.from('game_matches').select('*').eq('id', mid).single();
    if (error || !data) { localStorage.removeItem('kb_mid'); return; }
    const isP1 = data.player1_id === user.id;
    const isP2 = data.player2_id === user.id;
    if (!isP1 && !isP2) { localStorage.removeItem('kb_mid'); return; }
    setIsPlayer1(isP1); setMatchData(data); setSelectedStake(data.stake); subscribeToMatch(mid, isP1);
    const myFinished = isP1 ? data.p1_finished : data.p2_finished;
    const opFinished = isP1 ? data.p2_finished : data.p1_finished;
    if (myFinished && opFinished) { 
      localStorage.removeItem('kb_mid'); 
      localStorage.removeItem('kb_score');
      localStorage.removeItem('kb_qindex');
      setPhase('setup'); 
      return; 
    }
    else if (data.status === 'cancelled') {
      await handleCancelledMatch(data, 'This match was cancelled before it could start.');
      return;
    }
    else if (myFinished) setPhase('waiting_opponent');
    else if (data.status === 'playing' && data.p1_staked && data.p2_staked) {
      const age = Math.floor((Date.now() - new Date(data.started_at || data.created_at).getTime()) / 1000);
      const remaining = TOTAL_TIME - age;
      if (remaining <= 0) { finishMatch(score); }
      else { 
        setTimeLeft(remaining); setPhase('playing'); 
        const s = parseInt(localStorage.getItem('kb_score') || '0'); 
        const q = parseInt(localStorage.getItem('kb_qindex') || '0');
        setScore(s); setCurrentQ(Math.min(q, 9)); 
      }
    } else if (data.status === 'matched') {
      setStakingStatus(null);
      setStakingTx(null);
      setPhase('vs');
    } else if (data.status === 'waiting') setPhase('matchmaking');
  }

  async function handleSearch() {
    if (!profile) return;
    setIsSearching(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    localStorage.removeItem('kb_score'); localStorage.removeItem('kb_qindex');
    setCurrentQ(0); setScore(0); setWarnings(0); setCheatDetected(false);
    setStakingStatus(null); setStakingTx(null); setVsCountdown(VS_COUNTDOWN);
    cancellationHandledRef.current = false;
    try {
      const cutoff = new Date(Date.now() - 120000).toISOString(); // Increased to 2 minutes for better clock sync
      const { data: waiting, error: searchError } = await supabase.from('game_matches').select('*').eq('status', 'waiting').eq('stake', selectedStake).neq('player1_id', user.id).gt('created_at', cutoff).limit(5);
      
      console.log(`Matchmaking: Found ${waiting?.length || 0} potential matches.`, waiting);
      if (searchError) console.error("Matchmaking Search Error:", searchError);

      if (waiting && waiting.length > 0) {
        const match = waiting[0];
        const { data: updated, error } = await supabase.from('game_matches')
          .update({ 
            status: 'matched', 
            player2_id: user.id, 
            p2_username: profile.username, 
            p2_elo: profile.elo || 200
          })
          .eq('id', match.id)
          .select()
          .single();
        if (error) {
          console.error("Matchmaking Join Error:", error);
          throw error;
        }
        if (updated) {
          const fullMatch = { ...match, ...updated };
          setMatchData(fullMatch); setIsPlayer1(false);
          localStorage.setItem('kb_mid', match.id); subscribeToMatch(match.id, false);
          setPhase('vs'); setIsSearching(false); 
          // P2 enters VS immediately and begins staking once P1's createMatch tx is confirmed.
          return;
        }
      }
      const newMid = `match_${Date.now()}`;
      const qs = getRandomQuestions(10);
      const { data: newMatch, error: insertError } = await supabase.from('game_matches').insert({ 
        id: newMid, 
        stake: selectedStake, 
        player1_id: user.id, 
        p1_username: profile.username, 
        p1_elo: profile.elo || 200, 
        questions: qs,
        p1_staked: false,
        p2_staked: false 
      }).select().single();
      
      if (insertError) {
        console.error("Match Creation Error:", insertError);
        alert(`Failed to create match. This usually happens if your Supabase API keys are missing or invalid.`);
        setIsSearching(false);
        return;
      }
      
      // Request Fullscreen on user gesture (Button click)
      try { document.documentElement.requestFullscreen(); } catch(e) {}

      setMatchData(newMatch); setIsPlayer1(true);
      localStorage.setItem('kb_mid', newMid); subscribeToMatch(newMid, true);
      setPhase('matchmaking');
    } catch (err) { 
      console.error("Search Handler Error:", err);
      alert('Error searching for match. Check console for details.'); 
    }
    setIsSearching(false);
  }

  async function cancelSearch() {
    if (matchData && phase === 'matchmaking') {
      await supabase.from('game_matches').delete().eq('id', matchData.id);
      localStorage.removeItem('kb_mid');
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.exitFullscreen?.().catch(() => {});
      setPhase('setup'); setMatchData(null);
    }
  }

  async function handleAnswer(index) {
    if (showResult || showWarningModal || !matchData) return;
    setSelectedAnswer(index); setShowResult(true);
    let newScore = score;
    const isCorrect = index === matchData.questions[currentQ].correct;
    
    if (isCorrect) {
      newScore = score + 1; setScore(newScore);
      localStorage.setItem('kb_score', newScore);
    }
    localStorage.setItem('kb_qindex', currentQ + 1);
    
    // Ensure score is synced before moving on
    const scorePayload = isPlayer1 ? { p1_score: newScore } : { p2_score: newScore };
    const { error: syncError } = await supabase.from('game_matches').update(scorePayload).eq('id', matchData.id);
    if (syncError) console.error("SCORE_SYNC_FAILED:", syncError);

    setTimeout(() => {
      if (currentQ < matchData.questions.length - 1) {
        setCurrentQ(p => p + 1); 
        setSelectedAnswer(null); 
        setShowResult(false);
      } else { 
        finishMatch(newScore); 
      }
    }, 1200);
  }

  useEffect(() => {
    if (!matchData?.id) return;
    if (!isResumingRef.current) {
        const isActuallyPlaying = phase === 'vs' || phase === 'playing' || phase === 'matchmaking';
        if (isActuallyPlaying) {
            setScore(0); setCurrentQ(0); setWarnings(0); setCheatDetected(false);
            setShowWarningModal(false); setStartTime(Date.now()); setOpponentScore(0); setTimeLeft(TOTAL_TIME);
            localStorage.setItem('kb_score', 0); localStorage.setItem('kb_qindex', 0);
        }
    }
    isResumingRef.current = false;
  }, [matchData?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const start = Date.now();
      supabase.from('game_matches').select('id').limit(1).then(() => {
        setLatency(Date.now() - start); setIsSupabaseConnected(true);
      }).catch(() => setIsSupabaseConnected(false));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user && !loading) {
        const mid = localStorage.getItem('kb_mid');
        if (mid) resumeMatch(mid);
    }
  }, [user, loading]);

  useEffect(() => {
    if (phase !== 'results' || !profile) return;
    const target = profile.elo;
    const duration = 2000;
    const sTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - sTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const opS = isPlayer1 ? (matchData?.p2_score || 0) : (matchData?.p1_score || 0);
      const baseElo = profile.elo - (score > opS ? 25 : -15);
      const diff = profile.elo - baseElo;
      setAnimatedElo(Math.floor(baseElo + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    const rTimer = setInterval(() => {
      setRedirectTimer(prev => {
        if (prev <= 1) { clearInterval(rTimer); router.push('/dashboard'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(rTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'vs') return;
    const issueWarning = () => {
      setWarnings(prev => {
        const n = prev + 1;
        if (n >= MAX_WARNINGS) { setCheatDetected(true); finishMatch(score, true); } 
        else { setShowWarningModal(true); document.documentElement.requestFullscreen?.().catch(() => {}); }
        return n;
      });
    };
    let isUnloading = false;
    const onUnload = () => { isUnloading = true; };
    const onVisibility = () => { if (!isUnloading && document.visibilityState === 'hidden') issueWarning(); };
    const onFullscreen = () => { if (!isUnloading && !document.fullscreenElement) issueWarning(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [phase, finishMatch, score]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishMatch(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, finishMatch, score]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'vs') return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      if (confirm("Surrender? You will lose your stake if you leave now.")) finishMatch(score, true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase, score, finishMatch]);

  // VS Countdown Logic - Starts ONLY when both players have confirmed staking
  useEffect(() => {
    if (phase !== 'vs' || !matchData) return;
    
    // Force a fresh fetch once we enter VS to ensure we aren't using stale data
    const syncStakes = async () => {
      const { data } = await supabase.from('game_matches').select('p1_staked, p2_staked').eq('id', matchData.id).single();
      if (data) setMatchData(prev => ({ ...prev, ...data }));
    };
    if (matchData.p1_staked === false || matchData.p2_staked === false) {
      const i = setInterval(syncStakes, 3000);
      return () => clearInterval(i);
    }

    // Check if both have staked
    const bothStaked = matchData.p1_staked && matchData.p2_staked;
    
    // If NOT both staked, ensure countdown is reset to 10 and don't start timer
    if (!bothStaked) {
       setVsCountdown(10);
       return;
    }

    const vTimer = setInterval(() => {
      setVsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(vTimer);
          // Set DB status to 'playing' only when countdown actually hits 0
          if (isPlayer1) {
            supabase.from('game_matches').update({ 
              status: 'playing',
              started_at: new Date().toISOString() 
            }).eq('id', matchData.id).then(() => {});
          }
          setPhase('playing');
          setStartTime(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(vTimer);
  }, [phase, matchData?.p1_staked, matchData?.p2_staked, matchData?.id]);

  // STAKING SYNC: 
  // 1. Player 1 starts staking immediately upon entering VS
  // 2. Player 2 waits for Player 1 to finish first
  useEffect(() => {
    if (phase !== 'vs' || !matchData || stakingStatus !== null) return;
    
    if (isPlayer1) {
       console.log("P1_DETECTED: Initiating creator staking...");
       initiateStaking(matchData);
    } else if (matchData.p1_staked) {
       console.log("P1_STAKED_DETECTED: Initiating opponent staking...");
       initiateStaking(matchData);
    }
  }, [phase, matchData?.p1_staked, stakingStatus, isPlayer1]);

  useEffect(() => {
    if (phase !== 'matchmaking' || !matchData) return;
    setMatchmakingTime(0);
    
    // Heartbeat every 5s for Supabase to keep match alive
    const hb = setInterval(async () => {
      try {
        await supabase.from('game_matches').update({ created_at: new Date().toISOString() }).eq('id', matchData.id);
      } catch (e) {
        console.warn("Heartbeat failed", e);
      }
    }, 5000);

    // Display timer every 1s
    const timer = setInterval(() => {
      setMatchmakingTime(prev => {
        const next = prev + 1;
        if (next >= 60) { 
          clearInterval(timer); clearInterval(hb); 
          cancelSearch(); alert("No opponent found!"); 
          return 0; 
        }
        return next;
      });
    }, 1000);

    return () => { clearInterval(hb); clearInterval(timer); };
  }, [phase, matchData?.id]);

  const opUsername = isPlayer1 ? matchData?.p2_username : matchData?.p1_username;
  const opElo = isPlayer1 ? matchData?.p2_elo : matchData?.p1_elo;
  const winPrize = (parseFloat(selectedStake) * 1.8).toFixed(4);

  if (!mounted) return null;

  if (loading || !user || !profile) {
    const isConfigured = isSupabaseConfigured();
    return (
      <div style={{display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: 'var(--bg-primary)', gap: '20px'}}>
        {!isConfigured ? (
          <div className="glass-card" style={{padding: '30px', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--accent-red)'}}>
            <h3 style={{color: 'var(--accent-red)', marginBottom: '15px'}}>⚠️ Configuration Error</h3>
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
              Supabase API keys are missing in your environment. <br/><br/>
              <b>Fix:</b> Go to Vercel Settings &gt; Environment Variables and add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        ) : (
          <span className="loading-spinner" style={{width: 50, height: 50}}></span>
        )}
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <Navbar />
        <div className="battle-setup animate-in">
          <h1>⚔️ <span className="gradient-text">Ranked Battle</span></h1>
          <p style={{color: 'var(--text-secondary)', marginBottom: '40px'}}>Stake real crypto. Prove your DSA skills. Winner takes 1.8x the pot.</p>
          <div className="glass-card" style={{padding: '32px', maxWidth: '500px', margin: '0 auto 40px', border: '1px solid rgba(245, 158, 11, 0.2)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>🏆 Winner gets</span>
              <span style={{color: 'var(--accent-green)', fontWeight: 800}}>{winPrize} ETH (1.8x)</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>🏛️ Platform fee</span>
              <span style={{color: 'var(--text-muted)', fontWeight: 700}}>20% (auto-collected)</span>
            </div>
            <div style={{height: '1px', background: 'rgba(255,255,255,0.07)', margin: '10px 0 20px'}} />
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>📋 Questions</span>
              <span style={{fontWeight: 700}}>10 DSA Questions · 3 Minutes</span>
            </div>
          </div>
          <h3 style={{marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px'}}>Select Stake</h3>
          <div className="stake-selector">
            {STAKE_OPTIONS.map(opt => (
              <div key={opt.value} className={`stake-option ${selectedStake === opt.value ? 'selected' : ''}`} onClick={() => setSelectedStake(opt.value)}>
                <div className="amount">{opt.label}</div>
                <div className="label">Sepolia Testnet</div>
              </div>
            ))}
          </div>
          <button 
            className={`btn ${!isConnected ? 'btn-secondary' : 'btn-primary'} btn-lg`} 
            onClick={!isConnected ? () => alert("Please connect your wallet using the button in the Navbar first.") : handleSearch} 
            disabled={isSearching} 
            style={{marginTop: '32px', padding: '18px 60px', fontSize: '1.2rem'}}
          >
            {isSearching ? (
              <><span className="loading-spinner"></span> Finding Match...</>
            ) : !isConnected ? (
              <>🔒 Connect Wallet to Play</>
            ) : (
              <>⚔️ Start Battle</>
            )}
          </button>
          <p style={{marginTop: '14px', color: 'var(--text-muted)', fontSize: '0.8rem'}}>Full-screen mode enforced · Anti-cheat active · 3-strike forfeit</p>
        </div>
      </div>
    );
  }

  if (phase === 'matchmaking') {
    return (
      <div style={{minHeight: '100vh', background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden'}}>
        {/* Animated Background Elements */}
        <div style={{position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(80px)', animation: 'pulse 10s infinite alternate'}} />
        <div style={{position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '50%', filter: 'blur(100px)', animation: 'pulse 8s infinite alternate-reverse'}} />
        
        <div style={{textAlign: 'center', marginBottom: '50px', zIndex: 10}}>
          <div className="discovery-ring" style={{width: 120, height: 120, position: 'relative', margin: '0 auto 40px'}}>
             <div style={{position: 'absolute', inset: 0, border: '4px solid rgba(139, 92, 246, 0.1)', borderRadius: '50%'}} />
             <div style={{position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1.5s linear infinite'}} />
             <div style={{position: 'absolute', inset: '15px', border: '2px solid transparent', borderBottomColor: 'var(--accent-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite reverse'}} />
             <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'}}>🔍</div>
          </div>
          
          <h2 style={{fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', letterSpacing: '-1px'}}>Searching for <span className="gradient-text">Opponent</span></h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto 24px'}}>Establishing secure connection... Matchmaking pool: {selectedStake} ETH</p>
          
          <div className="glass-card" style={{padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '15px', border: '1px solid rgba(255,255,255,0.1)'}}>
            <span style={{color: 'var(--accent-orange)', fontWeight: 700, fontSize: '1.2rem'}}>{matchmakingTime}s</span>
            <div style={{width: '2px', height: '24px', background: 'rgba(255,255,255,0.1)'}} />
            <span style={{color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Seeking Match · {selectedStake} ETH</span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={cancelSearch} style={{zIndex: 10, padding: '14px 40px', borderRadius: '100px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)'}}>
          ✕ Cancel Search
        </button>

        <style jsx>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { from { transform: scale(1) opacity(0.3); } to { transform: scale(1.2) opacity(0.6); } }
        `}</style>
      </div>
    );
  }

  if (phase === 'vs' && matchData) {
    const p1Char = (profile?.username || 'P')[0].toUpperCase();
    const p2Char = (opUsername || 'O')[0].toUpperCase();
    
    return (
      <div style={{height: '100vh', width: '100vw', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative'}}>
        {/* Cinematic Backdrop */}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0a0a0f, #12121a)', zIndex: 0}} />
        <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150%', height: '300px', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)', transform: 'translate(-50%, -50%) rotate(-15deg)', zIndex: 1}} />
        
        {/* Countdown Header */}
        <div style={{zIndex: 10, textAlign: 'center', position: 'absolute', top: '10%'}}>
           <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '10px'}}>Combat Initializing In</div>
           <div style={{fontSize: '5rem', fontWeight: 900, color: 'white', textShadow: '0 0 30px var(--accent-purple)', lineHeight: 1}}>{vsCountdown}</div>
           <div style={{marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace'}}>
             Connected Wallet: {shortAddr(address)}
           </div>
        </div>

        {/* VS Main Arena */}
        <div style={{display: 'flex', width: '100%', maxWidth: '1200px', justifyContent: 'space-between', alignItems: 'center', padding: '0 50px', zIndex: 10}}>
          {/* Player 1 Card */}
          <div style={{textAlign: 'center', width: '300px'}}>
            <div className="p-avatar" style={{width: 180, height: 180, borderRadius: '24px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', margin: '0 auto 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', fontWeight: 900, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 40px rgba(139,92,246,0.3)', border: '2px solid rgba(255,255,255,0.1)', transform: 'perspective(1000px) rotateY(15deg)'}}>{p1Char}</div>
            <h2 style={{fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-1px'}}>{profile?.username}</h2>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: '100px', border: '1px solid rgba(139,92,246,0.2)'}}>
               <span style={{width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%'}} />
               <span style={{fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 700}}>ELO {profile?.elo || 200}</span>
            </div>
          </div>

          {/* VS Cinematic Center */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'}}>
              {/* Countdown Overlay */}
              {matchData.p1_staked && matchData.p2_staked && (
                <div style={{position: 'absolute', top: '-100px', fontSize: '6rem', fontWeight: 900, color: 'var(--accent-orange)', textShadow: '0 0 40px rgba(245,158,11,0.5)', animation: 'pulse 1s infinite'}}>
                  {vsCountdown}
                </div>
              )}
              <div style={{position: 'absolute', top: '-150%', bottom: '-150%', width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)'}} />
             <div style={{width: 100, height: 100, background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 0 50px rgba(239,68,68,0.2)'}}>
                <span style={{fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-red)', textShadow: '0 0 20px rgba(239,68,68,0.5)'}}>VS</span>
             </div>
             <div style={{marginTop: '20px', textAlign: 'center'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700}}>FOR THE POT</div>
                <div style={{fontSize: '1.5rem', color: 'var(--accent-green)', fontWeight: 900}}>🏆 {winPrize} ETH</div>
             </div>
          </div>

          {/* Player 2 Card */}
          <div style={{textAlign: 'center', width: '300px'}}>
            <div className="p-avatar" style={{width: 180, height: 180, borderRadius: '24px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', margin: '0 auto 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', fontWeight: 900, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 40px rgba(239,68,68,0.3)', border: '2px solid rgba(255,255,255,0.1)', transform: 'perspective(1000px) rotateY(-15deg)'}}>{p2Char}</div>
            <h2 style={{fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-1px'}}>{opUsername || 'Opponent'}</h2>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: '100px', border: '1px solid rgba(239,68,68,0.2)'}}>
               <span style={{width: 8, height: 8, background: 'var(--accent-red)', borderRadius: '50%'}} />
               <span style={{fontSize: '0.9rem', color: 'var(--accent-red)', fontWeight: 700}}>ELO {opElo || '??'}</span>
            </div>
          </div>
        </div>

        {/* Connection Status Foot */}
        <div style={{position: 'absolute', bottom: '10%', zIndex: 10, width: '100%', maxWidth: '600px'}}>
           <div className="glass-card" style={{padding: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)'}}>
              <div style={{display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px'}}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{width: 12, height: 12, background: matchData.p1_staked ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', borderRadius: '50%', boxShadow: matchData.p1_staked ? '0 0 10px var(--accent-green)' : 'none'}} />
                    <span style={{fontSize: '0.8rem', color: matchData.p1_staked ? 'white' : 'var(--text-muted)'}}>{matchData.p1_username || 'Player 1'}</span>
                 </div>
                 <div style={{width: '1px', background: 'rgba(255,255,255,0.1)'}} />
                 <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{width: 12, height: 12, background: matchData.p2_staked ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', borderRadius: '50%', boxShadow: matchData.p2_staked ? '0 0 10px var(--accent-green)' : 'none'}} />
                    <span style={{fontSize: '0.8rem', color: matchData.p2_staked ? 'white' : 'var(--text-muted)'}}>{matchData.p2_username || 'Finding...'}</span>
                 </div>
              </div>

              <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700}}>
                 {stakingStatus === 'failed' ? '❌ BLOCKCHAIN AUTHENTICATION FAILED' : !(matchData.p1_staked && matchData.p2_staked) ? '📡 Awaiting Double-Consent Verification...' : '⚔️ BOTH STAKED · READY FOR COMBAT'}
              </p>
              
              <div style={{height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden'}}>
                 <div style={{height: '100%', background: stakingStatus === 'failed' ? 'var(--accent-red)' : 'linear-gradient(90deg, var(--accent-purple), var(--accent-success))', width: matchData.p1_staked && matchData.p2_staked ? '100%' : matchData.p1_staked || matchData.p2_staked ? '50%' : '5%', transition: 'all 0.8s' }} />
              </div>

              {stakingStatus === 'pending' && <p style={{marginTop: '16px', fontSize: '0.85rem', color: 'var(--accent-orange)', animation: 'pulse 1s infinite'}}>Check MetaMask → Pay {selectedStake} ETH</p>}
              {stakingStatus === 'failed' && (
                <div style={{marginTop: '16px'}}>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>Try Again</button>
                </div>
              )}
              {stakingTx && (
                <a href={`https://sepolia.etherscan.io/tx/${stakingTx}`} target="_blank" rel="noreferrer" style={{display: 'block', marginTop: '14px', color: 'var(--accent-green)', fontSize: '0.8rem', textDecoration: 'underline'}}>
                   ⛓️ View Staking on Etherscan ↗
                </a>
              )}
           </div>
        </div>

        <style jsx>{`
          @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          .p-avatar { transition: transform 0.3s ease; }
          .p-avatar:hover { transform: perspective(1000px) rotateY(0deg) scale(1.05) !important; }
        `}</style>
      </div>
    );
  }

  if (phase === 'waiting_opponent') {
    return (
      <div style={{minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <span className="loading-spinner" style={{width: 60, height: 60, marginBottom: '30px'}}></span>
        <h2 style={{marginBottom: '10px'}}>🎯 You finished!</h2>
        <p style={{color: 'var(--text-secondary)'}}>Waiting for <strong>{opUsername}</strong> to complete their questions...</p>
        <div className="glass-card" style={{marginTop: '40px', padding: '20px 40px', textAlign: 'center'}}>
          <div style={{color: 'var(--accent-green)', fontSize: '3rem', fontWeight: 900}}>{score}/10</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Your final score</div>
        </div>
      </div>
    );
  }

  if (phase === 'playing' && matchData) {
    const q = matchData.questions[currentQ];
    const timerPct = (timeLeft / TOTAL_TIME) * 100;
    const timerCol = timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : '#10b981';
    
    return (
      <div style={{height: '100vh', width: '100vw', background: '#050508', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none'}} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()} onPaste={e => e.preventDefault()}>
        {/* Anti-Cheat Overlay */}
        {showWarningModal && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)'}}>
            <div className="glass-card" style={{padding: '50px', textAlign: 'center', border: '2px solid var(--accent-red)', maxWidth: '500px', boxShadow: '0 0 100px rgba(239,68,68,0.2)'}}>
              <div style={{fontSize: '5rem', marginBottom: '20px'}}>⚠️</div>
              <h2 style={{color: 'var(--accent-red)', fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px', letterSpacing: '-1px'}}>SECURITY BREACH</h2>
              <p style={{color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '24px'}}>Window focus lost. Full-screen mode is mandatory for ranked play.</p>
              <div style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '32px'}}>
                <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px'}}>System Health</div>
                <strong style={{color: 'var(--accent-red)', fontSize: '1.8rem'}}>Strike {warnings} of {MAX_WARNINGS}</strong>
              </div>
              <button className="btn btn-primary" style={{width: '100%', height: '56px', fontSize: '1.1rem'}} onClick={() => { setShowWarningModal(false); document.documentElement.requestFullscreen?.().catch(() => {}); }}>RESTORE CONNECTION</button>
            </div>
          </div>
        )}

        {/* Global Progress Line */}
        <div style={{height: '4px', background: 'rgba(255,255,255,0.03)', position: 'relative'}}>
            <div style={{height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', width: `${((currentQ) / 10) * 100}%`, transition: 'width 0.5s ease'}} />
        </div>

        {/* Top Battle HUD */}
        <div style={{display: 'flex', alignItems: 'center', padding: '12px 24px', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '40px'}}>
          {/* Player Stats */}
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1}}>
            <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-purple), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(139,92,246,0.3)'}}>{(profile?.username || 'P')[0].toUpperCase()}</div>
            <div>
              <div style={{fontSize: '1.1rem', fontWeight: 800}}>{profile?.username}</div>
              <div style={{display: 'flex', gap: '4px'}}>
                 {[...Array(10)].map((_, i) => (
                    <div key={i} style={{width: '12px', height: '6px', borderRadius: '2px', background: i < score ? 'var(--accent-green)' : i === currentQ ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s'}} />
                 ))}
              </div>
            </div>
          </div>

          {/* Center Timer */}
          <div style={{textAlign: 'center', position: 'relative'}}>
            <div style={{fontSize: '2.8rem', fontWeight: 900, color: timerCol, textShadow: `0 0 25px ${timerCol}`, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{fmt(timeLeft)}</div>
            <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, marginTop: '4px', letterSpacing: '2px'}}>TIME REMAINING</div>
          </div>

          {/* Opponent Stats */}
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end'}}>
             <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-red)'}}>{opUsername || 'Opponent'}</div>
                <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                   {[...Array(10)].map((_, i) => (
                      <div key={i} style={{width: '12px', height: '6px', borderRadius: '2px', background: i < opponentScore ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s'}} />
                   ))}
                </div>
             </div>
             <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'}}>{(opUsername || 'O')[0].toUpperCase()}</div>
          </div>
        </div>

        {/* Quest Arena */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative'}}>
          {/* Background Motif */}
          <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '20rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', pointerEvents: 'none', userSelect: 'none', zIndex: 0}}>Q{currentQ + 1}</div>
          
          <div style={{maxWidth: '850px', width: '100%', zIndex: 1}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px'}}>
               <span style={{background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, border: '1px solid rgba(139,92,246,0.2)'}}>{q?.topic || 'General DSA'}</span>
               <div style={{width: '4px', height: '4px', background: 'var(--text-muted)', borderRadius: '50%'}} />
               <span style={{color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem'}}>Question {currentQ + 1} of 10</span>
            </div>

            <div className="glass-card" style={{padding: '40px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'}}>
               <h2 style={{fontSize: '1.6rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '-0.3px'}}>{q?.question || 'Loading question...'}</h2>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              {(q?.options || []).map((opt, i) => {
                const isSelected = i === selectedAnswer;
                const isCorrect = showResult && i === q.correct;
                const isWrong = showResult && isSelected && i !== q.correct;
                
                let borderColor = 'rgba(255,255,255,0.05)';
                let glow = 'none';
                let bg = 'rgba(255,255,255,0.02)';
                
                if (isSelected && !showResult) { borderColor = 'var(--accent-purple)'; bg = 'rgba(139,92,246,0.05)'; }
                if (isCorrect) { borderColor = 'var(--accent-green)'; bg = 'rgba(16,185,129,0.08)'; glow = '0 0 20px rgba(16,185,129,0.1)'; }
                if (isWrong) { borderColor = 'var(--accent-red)'; bg = 'rgba(239,68,68,0.08)'; glow = '0 0 20px rgba(239,68,68,0.1)'; }

                return (
                  <button 
                    key={i} 
                    disabled={showResult} 
                    className="option-btn"
                    style={{
                      background: bg, 
                      border: `1px solid ${borderColor}`, 
                      borderRadius: '16px', 
                      padding: '24px', 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '20px', 
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: glow
                    }} 
                    onClick={() => handleAnswer(i)}
                  >
                    <div style={{
                       width: '36px', 
                       height: '36px', 
                       borderRadius: '10px', 
                       background: isSelected ? 'var(--accent-purple)' : isCorrect ? 'var(--accent-green)' : isWrong ? 'var(--accent-red)' : 'rgba(255,255,255,0.05)', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center', 
                       fontWeight: 800,
                       color: isSelected || isCorrect || isWrong ? 'white' : 'var(--text-secondary)',
                       transition: 'all 0.3s'
                    }}>
                       {String.fromCharCode(65 + i)}
                    </div>
                    <span style={{fontSize: '1.05rem', fontWeight: 500, color: isCorrect ? 'var(--accent-green)' : isWrong ? 'var(--accent-red)' : 'var(--text-primary)'}}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <style jsx>{`
          .option-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.01); border-color: rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.04) !important; }
          .option-btn:active:not(:disabled) { transform: scale(0.98); }
        `}</style>
      </div>
    );
  }

  if (phase === 'results' && matchData) {
    const myS = isPlayer1 ? (matchData.p1_score || 0) : (matchData.p2_score || 0);
    const opS = isPlayer1 ? (matchData.p2_score || 0) : (matchData.p1_score || 0);
    const myT = isPlayer1 ? (matchData.p1_time || 0) : (matchData.p2_time || 0);
    const opT = isPlayer1 ? (matchData.p2_time || 0) : (matchData.p1_time || 0);
    let won = myS > opS;
    if (myS === opS) won = myT <= opT;
    const resultColor = won ? 'var(--accent-green)' : 'var(--accent-red)';
    
    return (
      <div style={{minHeight: '100vh', width: '100vw', background: 'radial-gradient(circle at center, #0a0a0f 0%, #000 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflow: 'hidden'}}>
        <div style={{textAlign: 'center', marginBottom: '60px', zIndex: 10}}>
          <div style={{fontSize: '7rem', marginBottom: '10px', textShadow: `0 0 50px ${won ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, animation: 'bounce 2s infinite'}}>{won ? '🏆' : '💀'}</div>
          <h1 style={{fontSize: '5rem', fontWeight: 900, color: resultColor, letterSpacing: '-2px', textShadow: `0 0 30px ${resultColor}55`}}>
             {won ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p style={{color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '10px'}}>Match Analysis Complete · {matchData.stake} ETH Pool Resolved</p>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '30px', maxWidth: '1000px', width: '100%', zIndex: 10, alignItems: 'center'}}>
          <div className="glass-card" style={{textAlign: 'center', padding: '40px', background: won ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${won ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`}}>
             <div style={{width: '90px', height: '90px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent-purple), #7c3aed)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.3)'}}>{(profile?.username || 'U')[0].toUpperCase()}</div>
             <h3 style={{fontSize: '1.4rem', fontWeight: 800}}>{profile?.username}</h3>
             <div style={{fontSize: '4rem', fontWeight: 900, margin: '15px 0', color: won ? 'var(--accent-green)' : 'white'}}>{myS}<span style={{fontSize: '1.2rem', color: 'var(--text-muted)'}}>/10</span></div>
             <div className="glass-card" style={{display: 'inline-block', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)'}}>
                ⏱️ {(myT/1000).toFixed(2)}s
             </div>
          </div>

          <div style={{fontSize: '2rem', fontWeight: 900, color: 'var(--text-muted)', opacity: 0.5}}>VS</div>

          <div className="glass-card" style={{textAlign: 'center', padding: '40px', background: !won ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${!won ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`}}>
             <div style={{width: '90px', height: '90px', borderRadius: '20px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.3)'}}>{(opUsername || 'O')[0].toUpperCase()}</div>
             <h3 style={{fontSize: '1.4rem', fontWeight: 800}}>{opUsername}</h3>
             <div style={{fontSize: '4rem', fontWeight: 900, margin: '15px 0', color: !won ? 'var(--accent-red)' : 'white'}}>{opS}<span style={{fontSize: '1.2rem', color: 'var(--text-muted)'}}>/10</span></div>
             <div className="glass-card" style={{display: 'inline-block', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)'}}>
                ⏱️ {(opT/1000).toFixed(2)}s
             </div>
          </div>
        </div>

        <div style={{marginTop: '50px', textAlign: 'center', zIndex: 10}}>
           <div style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 700}}>RANK ADJUSTMENT</div>
           <div style={{fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-orange)', textShadow: '0 0 20px rgba(245,158,11,0.3)'}}>{animatedElo >= 0 ? `+${animatedElo}` : animatedElo}</div>
        </div>

        <div style={{marginTop: '60px', display: 'flex', gap: '20px', zIndex: 10}}>
           <button className="btn btn-primary btn-lg" onClick={() => { window.location.reload(); }}>⚔️ PLAY AGAIN</button>
           <button className="btn btn-secondary btn-lg" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
        </div>
        
        <p style={{marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace'}}>
          Connected Wallet: {shortAddr(address)}
        </p>
        
        <p style={{marginTop: '40px', color: 'var(--text-muted)', fontSize: '0.9rem'}}>Auto-redirecting in {redirectTimer}s...</p>

        <style jsx>{`
          @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
        `}</style>
      </div>
    );
  }

  return null;
}
