'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Timer from '@/components/Timer';

interface Problem { question: string; answer: string; source?: string; }
type PlayerState = 'idle' | 'buzzed' | 'correct' | 'wrong';

export default function LocalGame() {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [running, setRunning] = useState(false);
  const [p1, setP1] = useState<PlayerState>('idle');
  const [p2, setP2] = useState<PlayerState>('idle');
  const [p1Answer, setP1Answer] = useState('');
  const [p2Answer, setP2Answer] = useState('');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, []);

  const fetchProblem = useCallback(async () => {
    setLoading(true);
    setShowAnswer(false);
    setP1('idle'); setP2('idle');
    setP1Answer(''); setP2Answer('');
    stopTimer();
    setTimeLeft(45);
    try {
      const res = await fetch('/api/problem');
      const data = await res.json();
      setProblem(data);
      setRunning(true);
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  // Timer countdown
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          setShowAnswer(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, stopTimer]);

  function checkBothWrong(newP1: PlayerState, newP2: PlayerState) {
    if (newP1 === 'wrong' && newP2 === 'wrong') {
      stopTimer();
      setShowAnswer(true);
    }
  }

  function submitAnswer(player: 1 | 2) {
    const answer = player === 1 ? p1Answer : p2Answer;
    const correct = answer.trim().toLowerCase() === problem?.answer?.trim().toLowerCase();
    if (player === 1) {
      const next: PlayerState = correct ? 'correct' : 'wrong';
      setP1(next);
      if (correct) { setP1Score(s => s + 1); stopTimer(); setShowAnswer(true); }
      else checkBothWrong(next, p2);
    } else {
      const next: PlayerState = correct ? 'correct' : 'wrong';
      setP2(next);
      if (correct) { setP2Score(s => s + 1); stopTimer(); setShowAnswer(true); }
      else checkBothWrong(p1, next);
    }
  }

  const stateColor = (s: PlayerState) =>
    s === 'correct' ? 'border-green-400 bg-green-900/30' :
    s === 'wrong' ? 'border-red-400 bg-red-900/30' :
    s === 'buzzed' ? 'border-yellow-400 bg-yellow-900/30' :
    'border-gray-600 bg-gray-800';

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-4xl">
        <a href="/" className="text-gray-500 hover:text-white text-sm">← Back</a>
        <h1 className="text-2xl font-black text-yellow-400">MATHCOUNTS Buzzer</h1>
        <div className="w-16" />
      </div>

      {/* Scores */}
      <div className="flex gap-8 text-center">
        <div><div className="text-3xl font-black text-blue-400">{p1Score}</div><div className="text-xs text-gray-500">Player 1</div></div>
        <div className="text-gray-600 text-2xl font-bold self-center">VS</div>
        <div><div className="text-3xl font-black text-pink-400">{p2Score}</div><div className="text-xs text-gray-500">Player 2</div></div>
      </div>

      {/* Timer */}
      <Timer timeLeft={timeLeft} />

      {/* Problem */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl min-h-32 flex flex-col items-center justify-center text-center gap-3">
        {loading ? (
          <div className="text-gray-400 animate-pulse">Loading problem…</div>
        ) : problem ? (
          <>
            <p className="text-lg leading-relaxed">{problem.question}</p>
            {showAnswer && (
              <div className="mt-2 text-green-400 font-bold text-xl">Answer: {problem.answer}</div>
            )}
          </>
        ) : (
          <p className="text-gray-500">Press "Next Problem" to start</p>
        )}
      </div>

      {/* Next Problem button */}
      <button
        onClick={fetchProblem}
        disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 px-8 rounded-xl text-lg transition"
      >
        {problem ? 'Next Problem' : 'Start'}
      </button>

      {/* Player panels */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Player 1 */}
        <div className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition ${stateColor(p1)}`}>
          <div className="text-blue-400 font-bold text-center">Player 1</div>
          <button
            onClick={() => problem && p1 === 'idle' && running && setP1('buzzed')}
            disabled={!problem || p1 !== 'idle' || !running}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-2xl py-6 rounded-xl transition active:scale-95"
          >
            BUZZ!
          </button>
          {p1 === 'buzzed' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={p1Answer}
                onChange={e => setP1Answer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer(1)}
                placeholder="Answer…"
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1"
                autoFocus
              />
              <button
                onClick={() => submitAnswer(1)}
                className="bg-blue-500 hover:bg-blue-400 px-3 py-2 rounded-lg text-sm font-bold"
              >
                ✓
              </button>
            </div>
          )}
          {p1 === 'correct' && <div className="text-green-400 text-center font-bold">✓ Correct!</div>}
          {p1 === 'wrong' && <div className="text-red-400 text-center font-bold">✗ Wrong</div>}
        </div>

        {/* Player 2 */}
        <div className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition ${stateColor(p2)}`}>
          <div className="text-pink-400 font-bold text-center">Player 2</div>
          <button
            onClick={() => problem && p2 === 'idle' && running && setP2('buzzed')}
            disabled={!problem || p2 !== 'idle' || !running}
            className="bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-2xl py-6 rounded-xl transition active:scale-95"
          >
            BUZZ!
          </button>
          {p2 === 'buzzed' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={p2Answer}
                onChange={e => setP2Answer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer(2)}
                placeholder="Answer…"
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1"
                autoFocus
              />
              <button
                onClick={() => submitAnswer(2)}
                className="bg-pink-500 hover:bg-pink-400 px-3 py-2 rounded-lg text-sm font-bold"
              >
                ✓
              </button>
            </div>
          )}
          {p2 === 'correct' && <div className="text-green-400 text-center font-bold">✓ Correct!</div>}
          {p2 === 'wrong' && <div className="text-red-400 text-center font-bold">✗ Wrong</div>}
        </div>
      </div>
    </main>
  );
}
