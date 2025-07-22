/**
 * Shipping API routes
 * - Provides endpoints to retrieve and create shipments
 */

const express = require('express');
const getDb = require('../db');

module.exports = (io) => {
    const router = express.Router();

    // GET /spedizioni
    // Retrieve all shipments with their details
    router.get('/spedizioni', (req, res) => {
        const db = getDb();

        const query = `
      SELECT s.id_spedizione, s.id_utente, s.destinatario, s.data, s.nome_corriere, s.nome_utente,
       d.codice_campione, d.taglia, d.quantità
      FROM spedizioni s
      LEFT JOIN dettaglio_spedizioni d ON s.id_spedizione = d.id_spedizione
      ORDER BY s.data DESC, s.id_spedizione DESC
    `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('Errore recupero spedizioni:', err);
                return res.status(500).json({ message: 'Errore durante il recupero delle spedizioni.' });
            }

            const spedizioni = {};
            results.forEach(row => {
                if (!spedizioni[row.id_spedizione]) {
                    spedizioni[row.id_spedizione] = {
                        id: row.id_spedizione,
                        id_utente: row.id_utente,
                        destinatario: row.destinatario,
                        data: row.data,
                        corriere: row.nome_corriere,
                        utente: row.nome_utente,
                        dettagli: []
                    };
                }
                if (row.codice_campione) {
                    spedizioni[row.id_spedizione].dettagli.push({
                        codice: row.codice_campione,
                        taglia: row.taglia,
                        quantità: row.quantità
                    });
                }
            });

            res.json(Object.values(spedizioni));
        });
    });

    // POST /spedizioni
    // Create a new shipment and update related sizes
    router.post('/spedizioni', (req, res) => {
        const db = getDb();
        const { destinatario, nome_corriere, dettaglio } = req.body;
        const nome_utente = req.session.user?.nome;
        const id_utente = req.session.user?.id;

        if (!id_utente || !nome_utente || !destinatario || !nome_corriere || !Array.isArray(dettaglio)) {
            return res.status(400).json({ message: 'Dati mancanti o non validi.' });
        }

        const now = new Date();
        const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        const data = offsetDate.toISOString().slice(0, 19).replace('T', ' ');

        db.query(
            'INSERT INTO spedizioni (id_utente, nome_utente, destinatario, data, nome_corriere) VALUES (?, ?, ?, ?, ?)',
            [id_utente, nome_utente, destinatario, data, nome_corriere],
            (err, result) => {
                if (err) {
                    console.error('Errore inserimento spedizione:', err);
                    return res.status(500).json({ message: 'Errore inserimento spedizione.' });
                }

                const id_spedizione = result.insertId;
                const values = dettaglio.map(d => [id_spedizione, d.codice_campione, d.taglia, d.quantità]);

                db.query(
                    'INSERT INTO dettaglio_spedizioni (id_spedizione, codice_campione, taglia, quantità) VALUES ?',
                    [values],
                    (err) => {
                        if (err) {
                            console.error('Errore inserimento dettaglio:', err);
                            return res.status(500).json({ message: 'Errore dettaglio spedizione.' });
                        }

                        let pending = dettaglio.length;
                        let erroreTaglia = false;

                        dettaglio.forEach(d => {
                            db.query(
                                'UPDATE taglie_campione SET quantità = quantità - ? WHERE codice_campione = ? AND taglia = ? AND numero_box = ?',
                                [d.quantità, d.codice_campione, d.taglia, d.numero_box],
                                (err) => {
                                    if (err) {
                                        console.error('Errore aggiornamento taglia:', err);
                                        erroreTaglia = true;
                                    } else {
                                        db.query(
                                            'SELECT * FROM taglie_campione WHERE codice_campione = ? AND taglia = ? AND numero_box = ?',
                                            [d.codice_campione, d.taglia, d.numero_box],
                                            (err2, results) => {
                                                if (!err2 && results.length > 0) {
                                                    const updatedSize = results[0];
                                                    io.emit('size-updated', updatedSize);
                                                }
                                            }
                                        );
                                    }

                                    if (--pending === 0) {
                                        if (erroreTaglia) {
                                            return res.status(500).json({ message: 'Errore aggiornamento taglia.' });
                                        }

                                        const nuovaSpedizione = {
                                            id: id_spedizione,
                                            id_utente: id_utente,
                                            destinatario,
                                            data,
                                            corriere: nome_corriere,
                                            utente: nome_utente,
                                            dettagli: dettaglio.map(d => ({
                                                codice: d.codice_campione,
                                                taglia: d.taglia,
                                                quantità: d.quantità
                                            }))
                                        };

                                        io.emit('shipping-created', nuovaSpedizione);
                                        res.status(201).json({ message: 'Spedizione creata con successo.' });
                                    }
                                }
                            );
                        });
                    }
                );
            }
        );
    });

    return router;
};