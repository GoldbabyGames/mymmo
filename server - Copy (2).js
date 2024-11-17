// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { Server: ColyseusServer } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const arenaApp = express();
const { monitor } = require('@colyseus/monitor');

const initializeGameSockets = require('./socket/gameSocket');
const ArenaRoom = require('./rooms/ArenaRoom');

// Create Express app and main server
const app = express();
const mainServer = http.createServer(app);

// Create separate server for Colyseus
const arenaServer = http.createServer();
arenaServer.on('request', arenaApp);

// Initialize Colyseus
const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({
        server: arenaServer
    })
});

// Define arena room
gameServer.define("arena_room", ArenaRoom)
    .on("create", (room) => console.log("Arena room created:", room.roomId))
    .on("dispose", (room) => console.log("Arena room disposed:", room.roomId));

arenaApp.use("/colyseus", monitor());

// Initialize Socket.IO for base game
const io = socketIo(mainServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/rpg_game',
    }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
});

app.use(sessionMiddleware);

// Session check middleware with test session support
app.use((req, res, next) => {
    // For test sessions, always generate a new playerId
    if (req.query.testSession) {
        req.session.playerId = new mongoose.Types.ObjectId().toString();
        console.log(`New test player created: ${req.session.playerId}, test session: ${req.query.testSession}`);
    }
    // For normal sessions, keep existing behavior
    else if (!req.session.playerId) {
        req.session.playerId = new mongoose.Types.ObjectId().toString();
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Initialize game sockets
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

// Start both servers
const MAIN_PORT = 3000;
const ARENA_PORT = 2567;

mainServer.listen(MAIN_PORT, () => {
    console.log(`Main game server running on http://localhost:${MAIN_PORT}`);
});

arenaServer.listen(ARENA_PORT, () => {
    console.log(`Colyseus arena server running on ws://localhost:${ARENA_PORT}`);
    console.log(`Colyseus monitor available at http://localhost:${ARENA_PORT}/colyseus`);
});