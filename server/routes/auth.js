/**
 * Auth routes
 * - Handles session check, login and logout
 * - Uses bcrypt for password validation
 * - Stores authenticated user info in session
 */

// Import Express, password hasher, and DB connection getter
const express = require('express');
const bcrypt = require('bcrypt');
const getDb = require('../db');

const router = express.Router(); // Create an instance of the Express router

// GET /check-session
// Returns session status and user info if logged in
router.get('/check-session', (req, res) => {
    const db = getDb();

    if (!req.session.user || !req.session.user.id) {
        return res.json({ loggedIn: false });
    }

    const userId = req.session.user.id;

    db.query('SELECT id_utente, nome, autorizzazioni FROM utenti WHERE id_utente = ?', [userId], (err, results) => {
        if (err) {
            console.error('Errore durante check-session:', err);
            return res.status(500).json({ loggedIn: false });
        }

        if (results.length === 0) {
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                return res.json({ loggedIn: false });
            });
        } else {
            const user = results[0];
            req.session.user = {
                id: user.id_utente,
                nome: user.nome,
                autorizzazioni: user.autorizzazioni
            };
            return res.json({
                loggedIn: true,
                user: req.session.user
            });
        }
    });
});


// POST /login
// Authenticates a user and creates a session
router.post('/login', (req, res) => {
    const db = getDb();
    const { nome, password } = req.body;

    if (!nome || !password) {
        return res.status(400).json({ message: 'Nome e password richiesti.' });
    }

    db.query('SELECT * FROM utenti WHERE nome = ?', [nome], (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error.' });
        if (results.length === 0) return res.status(401).json({ message: 'Utente non trovato.' });

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Password comparison failed.' });
            if (!isMatch) return res.status(401).json({ message: 'Password errata.' });

            req.session.user = {
                id: user.id_utente,
                nome: user.nome,
                autorizzazioni: user.autorizzazioni
            };

            res.json({ message: 'Login riuscito.', user: req.session.user });
        });
    });
});

// POST /logout
// Destroys the user session and clears cookie
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout effettuato.' });
    });
});

module.exports = router;