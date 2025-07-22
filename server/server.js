/**
 * Main server file
 * - Sets up Express app and session management
 * - Initializes WebSocket server (Socket.IO)
 * - Configures routes and static file serving
 * - Starts HTTP server on port 5000
 */

require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const app = express();

const session = require('express-session'); // Session middleware for user login persistence

// MySQL database connection
const db = require('./db');

const bcrypt = require('bcrypt'); // Password hashing utility
const multer = require('multer'); // Middleware for handling multipart/form-data (file uploads)
// Core Node.js modules for path and file system operations
const path = require('path');
const fs = require('fs');

// HTTP and WebSocket setup
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app); // Create HTTP server for Express app

// Initialize Socket.IO server with CORS for frontend at localhost:3000
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_ORIGIN, "http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

global.io = io;

const userSockets = new Map(); // Maps user IDs to their corresponding socket connections

// Handles new WebSocket connections and disconnections
io.on('connection', (socket) => {
  const origin = socket.handshake.headers.origin;
  console.log(`Client connesso da: ${origin} (ID: ${socket.id})`);

  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`Utente ${userId} registrato al socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnesso:', socket.id);
    for (const [uid, sid] of userSockets.entries()) {
      if (sid === socket.id) {
        userSockets.delete(uid);
        break;
      }
    }
  });
});

app.use('/images', express.static(__dirname + '/images')); // Serve image files from the /images folder
app.use(express.json()); // Parse incoming JSON request bodies

// Setup session management using cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2 // 2 hours session
  }
}));

// Configure file storage for uploaded images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const codice = req.body.codice || 'sample';
    const timestamp = Date.now();
    cb(null, `${codice}_${timestamp}${ext}`);
  }
});

const upload = multer({ storage }); // Initialize multer with custom disk storage

// Import route modules
const sampleRoutes = require('./routes/samples')(io);
const sizeRoutes = require('./routes/sample-sizes')(io);
const shippingRoutes = require('./routes/shipping')(io);
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users')(io, userSockets);
const shelfRoutes = require('./routes/shelves');

// Mount all route modules under the /api path
app.use('/api', sampleRoutes);
app.use('/api', sizeRoutes);
app.use('/api', shippingRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', shelfRoutes);

// Start the backend server on port 5000
server.listen(5000, '0.0.0.0', () => {
  console.log("Server started on port 5000.");
});
