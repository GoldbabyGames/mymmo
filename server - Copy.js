// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const Server = require('colyseus').Server;
const { WebSocketTransport } = require('@colyseus/ws-transport');
const initializeGameSockets = require('./socket/gameSocket');
const ArenaRoom = require('./rooms/ArenaRoom');

const app = express();
const server = http.createServer(app);

// Initialize Colyseus BEFORE Socket.IO
console.log('About to create Colyseus server...');
const gameServer = new Server({
    transport: new WebSocketTransport({
        server: server,
        path: "/colyseus"
    })
});
console.log('Colyseus server created');

// Define arena room handling
gameServer.define("arena_room", ArenaRoom)
    .on("create", (room) => console.log("Arena room created:", room.roomId))
    .on("dispose", (room) => console.log("Arena room disposed:", room.roomId))
    .on("join", (room, client) => console.log("Client joined arena:", client.sessionId))
    .on("leave", (room, client) => console.log("Client left arena:", client.sessionId));

// Socket.IO setup for base building only
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple session middleware
const sessionMiddleware = session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/rpg_game',
    }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
});

app.use(sessionMiddleware);

// Basic session check middleware
app.use((req, res, next) => {
    if (!req.session.playerId) {
        req.session.playerId = new mongoose.Types.ObjectId().toString();
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Initialize base building socket handlers only
initializeGameSockets(io);

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/rpg_game', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Colyseus server listening on ws://localhost:${PORT}/colyseus`);
});