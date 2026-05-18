'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Timer from '@/components/Timer';
import MathText from '@/components/MathText';
import AnswerInput from '@/components/AnswerInput';

const WIN_SCORE = 10;
interface Problem { question: string; answer: string; }
type PlayerState = 'idle' | 'buzzed' | 'correct' | 'wrong';

export default function LocalGame() {
  const [problem,       setProblem]       = useState<Problem | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [timeLeft,      setTimeLeft]      = useState(45);
  const [running,       setRunning]       = useState(false);
  const [p1,            setP1]            = useState<PlayerState>('idle');
  const [p2,            setP2]            = useState<PlayerState>('idle');
  const [p1Answer,      setP1Answer]      = useState('');
  const [p2Answer,      setP2Answer]      = useState('');
  const [p1Score,       setP1Score]       = useState(0);
  const [p2Score,       setP2Score]       = useState(0);
  const [showAnswer,    setShowAnswer]    = useState(false);
  const [winner,        setWinner]        = useState<string | null>(null);
  const [buzzCountdown, setBuzzCountdown] = useState<number | null>(null);
  const [buzzedPlayer,  setBuzzedPlayer]  = useState<1 | 2 | null>(null);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const buzzTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedRef      = useRef<string[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, []);

  function clearBuzzTimer() {
    if (buzzTimerRef.current) clearInterval(buzzTimerRef.current);
    buzzTimerRef.current = null;
    setBuzzCountdown(null);
    setBuzzedPlayer(null);
  }

  // Auto-wrong when buzz countdown expires
  function autoWrong(player: 1 | 2) {
    clearBuzzTimer();
    if (player === 1) {
      setP1('wrong');
      setP2(cur => {
        if (cur === 'wrong') { stopTimer(); setShowAnswer(true); }
        return cur;
      });
    } else {
      setP2('wrong');
      setP1(cur => {
        if (cur === 'wrong') { stopTimer(); setShowAnswer(true); }
        return cur;
      });
    }
  }

  function startBuzz(player: 1 | 2) {
    clearBuzzTimer();
    setBuzzedPlayer(player);
    if (player === 1) setP1('buzzed'); else setP2('buzzed');

    let count = 3;
    setBuzzCountdown(count);
    buzzTimerRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        autoWrong(player);
      } else {
        setBuzzCountdown(count);
      }
    }, 1000);
  }

  const fetchProblem = useCallback(async () => {
    clearBuzzTimer();
    setLoading(true);
    setShowAnswer(false);
    setP1('idle'); setP2('idle');
    setP1Answer(''); setP2Answer('');
    stopTimer(); setTimeLeft(45);
    try {
      const params = usedRef.current.length
        ? `?used=${encodeURIComponent(usedRef.current.join(','))}`
        : '';
      const res = await fetch(`/api/problem${params}`);
      const data = await res.json();
      usedRef.current = [...usedRef.current, data.question].slice(-40);
      setProblem(data);
      setRunning(true);
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopTimer(); setShowAnswer(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, stopTimer]);

  function submitAnswer(player: 1 | 2) {
    clearBuzzTimer();
    const answer = player === 1 ? p1Answer : p2Answer;
    const correct = answer.trim().toLowerCase() === problem?.answer?.trim().toLowerCase();
    if (player === 1) {
      const next: PlayerState = correct ? 'correct' : 'wrong';
      setP1(next);
      if (correct) {
        const s = p1Score + 1; setP1Score(s); stopTimer(); setShowAnswer(true);
        if (s >= WIN_SCORE) setWinner('Player 1');
      } else {
        setP2(cur => { if (cur === 'wrong') { stopTimer(); setShowAnswer(true); } return cur; });
      }
    } else {
      const next: PlayerState = correct ? 'correct' : 'wrong';
      setP2(next);
      if (correct) {
        const s = p2Score + 1; setP2Score(s); stopTimer(); setShowAnswer(true);
        if (s >= WIN_SCORE) setWinner('Player 2');
      } else {
        setP1(cur => { if (cur === 'wrong') { stopTimer(); setShowAnswer(true); } return cur; });
      }
    }
  }

  function resetGame() {
    clearBuzzTimer(); stopTimer();
    setP1Score(0); setP2Score(0); setWinner(null); setProblem(null);
    setShowAnswer(false); setTimeLeft(45); setP1('idle'); setP2('idle');
    usedRef.current = [];
  }

  const stateColor = (s: PlayerState) =>
    s === 'correct' ? 'border-green-400 bg-green-900/30' :
    s === 'wrong'   ? 'border-red-400 bg-red-900/30'     :
    s === 'buzzed'  ? 'border-yellow-400 bg-yellow-900/30' :
    'border-gray-600 bg-gray-800';

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-6">

      {winner && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 gap-6">
          <div className="text-8xl">🏆</div>
          <h2 className="text-5xl font-black text-yellow-400">{winner} Wins!</h2>
          <p className="text-gray-400">First to {WIN_SCORE} correct answers</p>
          <button onClick={resetGame}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 px-10 rounded-2xl text-xl mt-4">
            Play Again
          </button>
        </div>
      )}

      <div className="flex items-center justify-between w-full max-w-4xl">
        <a href="/" className="text-gray-500 hover:text-white text-sm">← Back</a>
        <h1 className="text-2xl font-black text-yellow-400">MATHCOUNTS Buzzer</h1>
        <div className="w-16" />
      </div>

      <div className="flex gap-8 text-center">
        <div>
          <div className="text-3xl font-black text-blue-400">{p1Score}</div>
          <div className="text-xs text-gray-500">Player 1</div>
          <div className="mt-1 h-1.5 w-24 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${(p1Score / WIN_SCORE) * 100}%` }} />
          </div>
        </div>
        <div className="text-gray-600 text-2xl font-bold self-center">VS</div>
        <div>
          <div className="text-3xl font-black text-pink-400">{p2Score}</div>
          <div className="text-xs text-gray-500">Player 2</div>
          <div className="mt-1 h-1.5 w-24 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-pink-400 rounded-full transition-all" style={{ width: `${(p2Score / WIN_SCORE) * 100}%` }} />
          </div>
        </div>
      </div>

      <Timer timeLeft={timeLeft} />

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl min-h-32 flex flex-col items-center justify-center text-center gap-3">
        {loading ? (
          <div className="text-gray-400 animate-pulse">Loading problem…</div>
        ) : problem ? (
          <>
            <p className="text-lg leading-relaxed"><MathText text={problem.question} /></p>
            {showAnswer && <div className="mt-2 text-green-400 font-bold text-xl">Answer: <MathText text={problem.answer} /></div>}
          </>
        ) : (
          <p className="text-gray-500">Press "Start" to begin</p>
        )}
      </div>

      <button onClick={fetchProblem} disabled={loading}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 px-8 rounded-xl text-lg transition">
        {problem ? 'Next Problem' : 'Start'}
      </button>

      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Player 1 */}
        <div className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition ${stateColor(p1)}`}>
          <div className="text-blue-400 font-bold text-center">Player 1</div>
          <button
            onClick={() => problem && p1 === 'idle' && running && !buzzedPlayer && startBuzz(1)}
            disabled={!problem || p1 !== 'idle' || !running || buzzedPlayer !== null}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-2xl py-6 rounded-xl transition active:scale-95">
            BUZZ!
          </button>
          {p1 === 'buzzed' && (
            <AnswerInput
              value={p1Answer} onChange={setP1Answer}
              onSubmit={() => submitAnswer(1)}
              btnClass="bg-blue-500 hover:bg-blue-400 text-white"
              countdown={buzzCountdown}
            />
          )}
          {p1 === 'correct' && <div className="text-green-400 text-center font-bold">✓ Correct!</div>}
          {p1 === 'wrong'   && <div className="text-red-400   text-center font-bold">✗ Wrong</div>}
        </div>

        {/* Player 2 */}
        <div className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition ${stateColor(p2)}`}>
          <div className="text-pink-400 font-bold text-center">Player 2</div>
          <button
            onClick={() => problem && p2 === 'idle' && running && !buzzedPlayer && startBuzz(2)}
            disabled={!problem || p2 !== 'idle' || !running || buzzedPlayer !== null}
            className="bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-2xl py-6 rounded-xl transition active:scale-95">
            BUZZ!
          </button>
          {p2 === 'buzzed' && (
            <AnswerInput
              value={p2Answer} onChange={setP2Answer}
              onSubmit={() => submitAnswer(2)}
              btnClass="bg-pink-500 hover:bg-pink-400 text-white"
              countdown={buzzCountdown}
            />
          )}
          {p2 === 'correct' && <div className="text-green-400 text-center font-bold">✓ Correct!</div>}
          {p2 === 'wrong'   && <div className="text-red-400   text-center font-bold">✗ Wrong</div>}
        </div>
      </div>
    </main>
  );
}
