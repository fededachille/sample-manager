/**
 * User API routes
 * - Provides endpoints to manage users (CRUD, password, role)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const getDb = require('../db');

module.exports = (io, userSockets) => {
    const router = express.Router();

    // POST /users
    // Add a new user with default password "azira"
    router.post('/users', (req, res) => {
        const db = getDb();
        const rawNome = req.body.nome || '';
        const nome = rawNome.trim();
        const { autorizzazioni } = req.body;

        if (!nome) {
            return res.status(400).json({ message: 'Il campo nome è obbligatorio.' });
        }

        db.query('SELECT * FROM utenti WHERE nome = ?', [nome], (err, results) => {
            if (err) {
                console.error('Errore controllo duplicati:', err);
                return res.status(500).json({ message: 'Errore durante il controllo degli utenti esistenti.' });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'Esiste già un utente con questo nome.' });
            }

            // Default password
            bcrypt.hash('azira', 10, (err, hash) => {
                if (err) {
                    console.error('Errore hash:', err);
                    return res.status(500).json({ message: 'Errore nella criptazione.' });
                }

                db.query(
                    'INSERT INTO utenti (nome, password, autorizzazioni) VALUES (?, ?, ?)',
                    [nome, hash, autorizzazioni || 'user'],
                    (err, result) => {
                        if (err) {
                            console.error('Errore inserimento utente:', err);
                            return res.status(500).json({ message: 'Errore durante l\'inserimento.' });
                        }

                        const newUser = {
                            id: result.insertId,
                            nome,
                            autorizzazioni: autorizzazioni || 'user'
                        };

                        io.emit('user-added', newUser);

                        res.status(201).json({
                            message: 'Utente aggiunto con successo. La password iniziale è "azira".'
                        });
                    }
                );
            });
        });
    });

    // PUT /user/update-name
    // Update current user's name
    router.put('/user/update-name', (req, res) => {
        const db = getDb();
        const userId = req.session.user?.id;
        const { nome } = req.body;

        if (!userId || !nome) {
            return res.status(400).json({ message: 'Dati mancanti.' });
        }

        db.query(
            'UPDATE utenti SET nome = ? WHERE id_utente = ?',
            [nome, userId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Errore durante aggiornamento nome.' });
                }
                req.session.user.nome = nome;
                res.json({ message: 'Nome aggiornato con successo.' });
            }
        );
    });

    // PUT /user/update-password
    // Update current user's password
    router.put('/user/update-password', (req, res) => {
        const db = getDb();
        const userId = req.session.user?.id;
        const { oldPassword, newPassword } = req.body;

        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Dati mancanti.' });
        }

        db.query('SELECT password FROM utenti WHERE id_utente = ?', [userId], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(500).json({ message: 'Errore durante verifica utente.' });
            }

            const passwordCorretta = await bcrypt.compare(oldPassword, results[0].password);
            if (!passwordCorretta) {
                return res.status(403).json({ message: 'Vecchia password errata.' });
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            db.query(
                'UPDATE utenti SET password = ? WHERE id_utente = ?',
                [hashed, userId],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Errore durante aggiornamento password.' });
                    }
                    res.json({ message: 'Password aggiornata con successo.' });
                }
            );
        });
    });

    // GET /users
    // Get all users (admin only)
    router.get('/users', (req, res) => {
        const db = getDb();

        if (req.session.user?.autorizzazioni !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato.' });
        }

        db.query('SELECT id_utente AS id, nome, autorizzazioni FROM utenti', (err, results) => {
            if (err) {
                console.error('Errore nel recupero utenti:', err);
                return res.status(500).json({ message: 'Errore durante il recupero utenti.' });
            }
            res.json(results);
        });
    });

    // PUT /users/:id/role
    // Update user's role (admin only)
    router.put('/users/:id/role', (req, res) => {
        const db = getDb();
        const { id } = req.params;
        const { autorizzazioni } = req.body;

        if (req.session.user?.autorizzazioni !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato.' });
        }

        if (!['user', 'super', 'admin'].includes(autorizzazioni)) {
            return res.status(400).json({ message: 'Ruolo non valido.' });
        }

        db.query(
            'UPDATE utenti SET autorizzazioni = ? WHERE id_utente = ?',
            [autorizzazioni, id],
            (err) => {
                if (err) {
                    console.error('Errore aggiornamento ruolo:', err);
                    return res.status(500).json({ message: 'Errore aggiornamento ruolo.' });
                }

                const socketId = userSockets.get(parseInt(id));
                if (socketId) {
                    io.to(socketId).emit('role-changed', autorizzazioni);
                }

                io.emit('role-updated', { id: parseInt(id), nuovoRuolo: autorizzazioni });

                res.json({ message: 'Ruolo aggiornato.' });
            }
        );
    });

    // DELETE /users/:id
    // Delete a user (admin only)
    router.delete('/users/:id', (req, res) => {
        const db = getDb();
        const { id } = req.params;

        if (req.session.user?.autorizzazioni !== 'admin') {
            return res.status(403).json({ message: 'Accesso negato.' });
        }

        db.query('DELETE FROM utenti WHERE id_utente = ?', [id], (err) => {
            if (err) {
                console.error('Errore eliminazione:', err);
                return res.status(500).json({ message: 'Errore durante l\'eliminazione.' });
            }

            const socketId = userSockets.get(parseInt(id));
            if (socketId) {
                io.to(socketId).emit('force-logout', 'Il tuo account è stato eliminato da un amministratore.');
            }

            io.emit('user-deleted', parseInt(id));

            res.json({ message: 'Utente eliminato.' });
        });
    });

    // PUT /users/:id/reset-password
    // Reset user's password to default "azira"
    router.put('/users/:id/reset-password', async (req, res) => {
        const db = getDb();
        const id = req.params.id;

        try {
            const hashed = await bcrypt.hash('azira', 10);
            db.query('UPDATE utenti SET password = ? WHERE id_utente = ?', [hashed, id], (err) => {
                if (err) {
                    console.error('Errore reset password:', err);
                    return res.status(500).json({ message: 'Errore durante il reset.' });
                }
                return res.json({ message: 'Password reimpostata con successo (password di default: "azira")' });
            });
        } catch (error) {
            console.error('Hash error:', error);
            return res.status(500).json({ message: 'Errore interno.' });
        }
    });

    return router;
};