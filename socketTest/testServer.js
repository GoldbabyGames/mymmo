// socketTest/testServer.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize express and http server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from test directory
app.use(express.static(path.join(__dirname, 'test-public')));

// Force serving our test HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-public', 'test.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Use a different port
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
});