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

// First, create a separate session store for test sessions
const mainSessionStore = MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/rpg_game',
    collectionName: 'sessions'
});

const testSessionStore = new Map(); // In-memory store for test sessions

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


// Single source of truth for session configuration
const sessionConfig = {
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/rpg_game',
        collectionName: 'sessions'
    }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: 'strict'
    },
    name: 'gameSession'
};


// Create the main session middleware
const mainSessionMiddleware = session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: true,
    store: mainSessionStore,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
});

// Create combined session middleware that handles both regular and test sessions
// Update session middleware to be more explicit
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

// Clear session middleware - simplified and more explicit
app.use((req, res, next) => {
    // Log incoming request details
    console.log('\nSession Diagnostic -----------------');
    console.log('Request URL:', req.url);
    console.log('Current session ID:', req.sessionID);
    console.log('Test session param:', req.query.testSession);
    console.log('Current player ID:', req.session?.playerId);
    console.log('Is test session:', req.session?.isTestSession);
    console.log('Cookies:', req.headers.cookie);
    console.log('-----------------------------------');

    const testSession = req.query.testSession;
    
    if (testSession) {
        // For test sessions, use a completely separate session configuration
        const testConfig = {
            secret: 'dev-secret-key',
            resave: false,
            saveUninitialized: true,
            store: new session.MemoryStore(), // Memory-only store for test sessions
            cookie: {
                maxAge: null,        // Session cookie only - dies when browser closes
                expires: false,      // Ensure cookie doesn't persist
                path: '/',
                httpOnly: true,
                name: `test_${testSession}` // Unique name per test session
            }
        };
        
        // Important: Clear any existing game session cookie
        res.clearCookie('gameSession', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });  // Clear default session cookie if it exists
        
        session(testConfig)(req, res, (err) => {
            if (err) {
                console.error('Test session error:', err);
                return next(err);
            }

            // Generate new test session data
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Error regenerating test session:', err);
                    return next(err);
                }
                
                req.session.playerId = new mongoose.Types.ObjectId().toString();
                req.session.isTestSession = testSession;
                
                console.log('Created new test session:', {
                    playerId: req.session.playerId,
                    testSession,
                    sessionID: req.sessionID
                });
                
                next();
            });
        });
    } else {
        // Use existing session middleware for main sessions
        next();
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update Socket.IO middleware
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, () => {
        const testSession = socket.handshake.query.testSession;
        
        // For test sessions, always ensure we have the right session data
        if (testSession) {
            if (!socket.request.session.isTestSession) {
                socket.request.session.playerId = new mongoose.Types.ObjectId().toString();
                socket.request.session.isTestSession = testSession;
                socket.request.session.save();
            }
        } else {
            // For main sessions, ensure we don't have test session data
            socket.request.session.isTestSession = null;
            socket.request.session.save();
        }
        
        next();
    });
});

// Add cleanup route - access this once to reset everything
// Add cleanup endpoint for test sessions
app.get('/cleanup-test-session', (req, res) => {
    const testSession = req.query.testSession;
    if (testSession) {
        // Clear the specific test session cookie
        res.clearCookie(`test_${testSession}`, { 
            path: '/',
            httpOnly: true
        });
        
        // Also clear any potential main session cookies
        res.clearCookie('gameSession', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        
        console.log('Cleaned up test session:', testSession);
    }
    res.sendStatus(200);
});

// Clean up test sessions
io.on('connection', (socket) => {
    const testSession = socket.handshake.query.testSession;
    
    if (testSession) {
        socket.on('disconnect', () => {
            const testSessionId = `test_${testSession}_${socket.request.session.playerId}`;
            testSessionStore.delete(testSessionId);
            console.log('Cleaned up test session:', testSessionId);
        });
    }
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