/**
 * Sample routes
 * - Handles creation, retrieval, update, and deletion of samples
 * - Supports image upload and emits socket events to notify clients of changes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const getDb = require('../db');

module.exports = (io) => {
    const router = express.Router();

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
    const upload = multer({ storage });

    // GET /campioni
    // Retrieve all samples (codice, immagine, descrizione)
    router.get('/campioni', (req, res) => {
        const db = getDb();
        db.query('SELECT codice, immagine, descrizione FROM campioni', (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed.' });
            }
            res.json(results);
        });
    });

    // GET /campioni/:codice
    // Retrieve the details of a specific sample by codice
    router.get('/campioni/:codice', (req, res) => {
        const db = getDb();
        const codice = req.params.codice;
        db.query('SELECT * FROM campioni WHERE codice = ?', [codice], (err, results) => {
            if (err) return res.status(500).json({ error: 'Errore nella query.' });
            if (results.length === 0) return res.status(404).json({ error: 'Campione non trovato.' });
            res.json(results[0]);
        });
    });

    // POST /campioni
    // Add a new sample with optional image upload
    router.post('/campioni', upload.single('immagine'), (req, res) => {
        const db = getDb();
        const { codice, descrizione } = req.body;
        const immagine = req.file ? `/images/${req.file.filename}` : '/images/_missing_image.png';

        if (!codice) {
            return res.status(400).json({ message: 'Il codice è obbligatorio.' });
        }

        db.query('SELECT * FROM campioni WHERE codice = ?', [codice], (err, results) => {
            if (err) {
                console.error('Errore controllo esistenza campione:', err);
                return res.status(500).json({ message: 'Errore nel controllo del codice.' });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'Esiste già un campione con questo codice.' });
            }

            db.query(
                'INSERT INTO campioni (codice, descrizione, immagine) VALUES (?, ?, ?)',
                [codice, descrizione || null, immagine],
                (err) => {
                    if (err) {
                        console.error('Errore inserimento campione:', err);
                        return res.status(500).json({ message: 'Errore inserimento campione.' });
                    }

                    // Emetti l'evento verso tutti i client connessi
                    io.emit('sample-added', { codice, descrizione: descrizione || '', immagine });
                    res.status(201).json({ message: 'Campione aggiunto con successo.' });
                }
            );
        });
    });


    // DELETE /campioni/:codice
    // Delete a sample and its related sizes by codice
    router.delete('/campioni/:codice', (req, res) => {
        const db = getDb();
        const { codice } = req.params;

        db.query('SELECT immagine FROM campioni WHERE codice = ?', [codice], (err, results) => {
            if (err) return res.status(500).json({ message: 'Errore nel recupero immagine.' });
            if (results.length === 0) return res.status(404).json({ message: 'Campione non trovato.' });

            const immagine = results[0].immagine;
            const isCustomImage = immagine && !immagine.includes('_missing_image');

            db.query('DELETE FROM taglie_campione WHERE codice_campione = ?', [codice], (err) => {
                if (err) return res.status(500).json({ message: 'Errore eliminazione taglia.' });

                db.query('DELETE FROM campioni WHERE codice = ?', [codice], (err) => {
                    if (err) return res.status(500).json({ message: 'Errore eliminazione campione.' });

                    if (isCustomImage) {
                        const pathToDelete = path.join(__dirname, '..', immagine);
                        fs.unlink(pathToDelete, () => { });
                    }

                    io.emit('sample-deleted', { codice });
                    res.json({ message: 'Campione e taglie eliminati.' });
                });
            });
        });
    });

    // PUT /campioni/:oldCodice/codice
    // Update a sample's codice (primary key)
    router.put('/campioni/:oldCodice/codice', (req, res) => {
        const db = getDb();
        const { oldCodice } = req.params;
        const { nuovoCodice } = req.body;

        if (!nuovoCodice || nuovoCodice === oldCodice) {
            return res.status(400).json({ message: 'Codice non valido.' });
        }

        db.query('SELECT * FROM campioni WHERE codice = ?', [nuovoCodice], (err, result) => {
            if (err) return res.status(500).json({ message: 'Errore server.' });
            if (result.length > 0) {
                return res.status(400).json({ message: 'Codice già presente.' });
            }

            db.query(
                'UPDATE campioni SET codice = ? WHERE codice = ?',
                [nuovoCodice, oldCodice],
                (err) => {
                    if (err) return res.status(500).json({ message: 'Errore aggiornamento codice.' });
                    io.emit('sample-updated', { oldCodice, nuovoCodice });
                    res.json({ message: 'Codice aggiornato con successo.', nuovoCodice });
                }
            );
        });
    });

    // PUT /campioni/:codice/descrizione
    // Update the description of a sample
    router.put('/campioni/:codice/descrizione', (req, res) => {
        const db = getDb();
        const { codice } = req.params;
        const { descrizione } = req.body;

        db.query(
            'UPDATE campioni SET descrizione = ? WHERE codice = ?',
            [descrizione || null, codice],
            (err) => {
                if (err) return res.status(500).json({ message: 'Errore aggiornamento descrizione.' });
                io.emit('sample-updated', { codice, descrizione });
                res.json({ message: 'Descrizione aggiornata con successo.' });
            }
        );
    });

    // PUT /campioni/:codice/immagine
    // Update the image of a sample and delete the old one
    router.put('/campioni/:codice/immagine', upload.single('immagine'), (req, res) => {
        const db = getDb();
        const { codice } = req.params;
        const nuovaImmagine = req.file ? `/images/${req.file.filename}` : null;
        if (!nuovaImmagine) return res.status(400).json({ message: 'Nessuna immagine ricevuta.' });

        db.query('SELECT immagine FROM campioni WHERE codice = ?', [codice], (err, results) => {
            if (err) return res.status(500).json({ message: 'Errore lettura immagine attuale.' });
            if (results.length === 0) return res.status(404).json({ message: 'Campione non trovato.' });

            const immagineVecchia = results[0].immagine;
            const isCustomImage = immagineVecchia && !immagineVecchia.includes('_missing_image');

            db.query('UPDATE campioni SET immagine = ? WHERE codice = ?', [nuovaImmagine, codice], (err) => {
                if (err) return res.status(500).json({ message: 'Errore aggiornamento immagine.' });

                if (isCustomImage) {
                    const pathToDelete = path.join(__dirname, '..', immagineVecchia);
                    fs.unlink(pathToDelete, () => { });
                }

                io.emit('sample-updated', { codice, immagine: nuovaImmagine });
                res.json({ message: 'Immagine aggiornata.', nuovaImmagine });
            });
        });
    });

    return router;
};