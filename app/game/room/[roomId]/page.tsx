'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Timer from '@/components/Timer';

interface Problem { question: string; answer: string; }
interface Players { [id: string]: { name: string; score: number } }

export default function RoomGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const isHost = searchParams.get('host') === 'true';

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Players>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [buzzedPlayer, setBuzzedPlayer] = useState<{ id: string; name: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [myState, setMyState] = useState<'idle' | 'buzzed' | 'correct' | 'wrong'>('idle');
  const [results, setResults] = useState<{ name: string; correct: boolean; answer: string }[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io({ path: '/api/socketio' });
    socketRef.current = s;
    setSocket(s);
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('players-updated', (p: Players) => setPlayers(p));
    s.on('room-state', ({ problem, players, timeLeft }: { problem: Problem; players: Players; timeLeft: number }) => {
      if (problem) setProblem(problem);
      setPlayers(players);
      setTimeLeft(timeLeft);
    });
    s.on('new-problem', ({ problem, timeLeft }: { problem: Problem; timeLeft: number }) => {
      setProblem(problem);
      setTimeLeft(timeLeft);
      setMyState('idle');
      setBuzzedPlayer(null);
      setResults([]);
      setShowAnswer(false);
      setAnswer('');
    });
    s.on('timer-tick', ({ timeLeft }: { timeLeft: number }) => setTimeLeft(timeLeft));
    s.on('time-up', () => setShowAnswer(true));
    s.on('player-buzzed', ({ socketId, playerName }: { socketId: string; playerName: string }) => {
      setBuzzedPlayer({ id: socketId, name: playerName });
      if (socketId === s.id) setMyState('buzzed');
    });
    s.on('answer-result', ({ socketId, playerName, correct, answer, players }: { socketId: string; playerName: string; correct: boolean; answer: string; players: Players }) => {
      setPlayers(players);
      setResults(r => [...r, { name: playerName, correct, answer }]);
      if (socketId === s.id) setMyState(correct ? 'correct' : 'wrong');
      if (correct) setShowAnswer(true);
      setBuzzedPlayer(null);
    });
    s.on('all-wrong', () => setShowAnswer(true));

    return () => { s.disconnect(); };
  }, []);

  function joinRoom() {
    if (!playerName.trim() || !socketRef.current) return;
    socketRef.current.emit('join-room', { roomId, playerName: playerName.trim() });
    setJoined(true);
  }

  async function fetchAndSetProblem() {
    if (!socketRef.current) return;
    setLoading(true);
    try {
      const res = await fetch('/api/problem');
      const data = await res.json();
      socketRef.current.emit('set-problem', { roomId, problem: data });
    } finally {
      setLoading(false);
    }
  }

  function buzz() {
    if (!socketRef.current || myState !== 'idle' || !problem) return;
    socketRef.current.emit('buzz', { roomId });
  }

  function submitAnswer() {
    if (!socketRef.current || !answer.trim()) return;
    socketRef.current.emit('submit-answer', { roomId, answer: answer.trim() });
    setAnswer('');
  }

  if (!joined) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-black text-yellow-400">Join Room</h1>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center">
          <div className="text-gray-400 text-sm mb-1">Room Code</div>
          <div className="text-4xl font-black tracking-widest text-yellow-400">{roomId}</div>
        </div>
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 flex-1"
            autoFocus
          />
          <button
            onClick={joinRoom}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 rounded-lg"
          >
            Join
          </button>
        </div>
        <div className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? '● Connected' : '● Connecting…'}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <a href="/" className="text-gray-500 hover:text-white text-sm">← Back</a>
        <div className="text-center">
          <h1 className="text-xl font-black text-yellow-400">Room: {roomId}</h1>
          <div className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? '● Connected' : '● Reconnecting…'}
          </div>
        </div>
        <div className="w-16" />
      </div>

      {/* Scores */}
      <div className="flex gap-4 flex-wrap justify-center">
        {Object.entries(players).map(([id, p]) => (
          <div key={id} className={`text-center px-4 py-2 rounded-xl ${id === socketRef.current?.id ? 'bg-yellow-900/30 border border-yellow-400' : 'bg-gray-800'}`}>
            <div className="text-2xl font-black">{p.score}</div>
            <div className="text-xs text-gray-400">{p.name}{id === socketRef.current?.id ? ' (you)' : ''}</div>
          </div>
        ))}
      </div>

      <Timer timeLeft={timeLeft} />

      {/* Problem */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl min-h-32 flex flex-col items-center justify-center text-center gap-3">
        {problem ? (
          <>
            <p className="text-lg leading-relaxed">{problem.question}</p>
            {showAnswer && <div className="text-green-400 font-bold text-xl">Answer: {problem.answer}</div>}
          </>
        ) : (
          <p className="text-gray-500">{isHost ? 'Press "Next Problem" to start' : 'Waiting for host to start…'}</p>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {results.map((r, i) => (
            <div key={i} className={`text-sm px-3 py-1 rounded-full font-bold ${r.correct ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {r.name}: {r.correct ? '✓' : '✗'} {r.answer}
            </div>
          ))}
        </div>
      )}

      {/* Host controls */}
      {isHost && (
        <button
          onClick={fetchAndSetProblem}
          disabled={loading}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 px-8 rounded-xl text-lg transition"
        >
          {problem ? 'Next Problem' : 'Start'}
        </button>
      )}

      {/* Buzzer */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={buzz}
          disabled={!problem || myState !== 'idle' || showAnswer}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-3xl py-8 rounded-2xl transition active:scale-95 w-full"
        >
          {buzzedPlayer?.id === socketRef.current?.id ? '🔔 BUZZED!' : 'BUZZ!'}
        </button>

        {myState === 'buzzed' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              placeholder="Your answer…"
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 flex-1"
              autoFocus
            />
            <button
              onClick={submitAnswer}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-3 rounded-lg"
            >
              ✓
            </button>
          </div>
        )}
        {myState === 'correct' && <div className="text-green-400 text-center font-bold text-lg">✓ Correct!</div>}
        {myState === 'wrong' && <div className="text-red-400 text-center font-bold text-lg">✗ Wrong</div>}
      </div>
    </main>
  );
}
