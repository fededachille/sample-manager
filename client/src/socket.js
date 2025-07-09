import { io } from 'socket.io-client';

/**
 * Initialize socket.io client connection
 * - Connects to the backend WebSocket server at localhost:5000
 * - Sends cookies (for session auth) using `withCredentials: true`
 */

const socket = io('http://localhost:5000', {
    withCredentials: true
});

export default socket;