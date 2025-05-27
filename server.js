const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 调试中间件：记录所有连接
io.use((socket, next) => {
  console.log(`[SERVER] New connection: ${socket.id}`);
  next();
});

let online_users = {};

io.on('connection', (socket) => {
  // 加入事件
  socket.on('join', (username) => {
    if (!username) {
      console.error(`[JOIN] Invalid username for socket ${socket.id}`);
      return;
    }
    console.log(`[JOIN] ${socket.id} -> ${username}`);
    online_users[socket.id] = username;
    io.emit('update_users', Object.values(online_users));
  });

  // 断开连接（自动）
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id}`);
    cleanupUser(socket.id);
  });

  // 断开连接（手动）
  socket.on('disconnect_manually', () => {
    console.log(`[MANUAL DISCONNECT] ${socket.id}`);
    cleanupUser(socket.id);
  });

  // 挑战系统
  socket.on('challenge', ({ from, to }) => {
    console.log(`[CHALLENGE] ${from} -> ${to}`);
    const target = findUserSocket(to);
    if (target) {
      io.to(target).emit('challenge_request', { from });
    } else {
      console.error(`[CHALLENGE] Target user ${to} not found`);
      io.to(socket.id).emit('error', { message: `User ${to} is not online` });
    }
  });

  socket.on('challenge_accept', ({ from, to }) => {
    console.log(`[ACCEPT] ${from} accepted ${to}'s challenge`);
    const fromSocket = findUserSocket(from);
    const toSocket = findUserSocket(to);
    
    if (fromSocket && toSocket) {
      const room_id = `room_${from}_${to}`;
      io.to(fromSocket).socketsJoin(room_id);
      io.to(toSocket).socketsJoin(room_id);
      io.to(room_id).emit('game_start', { room_id });
    } else {
      console.error(`[ACCEPT] One or both users not found: ${from}, ${to}`);
      io.to(socket.id).emit('error', { message: 'Cannot start game: user(s) not found' });
    }
  });
});

// 工具函数
function cleanupUser(socketId) {
  if (online_users[socketId]) {
    const username = online_users[socketId];
    delete online_users[socketId];
    io.emit('update_users', Object.values(online_users));
    console.log(`[CLEANUP] Removed ${username}. Remaining users: ${JSON.stringify(online_users)}`);
  }
}

function findUserSocket(username) {
  return Object.entries(online_users)
    .find(([id, name]) => name === username)?.[0];
}

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});