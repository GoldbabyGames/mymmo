// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const initializeGameSockets = require('./socket/gameSocket');

const app = express();
const server = http.createServer(app);

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
        // Fix: Use new keyword when creating ObjectId
        req.session.playerId = new mongoose.Types.ObjectId().toString();
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Initialize game socket handlers
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
});