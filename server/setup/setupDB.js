// Setup script to create database, insert initial shelves and the first admin user into the system.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  multipleStatements: true
};

const dbConfigWithDatabase = {
  ...dbConfig,
  database: 'sample_manager_db'
};

const scaffali = [
  { id: 'S1', sezioni: 12, ripiani: 4 },
  { id: 'S2', sezioni: 10, ripiani: 4 },
  { id: 'S3', sezioni: 10, ripiani: 3 },
  { id: 'S4', sezioni: 8, ripiani: 4 }
];

let db;

// Create database and tables from SQL file
function setupDatabase(callback) {
  console.log('Creating database connection...');

  // First connection without database to create the database
  const initialConnection = mysql.createConnection(dbConfig);

  initialConnection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return callback(err);
    }

    console.log('Connected to MySQL server.');

    // Create database if it doesn't exist
    initialConnection.query('CREATE DATABASE IF NOT EXISTS sample_manager_db', (err) => {
      if (err) {
        console.error('Error creating database:', err);
        initialConnection.end();
        return callback(err);
      }

      console.log('Database created or already exists.');
      initialConnection.end();

      // Now connect to the specific database
      db = mysql.createConnection(dbConfigWithDatabase);

      db.connect((err) => {
        if (err) {
          console.error('Error connecting to sample_manager_db:', err);
          return callback(err);
        }

        console.log('Connected to sample_manager_db.');

        // Read and execute SQL file
        const sqlFilePath = path.join(__dirname, 'sample_manager_db.sql');

        if (!fs.existsSync(sqlFilePath)) {
          console.error('SQL file not found:', sqlFilePath);
          return callback(new Error('SQL file not found'));
        }

        fs.readFile(sqlFilePath, 'utf8', (err, sqlContent) => {
          if (err) {
            console.error('Error reading SQL file:', err);
            return callback(err);
          }

          // Execute the entire SQL content
          db.query(sqlContent, (err) => {
            if (err) {
              console.error('Error executing SQL file:', err);
              return callback(err);
            }

            console.log('Database tables created successfully.');
            callback();
          });
        });
      });
    });
  });
}

// Insert shelves
function setupScaffali(callback) {
  db.query('SELECT COUNT(*) AS count FROM scaffali', (err, result) => {
    if (err) {
      console.error('Error checking shelves:', err);
      return callback(err);
    }

    if (result[0].count > 0) {
      console.log('Shelves already exist.');
      return callback();
    }

    const values = scaffali.map(s => [s.id, s.sezioni, s.ripiani]);
    db.query(
      'INSERT INTO scaffali (id_scaffale, numero_sezioni, numero_ripiani) VALUES ?',
      [values],
      (err) => {
        if (err) {
          console.error('Error inserting shelves:', err);
          return callback(err);
        }
        console.log('Shelves inserted successfully.');
        callback();
      }
    );
  });
}

// Insert admin user
function setupAdmin(callback) {
  db.query('SELECT COUNT(*) AS count FROM utenti', (err, result) => {
    if (err) {
      console.error('Error checking users:', err);
      return callback(err);
    }

    if (result[0].count > 0) {
      console.log('Users already exist.');
      return callback();
    }

    const nome = 'admin';
    const password = 'admin';
    const autorizzazioni = 'admin';

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return callback(err);
      }

      db.query(
        'INSERT INTO utenti (nome, password, autorizzazioni) VALUES (?, ?, ?)',
        [nome, hash, autorizzazioni],
        (err) => {
          if (err) {
            console.error('Error inserting admin user:', err);
            return callback(err);
          }
          console.log('Admin user inserted successfully.');
          callback();
        }
      );
    });
  });
}

// Cleanup function
function cleanup() {
  if (db) {
    db.end((err) => {
      if (err) {
        console.error('Error closing database connection:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Run setup steps in sequence
console.log('Starting database setup...');

setupDatabase((err) => {
  if (err) {
    console.error('Database setup failed:', err);
    cleanup();
    process.exit(1);
  }

  setupScaffali((err) => {
    if (err) {
      console.error('Shelves setup failed:', err);
      cleanup();
      process.exit(1);
    }

    setupAdmin((err) => {
      if (err) {
        console.error('Admin setup failed:', err);
        cleanup();
        process.exit(1);
      }

      console.log('Complete setup finished successfully!');
      cleanup();
      process.exit(0);
    });
  });
});