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

app.use(express.static('public'));

const onlineUsers = new Map();

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        if (Array.from(onlineUsers.values()).includes(username)) {
            socket.emit('error', 'Username taken!');
            return;
        }
        onlineUsers.set(socket.id, username);
        io.emit('update-users', Array.from(onlineUsers.values()));
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(socket.id);
        io.emit('update-users', Array.from(onlineUsers.values()));
    });

    socket.on('disconnect-manually', () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            io.emit('update-users', Array.from(onlineUsers.values()));
        }
    });

    socket.on('challenge', ({ from, to }) => {
        // 查找目标用户的 socket.id
        const targetSocketId = Array.from(onlineUsers.entries())
            .find(([id, username]) => username === to)?.[0];

        if (targetSocketId) {
            // 向目标用户发送挑战请求
            io.to(targetSocketId).emit('challenge-request', { from });
        } else {
            // 通知发起者目标用户不存在
            socket.emit('error', 'Player not found!');
        }
    });

    socket.on('challenge-accept', ({ from, to }) => {
        // 查找双方 socket.id
        const fromSocketId = Array.from(onlineUsers.entries())
            .find(([id, username]) => username === from)?.[0];
        const toSocketId = Array.from(onlineUsers.entries())
            .find(([id, username]) => username === to)?.[0];

        if (fromSocketId && toSocketId) {
            // 创建房间（例如用双方用户名生成唯一房间ID）
            const roomId = `room_${from}_${to}`;
            // 将双方加入房间
            io.to(fromSocketId).socketsJoin(roomId);
            io.to(toSocketId).socketsJoin(roomId);
            // 通知房间内的玩家游戏开始
            io.to(roomId).emit('game-start', { roomId });
        }
        });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});