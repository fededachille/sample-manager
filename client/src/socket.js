import { io } from 'socket.io-client';

/**
 * Initialize socket.io client connection
 * - Connects to the backend WebSocket server at localhost:5000
 * - Sends cookies (for session auth) using `withCredentials: true`
 */

const serverUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const socket = io(serverUrl, {
    credentials: true,
});

socket.on('connect', () => {
    console.log('Socket connesso:', socket.id);
    console.log('URL server:', serverUrl);
});

socket.on('disconnect', () => {
    console.log('Socket disconnesso');
});

socket.on('connect_error', (error) => {
    console.log('Errore connessione:', error);
});

export default socket;