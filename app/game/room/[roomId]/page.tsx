'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Pusher, { Channel } from 'pusher-js';
import Timer from '@/components/Timer';

interface Players { [id: string]: string }
interface Scores  { [id: string]: number }

function getPlayerId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('mathcounts-player-id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('mathcounts-player-id', id); }
  return id;
}

export default function RoomGame() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const roomId       = params.roomId as string;
  const isHost       = searchParams.get('host') === 'true';

  const [joined,      setJoined]      = useState(false);
  const [playerName,  setPlayerName]  = useState('');
  const [players,     setPlayers]     = useState<Players>({});
  const [scores,      setScores]      = useState<Scores>({});
  const [question,    setQuestion]    = useState<string | null>(null);
  const [revealAnswer,setRevealAnswer]= useState<string | null>(null);
  const [timeLeft,    setTimeLeft]    = useState(45);
  const [buzzedId,    setBuzzedId]    = useState<string | null>(null);
  const [myState,     setMyState]     = useState<'idle'|'buzzed'|'correct'|'wrong'>('idle');
  const [answerInput, setAnswerInput] = useState('');
  const [results,     setResults]     = useState<{name:string;correct:boolean;answer:string}[]>([]);
  const [loading,     setLoading]     = useState(false);

  const playerId   = useRef('');
  const channelRef = useRef<Channel | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<number | null>(null);

  const startTimer = useCallback((startedAt: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    startedRef.current = startedAt;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, 45 - Math.floor((Date.now() - startedAt) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current!);
        setRevealAnswer(a => a); // keep showing answer if already set
      }
    }, 500);
  }, []);

  async function gameAction(body: object) {
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId: playerId.current, ...body }),
    });
  }

  function joinRoom() {
    if (!playerName.trim()) return;
    playerId.current = getPlayerId();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });

    const ch = pusher.subscribe(`private-room-${roomId}`);
    channelRef.current = ch;

    ch.bind('player-joined', ({ players, scores }: { players: Players; scores: Scores }) => {
      setPlayers(players); setScores(scores);
    });

    ch.bind('new-problem', ({ question, startedAt, players, scores }: { question: string; startedAt: number; players: Players; scores: Scores }) => {
      setQuestion(question);
      setRevealAnswer(null);
      setResults([]);
      setMyState('idle');
      setBuzzedId(null);
      setAnswerInput('');
      setPlayers(players);
      setScores(scores);
      startTimer(startedAt);
    });

    ch.bind('buzzed', ({ playerId: bid, playerName }: { playerId: string; playerName: string }) => {
      setBuzzedId(bid);
      if (bid === playerId.current) setMyState('buzzed');
    });

    ch.bind('answer-result', ({ playerId: pid, playerName, correct, answer, scores, revealAnswer, allWrong }:
      { playerId: string; playerName: string; correct: boolean; answer: string; scores: Scores; revealAnswer: string | null; allWrong: boolean }) => {
      setScores(scores);
      setResults(r => [...r, { name: playerName, correct, answer }]);
      setBuzzedId(null);
      if (pid === playerId.current) setMyState(correct ? 'correct' : 'wrong');
      if (revealAnswer) { setRevealAnswer(revealAnswer); clearInterval(timerRef.current!); }
      if (allWrong) setRevealAnswer(revealAnswer);
    });

    ch.bind('pusher:subscription_succeeded', async () => {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId, playerId: playerId.current, playerName: playerName.trim() }),
      });
      const data = await res.json();
      setPlayers(data.players);
      setScores(data.scores);
      if (data.question) {
        setQuestion(data.question);
        if (data.startedAt) startTimer(data.startedAt);
      }
      setJoined(true);
    });
  }

  async function fetchAndSetProblem() {
    setLoading(true);
    try {
      const res = await fetch('/api/problem');
      const problem = await res.json();
      await gameAction({ action: 'set-problem', problem });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

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
            type="text" placeholder="Your name" value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 flex-1"
            autoFocus
          />
          <button onClick={joinRoom} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 rounded-lg">
            Join
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <a href="/" className="text-gray-500 hover:text-white text-sm">← Back</a>
        <h1 className="text-xl font-black text-yellow-400">Room: {roomId}</h1>
        <div className="w-16" />
      </div>

      {/* Scores */}
      <div className="flex gap-4 flex-wrap justify-center">
        {Object.entries(players).map(([id, name]) => (
          <div key={id} className={`text-center px-4 py-2 rounded-xl ${id === playerId.current ? 'bg-yellow-900/30 border border-yellow-400' : 'bg-gray-800'}`}>
            <div className="text-2xl font-black">{scores[id] ?? 0}</div>
            <div className="text-xs text-gray-400">{name}{id === playerId.current ? ' (you)' : ''}</div>
          </div>
        ))}
      </div>

      <Timer timeLeft={timeLeft} />

      {/* Problem */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl min-h-32 flex flex-col items-center justify-center text-center gap-3">
        {question
          ? <><p className="text-lg leading-relaxed">{question}</p>
              {revealAnswer && <div className="text-green-400 font-bold text-xl">Answer: {revealAnswer}</div>}</>
          : <p className="text-gray-500">{isHost ? 'Press "Start" to load a problem' : 'Waiting for host…'}</p>
        }
      </div>

      {results.length > 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {results.map((r, i) => (
            <div key={i} className={`text-sm px-3 py-1 rounded-full font-bold ${r.correct ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {r.name}: {r.correct ? '✓' : '✗'} {r.answer}
            </div>
          ))}
        </div>
      )}

      {isHost && (
        <button onClick={fetchAndSetProblem} disabled={loading}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 px-8 rounded-xl text-lg transition">
          {question ? 'Next Problem' : 'Start'}
        </button>
      )}

      {/* Buzzer */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => gameAction({ action: 'buzz' })}
          disabled={!question || myState !== 'idle' || !!revealAnswer}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-3xl py-8 rounded-2xl transition active:scale-95 w-full"
        >
          {buzzedId === playerId.current ? '🔔 BUZZED!' : 'BUZZ!'}
        </button>

        {myState === 'buzzed' && (
          <div className="flex gap-2">
            <input type="text" value={answerInput} onChange={e => setAnswerInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && gameAction({ action: 'answer', answer: answerInput })}
              placeholder="Your answer…"
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 flex-1" autoFocus />
            <button onClick={() => gameAction({ action: 'answer', answer: answerInput })}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-3 rounded-lg">✓</button>
          </div>
        )}
        {myState === 'correct' && <div className="text-green-400 text-center font-bold text-lg">✓ Correct!</div>}
        {myState === 'wrong'   && <div className="text-red-400   text-center font-bold text-lg">✗ Wrong</div>}
      </div>
    </main>
  );
}
