'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getRandomQuestions } from '@/lib/questions';
import { supabase } from '@/lib/supabase';

export default function PlaygroundPage() {
  const { user, profile, updateProfile } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState('menu'); // menu | playing | results
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  function startPractice() {
    setQuestions(getRandomQuestions(10));
    setScore(0);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setPhase('playing');
  }

  function handleAnswer(index) {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    if (index === questions[currentQ].correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        finishPractice();
      }
    }, 1500);
  }

  async function finishPractice() {
    setPhase('results');

    if (profile) {
      try {
        await supabase.from('matches').insert({
          player_id: user.id,
          result: 'practice',
          score: score,
          opponent_score: 0,
          staked_amount: 0,
          points_earned: 0,
          tx_hash: null,
          mode: 'playground'
        });
      } catch (err) {
        console.error('Failed to save practice:', err);
      }
    }
  }

  if (!user) return null;

  if (phase === 'menu') {
    return (
      <div>
        <Navbar />
        <div className="battle-setup animate-in">
          <h1>🧠 <span className="gradient-text">Playground</span></h1>
          <p>Practice DSA questions without staking. Earn points for correct answers!</p>

          <div className="glass-card" style={{padding:'24px',marginBottom:'32px',textAlign:'left',maxWidth:'400px',margin:'0 auto 32px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
              <span style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>Questions</span>
              <span style={{fontWeight:700}}>10</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
              <span style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>Crypto staking</span>
              <span style={{fontWeight:700,color:'var(--text-muted)'}}>None</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>Timer</span>
              <span style={{fontWeight:700,color:'var(--text-muted)'}}>Untimed</span>
            </div>
          </div>

          <button className="btn btn-success btn-lg" onClick={startPractice}>
            🧠 Start Practice
          </button>

          <div style={{marginTop:'24px'}}>
            <span className="mode-tag web2" style={{fontSize:'0.85rem',padding:'6px 16px'}}>🌐 Web2 Only — No Wallet Required</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'playing' && questions.length > 0) {
    const q = questions[currentQ];

    return (
      <div>
        <Navbar />
        <div className="quiz-container">
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{width: `${((currentQ + 1) / questions.length) * 100}%`}}></div>
          </div>

          <div className="quiz-header">
            <div className="quiz-progress">Question {currentQ + 1}/{questions.length}</div>
            <div style={{color:'var(--accent-green)',fontWeight:600,fontSize:'0.9rem'}}>🧠 Practice Mode</div>
          </div>

          <span className="quiz-topic">{q.topic}</span>

          <div className="glass-card quiz-question">
            <h2>{q.question}</h2>
          </div>

          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let cls = 'quiz-option';
              if (showResult) {
                if (i === q.correct) cls += ' correct';
                else if (i === selectedAnswer && i !== q.correct) cls += ' wrong';
                else cls += ' disabled';
              } else if (i === selectedAnswer) {
                cls += ' selected';
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                >
                  <strong style={{marginRight:'8px',opacity:0.5}}>{String.fromCharCode(65 + i)}.</strong> {opt}
                </button>
              );
            })}
          </div>

          <div style={{textAlign:'center',marginTop:'24px'}}>
            <span style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>
              Score: <strong style={{color:'var(--accent-green)'}}>{score}</strong> / {currentQ + (showResult ? 1 : 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div>
      <Navbar />
      <div className="results-page animate-in">
        <div className="glass-card results-card">
          <div className="results-icon">{score >= 7 ? '🌟' : score >= 4 ? '👍' : '📚'}</div>
          <h1 className="results-title">
            {score >= 7 ? 'Excellent!' : score >= 4 ? 'Good Job!' : 'Keep Practicing!'}
          </h1>
          <p className="results-subtitle">You completed a practice round.</p>

          <div className="results-stats" style={{gridTemplateColumns: '1fr 1fr'}}>
            <div className="results-stat">
              <div className="results-stat-value" style={{color:'var(--accent-green)'}}>{score}/10</div>
              <div className="results-stat-label">Correct</div>
            </div>
            <div className="results-stat">
              <div className="results-stat-value" style={{color:'var(--accent-red)'}}>{10 - score}/10</div>
              <div className="results-stat-label">Wrong</div>
            </div>
          </div>

          <div className="results-buttons">
            <button className="btn btn-success" onClick={startPractice}>Practice Again</button>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
