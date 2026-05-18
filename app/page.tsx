'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-yellow-400">MATHCOUNTS</h1>
        <p className="text-gray-400 mt-2 text-lg">Buzzer Battle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Same Device */}
        <button
          onClick={() => router.push('/game/local')}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-8 text-left transition group"
        >
          <div className="text-4xl mb-3">🖥️</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-yellow-400 transition">Same Device</h2>
          <p className="text-gray-400 text-sm">Two players on one screen. Buzzers side by side.</p>
        </button>

        {/* Different Devices */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 flex flex-col gap-4">
          <div className="text-4xl">📱</div>
          <h2 className="text-xl font-bold">Different Devices</h2>
          <p className="text-gray-400 text-sm">Create a room and share the code with your opponent.</p>
          <button
            onClick={() => {
              const id = generateRoomId();
              router.push(`/game/room/${id}?host=true`);
            }}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-4 rounded-lg transition"
          >
            Create Room
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Room code"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 uppercase tracking-widest"
              maxLength={5}
            />
            <button
              onClick={() => roomId.length === 5 && router.push(`/game/room/${roomId}`)}
              className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-lg transition text-sm"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
