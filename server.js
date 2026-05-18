const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory room state
const rooms = new Map();

function createRoom() {
  return {
    problem: null,
    timerEnd: null,
    timerInterval: null,
    players: {},      // socketId -> { name, score }
    buzzed: {},       // socketId -> answer | null
    answered: new Set(),
  };
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('join-room', ({ roomId, playerName }) => {
      const room = rooms.get(roomId) || createRoom();
      rooms.set(roomId, room);
      currentRoom = roomId;

      room.players[socket.id] = { name: playerName, score: 0 };
      socket.join(roomId);

      // Send current state to new player
      socket.emit('room-state', {
        problem: room.problem,
        players: room.players,
        buzzed: room.buzzed,
        answered: [...room.answered],
        timeLeft: room.timerEnd ? Math.max(0, Math.ceil((room.timerEnd - Date.now()) / 1000)) : 45,
      });

      io.to(roomId).emit('players-updated', room.players);
    });

    socket.on('set-problem', ({ roomId, problem }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.problem = problem;
      room.buzzed = {};
      room.answered = new Set();
      clearInterval(room.timerInterval);
      room.timerEnd = Date.now() + 45000;

      io.to(roomId).emit('new-problem', { problem, timeLeft: 45 });

      room.timerInterval = setInterval(() => {
        const timeLeft = Math.max(0, Math.ceil((room.timerEnd - Date.now()) / 1000));
        io.to(roomId).emit('timer-tick', { timeLeft });
        if (timeLeft <= 0) {
          clearInterval(room.timerInterval);
          io.to(roomId).emit('time-up');
        }
      }, 1000);
    });

    socket.on('buzz', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.answered.has(socket.id)) return;
      room.buzzed[socket.id] = null;
      io.to(roomId).emit('player-buzzed', { socketId: socket.id, playerName: room.players[socket.id]?.name });
    });

    socket.on('submit-answer', ({ roomId, answer }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.buzzed[socket.id] = answer;
      room.answered.add(socket.id);

      const correct = answer.trim().toLowerCase() === room.problem?.answer?.trim().toLowerCase();

      if (correct) {
        room.players[socket.id].score += 1;
        clearInterval(room.timerInterval);
        io.to(roomId).emit('answer-result', {
          socketId: socket.id,
          playerName: room.players[socket.id]?.name,
          correct: true,
          answer,
          players: room.players,
        });
      } else {
        io.to(roomId).emit('answer-result', {
          socketId: socket.id,
          playerName: room.players[socket.id]?.name,
          correct: false,
          answer,
          players: room.players,
        });

        const playerIds = Object.keys(room.players);
        const allAnswered = playerIds.every(id => room.answered.has(id));
        if (allAnswered) {
          clearInterval(room.timerInterval);
          io.to(roomId).emit('all-wrong');
        }
      }
    });

    socket.on('disconnect', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      delete room.players[socket.id];
      io.to(currentRoom).emit('players-updated', room.players);
      if (Object.keys(room.players).length === 0) {
        clearInterval(room.timerInterval);
        rooms.delete(currentRoom);
      }
    });
  });

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
