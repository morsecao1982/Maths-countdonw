import { pusherServer } from '@/lib/pusherServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id')!;
  const channel = params.get('channel_name')!;
  const auth = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(auth);
}
