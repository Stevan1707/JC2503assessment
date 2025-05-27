const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

io.use((socket, next) => {
  console.log(`[SERVER] New connection: ${socket.id}`);
  next();
});

let online_users = {};
let games = {};
let questions = [
  { flag: 'USA', correct: 'USA', options: ['USA', 'Canada', 'Mexico'] },
  { flag: 'UK', correct: 'UK', options: ['UK', 'Australia', 'New Zealand'] },
  { flag: 'Poland', correct: 'Poland', options: ['Poland', 'Czech Republic', 'Slovakia'] },
  { flag: 'France', correct: 'France', options: ['France', 'Italy', 'Spain'] },
  { flag: 'Russia', correct: 'Russia', options: ['Russia', 'China', 'Japan'] }
];

// Shuffle array function
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

io.on('connection', (socket) => {
  socket.on('join', (username) => {
    if (!username) {
      console.error(`[JOIN] Invalid username for socket ${socket.id}`);
      socket.emit('error', { message: 'Invalid username' });
      return;
    }
    if (Object.values(online_users).includes(username)) {
      socket.emit('error', { message: 'Username already taken' });
      return;
    }
    console.log(`[JOIN] ${socket.id} -> ${username}`);
    online_users[socket.id] = username;
    broadcastUsers();
  });

  socket.on('refresh_users', () => {
    broadcastUsers();
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id}`);
    cleanupUser(socket.id);
  });

  socket.on('disconnect_manually', () => {
    console.log(`[MANUAL DISCONNECT] ${socket.id}`);
    cleanupUser(socket.id);
  });

  socket.on('challenge', ({ from, to }) => {
    console.log(`[CHALLENGE] ${from} -> ${to}`);
    const target = findUserSocket(to);
    if (target) {
      if (isUserInGame(to)) {
        socket.emit('error', { message: `${to} is already in a game` });
      } else {
        io.to(target).emit('challenge_request', { from });
      }
    } else {
      console.error(`[CHALLENGE] Target user ${to} not found`);
      socket.emit('error', { message: `User ${to} is not online` });
    }
  });

  socket.on('challenge_reject', ({ from, to }) => {
    console.log(`[REJECT] ${to} rejected ${from}'s challenge`);
    const from_socket = findUserSocket(from);
    if (from_socket) {
      io.to(from_socket).emit('challenge_reject', { from: to });
    }
  });

  socket.on('challenge_accept', ({ from, to }) => {
    console.log(`[ACCEPT] ${to} accepted ${from}'s challenge`);
    const from_socket = findUserSocket(from);
    const to_socket = findUserSocket(to);
    
    if (from_socket && to_socket) {
      const room_id = `room_${from}_${to}`;
      games[room_id] = {
        players: [from, to],
        scores: { [from]: 0, [to]: 0 },
        current_question: 0,
        current_options: [] // Store shuffled options
      };
      io.to(from_socket).socketsJoin(room_id);
      io.to(to_socket).socketsJoin(room_id);
      io.to(from_socket).emit('game_start', { room_id, opponent: to });
      io.to(to_socket).emit('game_start', { room_id, opponent: from });
      sendQuestion(room_id);
      broadcastUsers();
    } else {
      console.error(`[ACCEPT] One or both users not found: ${from}, ${to}`);
      socket.emit('error', { message: 'Cannot start game: user(s) not found' });
    }
  });

  socket.on('answer', ({ room_id, option }) => {
    const game = games[room_id];
    if (!game || game.current_question >= 5) return;

    const username = online_users[socket.id];
    const opponent = game.players.find(p => p !== username);
    const question = questions[game.current_question];
    const is_correct = game.current_options[option] === question.correct;

    console.log(`[ANSWER] ${username} selected option ${option} (${game.current_options[option]}), correct: ${question.correct}, is_correct: ${is_correct}`);

    if (is_correct) {
      game.scores[username] += 2;
    } else {
      game.scores[opponent] += 1;
    }

    const player_socket = socket.id;
    const opponent_socket = findUserSocket(opponent);

    io.to(player_socket).emit('answer_result', {
      player: username,
      player_score: game.scores[username],
      opponent_score: game.scores[opponent],
      is_correct,
      answered: username
    });
    io.to(opponent_socket).emit('answer_result', {
      player: username,
      player_score: game.scores[username],
      opponent_score: game.scores[opponent],
      is_correct,
      answered: username
    });

    game.current_question++;
    if (game.current_question < 5) {
      sendQuestion(room_id);
    } else {
      io.to(player_socket).emit('game_end', {
        player_score: game.scores[username],
        opponent_score: game.scores[opponent],
        opponent
      });
      io.to(opponent_socket).emit('game_end', {
        player_score: game.scores[opponent],
        opponent_score: game.scores[username],
        opponent: username
      });
      delete games[room_id];
      broadcastUsers();
    }
  });
});

function sendQuestion(room_id) {
  const game = games[room_id];
  if (!game || game.current_question >= 5) return;

  const question = questions[game.current_question];
  const shuffled_options = shuffle([...question.options]);
  game.current_options = shuffled_options; // Store shuffled options
  const [player1, player2] = game.players;

  io.to(findUserSocket(player1)).emit('question', {
    question: 'To which country does this flag belong?',
    flag: question.flag,
    options: shuffled_options,
    player_score: game.scores[player1],
    opponent_score: game.scores[player2]
  });
  io.to(findUserSocket(player2)).emit('question', {
    question: 'To which country does this flag belong?',
    flag: question.flag,
    options: shuffled_options,
    player_score: game.scores[player2],
    opponent_score: game.scores[player1]
  });
}

function broadcastUsers() {
  const in_game = Object.values(games).flatMap(g => g.players);
  io.emit('update_users', { users: Object.values(online_users), in_game });
}

function cleanupUser(socket_id) {
  if (online_users[socket_id]) {
    const username = online_users[socket_id];
    delete online_users[socket_id];
    for (const room_id in games) {
      if (games[room_id].players.includes(username)) {
        io.to(room_id).emit('error', { message: 'Opponent disconnected' });
        delete games[room_id];
      }
    }
    broadcastUsers();
    console.log(`[CLEANUP] Removed ${username}. Remaining users: ${JSON.stringify(online_users)}`);
  }
}

function findUserSocket(username) {
  return Object.entries(online_users).find(([id, name]) => name === username)?.[0];
}

function isUserInGame(username) {
  return Object.values(games).some(g => g.players.includes(username));
}

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});