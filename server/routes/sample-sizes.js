/**
 * Sample sizes routes
 * - Manages sizes associated with samples
 * - Handles CRUD operations (GET, POST, PUT, DELETE)
 * - Emits real-time updates to clients via socket.io
 */

const express = require('express');
const getDb = require('../db');

// Export a function that receives the socket.io instance and returns the router
module.exports = (io) => {
    const router = express.Router();

    // GET /sample-sizes/:codiceCampione
    // Get all size entries for a specific sample
    router.get('/sample-sizes/:codiceCampione', (req, res) => {
        const db = getDb();
        const codice = req.params.codiceCampione;

        db.query(
            'SELECT id_taglia, numero_box, taglia, quantità, id_scaffale, sezione, ripiano FROM taglie_campione WHERE codice_campione = ?',
            [codice],
            (err, results) => {
                if (err) {
                    console.error('Failed to fetch size:', err);
                    return res.status(500).json({ message: 'Errore durante il recupero della taglia.' });
                }
                res.json(results);
            }
        );
    });

    // POST /sample-sizes
    // Add new size entry
    router.post('/sample-sizes', (req, res) => {
        const db = getDb();
        const { codice_campione, numero_box, taglia, quantità, id_scaffale, sezione, ripiano } = req.body;

        if (!codice_campione || !numero_box || !taglia || !quantità || !id_scaffale || !sezione || ripiano == null) {
            return res.status(400).json({ message: 'Dati incompleti.' });
        }

        db.query(
            'INSERT INTO taglie_campione (codice_campione, numero_box, taglia, quantità, id_scaffale, sezione, ripiano) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [codice_campione, numero_box, taglia, quantità, id_scaffale, sezione, ripiano],
            (err, result) => {
                if (err) {
                    console.error('Failed to insert size:', err);
                    return res.status(500).json({ message: 'Errore durante l\'inserimento.' });
                }

                const newId = result.insertId;

                // Get full data of the new sample-size row
                db.query(
                    'SELECT id_taglia, codice_campione, numero_box, taglia, quantità, id_scaffale, sezione, ripiano FROM taglie_campione WHERE id_taglia = ?',
                    [newId],
                    (err2, rows) => {
                        if (err2) {
                            console.error('Failed to fetch inserted size:', err2);
                            return res.status(500).json({ message: 'Taglia inserita ma non recuperata.' });
                        }

                        const newSize = rows[0];
                        io.emit('size-added', newSize);

                        res.json({ message: 'Taglia aggiunta correttamente.' });
                    }
                );
            }
        );
    });

    // PUT /sample-sizes/:id
    // Update an existing size and propagate changes to all entries with the same box
    router.put('/sample-sizes/:id', (req, res) => {
        const db = getDb();
        const id = req.params.id;
        const { numero_box, taglia, quantità, id_scaffale, sezione, ripiano } = req.body;

        const isClearAction =
            (quantità === 0 || quantità === '0') &&
            (numero_box === null || numero_box === '') &&
            (!id_scaffale && !sezione && !ripiano);

        if (
            !isClearAction &&
            (
                numero_box == null ||
                taglia == null ||
                quantità == null ||
                id_scaffale == null ||
                sezione == null ||
                ripiano == null
            )
        ) {
            return res.status(400).json({ message: 'Dati incompleti.' });
        }

        const sql = `
    UPDATE taglie_campione
    SET numero_box = ?, taglia = ?, quantità = ?, id_scaffale = ?, sezione = ?, ripiano = ?
    WHERE id_taglia = ?
  `;

        db.query(sql, [numero_box, taglia, quantità, id_scaffale, sezione, ripiano, id], (err) => {
            if (err) {
                console.error('Failed to update size:', err);
                return res.status(500).json({ message: 'Errore durante l\'aggiornamento.' });
            }

            const sql2 = `
      UPDATE taglie_campione
      SET id_scaffale = ?, sezione = ?, ripiano = ?
      WHERE numero_box = ? AND id_taglia != ?
    `;

            db.query(sql2, [id_scaffale, sezione, ripiano, numero_box, id], (err2) => {
                if (err2) {
                    console.error('Failed to update related sizes:', err2);
                    return res.status(500).json({ message: 'Errore durante aggiornamento taglie correlate.' });
                }

                db.query(
                    'SELECT * FROM taglie_campione WHERE numero_box = ?',
                    [numero_box],
                    (err3, rows) => {
                        if (err3) {
                            console.error('Failed to fetch updated sizes:', err3);
                            return res.status(500).json({ message: 'Errore durante lettura taglie aggiornate.' });
                        }

                        rows.forEach(size => {
                            io.emit('size-updated', size);
                        });

                        res.json({ message: 'Modifica applicata a tutte le taglie della box.' });
                    }
                );
            });
        });
    });

    // DELETE /sample-sizes/:id
    // Delete a size entry
    router.delete('/sample-sizes/:id', (req, res) => {
        const db = getDb();
        const id = parseInt(req.params.id);

        db.query('DELETE FROM taglie_campione WHERE id_taglia = ?', [id], (err, result) => {
            if (err) {
                console.error('Failed to delete size:', err);
                return res.status(500).json({ message: 'Errore durante l\'eliminazione.' });
            }

            io.emit('size-deleted', { id_taglia: id });
            res.json({ message: 'Taglia eliminata con successo.' });
        });
    });

    return router;
};