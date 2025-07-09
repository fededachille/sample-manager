/**
 * Database connection manager
 * - Establishes a MySQL connection using environment variables
 * - Automatically reconnects on connection loss
 * - Exports a function that returns the active connection
 */

require('dotenv').config(); // Load environment variables from .env file
const mysql = require('mysql2'); // MySQL client for Node.js

// Load database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

let db = null; // Holds the active database connection

// Handles database connection with automatic reconnection on failure
function handleDisconnect(retries = 0) {
  console.log("Trying to connect to DB... (" + retries + ")");

  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("DB connection error:", err.message);
      console.log("Retrying in 5 seconds...\n");
      setTimeout(() => handleDisconnect(retries + 1), 5000);
    } else {
      console.log("Connected to MySql DB.");
    }
  });

  db.on('error', function (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn("Connection to DB lost. Trying to reconnect...");
      handleDisconnect();
    }
  });

}

handleDisconnect(); // Initialize first connection to the database

module.exports = () => db;

