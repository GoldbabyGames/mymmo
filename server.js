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

// Create Express app and servers
const app = express();
const mainServer = http.createServer(app);
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

// Initialize Socket.IO with CORS
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

// In-memory store for test sessions
const testSessionStore = new Map();

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

// Session handling middleware
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
        // Test session configuration
        const testConfig = {
            secret: 'dev-secret-key',
            resave: false,
            saveUninitialized: true,
            store: new session.MemoryStore(),
            cookie: {
                maxAge: null,
                expires: false,
                path: '/',
                httpOnly: true,
                name: `test_${testSession}`
            }
        };
        
        // Clear existing cookies
        res.clearCookie('gameSession', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        
        session(testConfig)(req, res, (err) => {
            if (err) {
                console.error('Test session error:', err);
                return next(err);
            }

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
        // Main session handling
        session(sessionConfig)(req, res, (err) => {
            if (err) {
                console.error('Main session error:', err);
                return next(err);
            }

            if (!req.session.playerId) {
                req.session.playerId = new mongoose.Types.ObjectId().toString();
                req.session.isTestSession = null;
                console.log('Created new main session:', {
                    playerId: req.session.playerId,
                    sessionID: req.sessionID
                });
            }
            
            next();
        });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cleanup-test-session', (req, res) => {
    const testSession = req.query.testSession;
    if (testSession) {
        res.clearCookie(`test_${testSession}`, { 
            path: '/',
            httpOnly: true
        });
        res.clearCookie('gameSession', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        
        console.log('Cleaned up test session:', testSession);
    }
    res.sendStatus(200);
});

app.get('/reset', (req, res) => {
    console.log('Resetting current session...');
    
    // Clear all common session cookies
    res.clearCookie('gameSession', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    
    // Destroy the current session
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
        });
    }

    // Redirect back to home page
    res.redirect('/');
});



// Socket.IO session handling
io.use((socket, next) => {
    session(sessionConfig)(socket.request, {}, () => {
        const testSession = socket.handshake.query.testSession;
        
        if (testSession) {
            if (!socket.request.session.isTestSession) {
                socket.request.session.playerId = new mongoose.Types.ObjectId().toString();
                socket.request.session.isTestSession = testSession;
                socket.request.session.save();
            }
        } else {
            socket.request.session.isTestSession = null;
            socket.request.session.save();
        }
        
        next();
    });
});

// Socket connection handling
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

// Start servers
const MAIN_PORT = 3000;
const ARENA_PORT = 2567;

mainServer.listen(MAIN_PORT, () => {
    console.log(`Main game server running on http://localhost:${MAIN_PORT}`);
});

arenaServer.listen(ARENA_PORT, () => {
    console.log(`Colyseus arena server running on ws://localhost:${ARENA_PORT}`);
    console.log(`Colyseus monitor available at http://localhost:${ARENA_PORT}/colyseus`);
});