/**
 * Shelves API routes
 * - Provides endpoint to retrieve all shelves (scaffali)
 */

const express = require('express');
const router = express.Router();
const getDb = require('../db');

// GET /shelves
// Retrieve all shelf data from the database
router.get('/shelves', (req, res) => {
    const db = getDb();

    db.query('SELECT * FROM scaffali', (err, results) => {
        if (err) {
            console.error('Errore nel recupero scaffali:', err);
            return res.status(500).json({ message: 'Errore nel recupero scaffali.' });
        }

        res.json(results);
    });
});

module.exports = router;