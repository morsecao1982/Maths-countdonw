import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusherServer';

interface RoomState {
  problem: { question: string; answer: string } | null;
  startedAt: number | null;
  scores: Record<string, number>;
  players: Record<string, string>;
  answered: string[];
}

const rooms: Map<string, RoomState> =
  (globalThis as any).__rooms ?? ((globalThis as any).__rooms = new Map());

function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { problem: null, startedAt: null, scores: {}, players: {}, answered: [] });
  }
  return rooms.get(roomId)!;
}

export async function POST(req: NextRequest) {
  const { action, roomId, playerId, playerName, problem, answer } = await req.json();
  const room = getRoom(roomId);
  const channel = `private-room-${roomId}`;

  switch (action) {
    case 'join': {
      room.players[playerId] = playerName;
      if (room.scores[playerId] === undefined) room.scores[playerId] = 0;
      await pusherServer.trigger(channel, 'player-joined', {
        players: room.players,
        scores: room.scores,
      });
      return NextResponse.json({
        ok: true,
        question: room.problem?.question ?? null,
        startedAt: room.startedAt,
        players: room.players,
        scores: room.scores,
      });
    }

    case 'set-problem': {
      room.problem = problem;
      room.startedAt = Date.now();
      room.answered = [];
      await pusherServer.trigger(channel, 'new-problem', {
        question: problem.question,
        startedAt: room.startedAt,
        players: room.players,
        scores: room.scores,
      });
      return NextResponse.json({ ok: true });
    }

    case 'buzz': {
      if (room.answered.includes(playerId)) return NextResponse.json({ ok: false });
      await pusherServer.trigger(channel, 'buzzed', {
        playerId,
        playerName: room.players[playerId],
      });
      return NextResponse.json({ ok: true });
    }

    case 'answer': {
      if (!room.problem || room.answered.includes(playerId))
        return NextResponse.json({ ok: false });

      room.answered.push(playerId);
      const correct =
        answer.trim().toLowerCase() === room.problem.answer.trim().toLowerCase();

      if (correct) room.scores[playerId] = (room.scores[playerId] || 0) + 1;

      const allAnswered = Object.keys(room.players).every(id => room.answered.includes(id));
      const reveal = correct || allAnswered ? room.problem.answer : null;

      await pusherServer.trigger(channel, 'answer-result', {
        playerId,
        playerName: room.players[playerId],
        correct,
        answer,
        scores: room.scores,
        revealAnswer: reveal,
        allWrong: allAnswered && !correct,
      });
      return NextResponse.json({ ok: true, correct });
    }

    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' });
  }
}
