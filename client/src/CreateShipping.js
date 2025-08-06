import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import socket from './socket';
import './css/CreateShipping.css';

/**
 * CreateShipping component
 * - Allows the user to create a new shipping entry with sample sizes
 * - Dynamically updates size options based on sample/taglia/box selections
 * - Syncs in real-time with backend using socket.io (samples and sizes)
 * - Validates selections before submitting shipping data to the server
 */

function CreateShipping() {

    useEffect(() => {
        fetch('/api/check-session', { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    window.location.href = '/';
                }
            })
            .catch(() => {
                window.location.href = '/';
            });
    }, []);

    const [samples, setSamples] = useState([]); // List of all available samples
    const [rows, setRows] = useState([{ codice_campione: '', taglia: '', numero_box: '', quantità: '' }]); // Array of rows representing shipping entries
    const [sizesBySample, setSizesBySample] = useState({}); // Stores sizes grouped by sample code
    const [form, setForm] = useState({ destinatario: '', nome_corriere: '' }); // Form state for general shipping info
    const [message, setMessage] = useState(''); // Feedback message shown after submission attempt

    // Fetch the list of all available samples on component mount
    useEffect(() => {
        fetch('/api/campioni')
            .then(res => res.json())
            .then(data => setSamples(data));
    }, []);

    useEffect(() => {

        // Add the newly created sample to the list
        const handleSampleAdded = (sample) => {
            setSamples(prev => [...prev, sample]);
        };

        // Remove the deleted sample from the list and clean up dependent state
        const handleSampleDeleted = ({ codice }) => {
            setSamples(prev => prev.filter(s => s.codice !== codice));
            setSizesBySample(prev => {
                const updated = { ...prev };
                delete updated[codice];
                return updated;
            });
            setRows(prev => prev.map(r => r.codice_campione === codice ? { codice_campione: '', taglia: '', numero_box: '', quantità: '' } : r));
        };

        // Update sample state when its code or properties change
        const handleSampleUpdated = (update) => {
            setSamples(prev => prev.map(s => {
                if (update.nuovoCodice && s.codice === update.oldCodice) {
                    return { ...s, codice: update.nuovoCodice };
                }
                if (update.codice && s.codice === update.codice) {
                    return { ...s, ...update };
                }
                return s;
            }));
            if (update.nuovoCodice) {
                setSizesBySample(prev => {
                    const updated = { ...prev };
                    updated[update.nuovoCodice] = updated[update.oldCodice];
                    delete updated[update.oldCodice];
                    return updated;
                });
                setRows(prev => prev.map(r => r.codice_campione === update.oldCodice
                    ? { ...r, codice_campione: update.nuovoCodice }
                    : r));
            }
        };

        // Append a new size to the corresponding sample
        const handleSizeAdded = (newSize) => {
            setSizesBySample(prev => {
                const current = prev[newSize.codice_campione] || [];
                return {
                    ...prev,
                    [newSize.codice_campione]: [...current, newSize]
                };
            });
        };

        // Update a size and ensure rows remain consistent with the new data
        const handleSizeUpdated = (updatedSize) => {
            setSizesBySample(prev => {
                const current = prev[updatedSize.codice_campione] || [];
                const updatedSizes = current.map(s => s.id_taglia === updatedSize.id_taglia ? updatedSize : s);
                const newSizesBySample = { ...prev, [updatedSize.codice_campione]: updatedSizes };

                setRows(prevRows => prevRows.map(row => {
                    if (row.codice_campione === updatedSize.codice_campione) {
                        const rowCombinationExists = updatedSizes.some(s =>
                            s.taglia === row.taglia && s.numero_box === row.numero_box
                        );

                        if (!rowCombinationExists) {
                            return { ...row, taglia: '', numero_box: '', quantità: '' };
                        }

                        const matchingSize = updatedSizes.find(s =>
                            s.taglia === row.taglia && s.numero_box === row.numero_box
                        );

                        if (matchingSize) {
                            const max = parseInt(matchingSize.quantità, 10);
                            const currentQty = parseInt(row.quantità, 10);
                            if (currentQty > max) {
                                return { ...row, quantità: '' };
                            }
                        }
                    }
                    return row;
                }));

                return newSizesBySample;
            });
        };

        // Remove deleted size and reset rows that were using it
        const handleSizeDeleted = ({ id_taglia }) => {
            setSizesBySample(prev => {
                const updated = {};
                for (const codice in prev) {
                    const newList = prev[codice].filter(s => s.id_taglia !== id_taglia);
                    updated[codice] = newList;
                }
                return updated;
            });

            setRows(prev => prev.map(row => {
                const stillExists = sizesBySample[row.codice_campione]?.some(s =>
                    s.id_taglia !== id_taglia &&
                    s.taglia === row.taglia &&
                    s.numero_box === row.numero_box
                );
                return stillExists ? row : { ...row, taglia: '', numero_box: '', quantità: '' };
            }));
        };


        socket.on('sample-added', handleSampleAdded);
        socket.on('sample-deleted', handleSampleDeleted);
        socket.on('sample-updated', handleSampleUpdated);
        socket.on('size-added', handleSizeAdded);
        socket.on('size-updated', handleSizeUpdated);
        socket.on('size-deleted', handleSizeDeleted);

        return () => {
            socket.off('sample-added', handleSampleAdded);
            socket.off('sample-deleted', handleSampleDeleted);
            socket.off('sample-updated', handleSampleUpdated);
            socket.off('size-added', handleSizeAdded);
            socket.off('size-updated', handleSizeUpdated);
            socket.off('size-deleted', handleSizeDeleted);
        };
    }, [sizesBySample]);

    // Triggered when a user selects or changes a sample in a row
    const handleSampleChange = (index, selectedOption) => {
        const codice = selectedOption?.value || '';
        const newRows = [...rows];
        newRows[index] = { codice_campione: codice, taglia: '', numero_box: '', quantità: '' };
        setRows(newRows);

        if (codice && !sizesBySample[codice]) {
            fetch(`/api/sample-sizes/${codice}`)
                .then(res => res.json())
                .then(data => setSizesBySample(prev => ({ ...prev, [codice]: data })));
        }
    };

    // Handles changes for taglia, numero_box, and quantità fields
    const handleFieldChange = (index, field, selectedOption) => {
        const newRows = [...rows];
        newRows[index][field] = selectedOption?.value || '';
        setRows(newRows);
    };

    // Adds a new empty row to the form
    const handleAddRow = () => {
        setRows([...rows, { codice_campione: '', taglia: '', numero_box: '', quantità: '' }]);
    };

    // Removes a specific row unless it's the first one
    const handleRemoveRow = (index) => {
        if (index === 0) return;
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };

    // Dynamically computes the available options for each select field
    const getFilteredOptions = (row, field, rowIndex) => {
        const size = sizesBySample[row.codice_campione] || [];
        if (field === 'taglia') {
            const usedSizes = rows
                .filter((r, i) =>
                    i !== rowIndex &&
                    r.codice_campione === row.codice_campione &&
                    r.taglia
                )
                .map(r => r.taglia);

            const allSizes = [...new Set(size.map(s => s.taglia))];
            const availableSizes = allSizes.filter(taglia => !usedSizes.includes(taglia));

            return availableSizes.map(taglia => ({ label: taglia, value: taglia }));
        } else if (field === 'numero_box') {
            return size.filter(s => s.taglia === row.taglia).map(s => ({ label: s.numero_box, value: s.numero_box }));
        } else if (field === 'quantità') {
            const selected = size.find(s => s.taglia === row.taglia && s.numero_box === row.numero_box);
            return selected ? Array.from({ length: selected.quantità }, (_, i) => ({ label: i + 1, value: i + 1 })) : [];
        }
        return [];
    };

    // Submit the shipping form, validating data and sending it to the backend
    const handleSubmit = async (e) => {
        e.preventDefault();

        const righeValide = rows.filter(r =>
            r.codice_campione &&
            r.taglia &&
            r.numero_box &&
            r.quantità
        );

        if (righeValide.length === 0) {
            setMessage('Devi selezionare almeno un campione completo.');
            return;
        }

        try {
            const resSession = await fetch('/api/check-session', { credentials: 'include' });
            const dataSession = await resSession.json();

            if (!dataSession.loggedIn) {
                setMessage('Utente non autenticato.');
                return;
            }

            const res = await fetch('/api/spedizioni', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_utente: dataSession.user.id,
                    destinatario: form.destinatario,
                    nome_corriere: form.nome_corriere,
                    dettaglio: righeValide
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Spedizione creata con successo.');
                setForm({ destinatario: '', nome_corriere: '' });
                setRows([{ codice_campione: '', taglia: '', numero_box: '', quantità: '' }]);
            } else {
                setMessage(data.message || 'Errore durante la creazione della spedizione.');
            }
        } catch (error) {
            setMessage('Errore di rete o del server.');
        }
    };

    // Returns all samples codes
    const getSampleOptions = () => {
        return samples.map(s => ({ label: s.codice, value: s.codice }));
    };

    return (
        <div className="outer-wrapper">
            <div className="create-shipping-form">
                <h2>Crea nuova spedizione</h2>
                <form onSubmit={handleSubmit} className='shipping-form'>
                    <input
                        placeholder="Destinatario"
                        value={form.destinatario}
                        onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                        required
                    />
                    <input
                        placeholder="Nome corriere"
                        value={form.nome_corriere}
                        onChange={(e) => setForm({ ...form, nome_corriere: e.target.value })}
                        required
                    />

                    <table>
                        <thead>
                            <tr>
                                <th>Codice</th>
                                <th>Taglia</th>
                                <th>Box</th>
                                <th>Quantità</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index}>
                                    <td>
                                        <Select
                                            options={getSampleOptions()}
                                            value={row.codice_campione ? { label: row.codice_campione, value: row.codice_campione } : null}
                                            onChange={(option) => handleSampleChange(index, option)}
                                            menuPortalTarget={document.body}
                                            className='details-select'
                                        />
                                    </td>
                                    <td>
                                        <Select
                                            options={getFilteredOptions(row, 'taglia', index)}
                                            value={row.taglia ? { label: row.taglia, value: row.taglia } : null}
                                            onChange={(option) => handleFieldChange(index, 'taglia', option)}
                                            isDisabled={!row.codice_campione}
                                            menuPortalTarget={document.body}
                                            className='details-select'
                                        />
                                    </td>
                                    <td>
                                        <Select
                                            options={getFilteredOptions(row, 'numero_box', index)}
                                            value={row.numero_box ? { label: row.numero_box, value: row.numero_box } : null}
                                            onChange={(option) => handleFieldChange(index, 'numero_box', option)}
                                            isDisabled={!row.taglia}
                                            menuPortalTarget={document.body}
                                            className='details-select'
                                        />
                                    </td>
                                    <td>
                                        <Select
                                            options={getFilteredOptions(row, 'quantità', index)}
                                            value={row.quantità ? { label: row.quantità, value: row.quantità } : null}
                                            onChange={(option) => handleFieldChange(index, 'quantità', option)}
                                            isDisabled={!row.numero_box}
                                            menuPortalTarget={document.body}
                                            className='details-select'
                                        />
                                    </td>
                                    <td>
                                        {index !== 0 && (
                                            <button type="button" onClick={() => handleRemoveRow(index)} className='remove-button'>X</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <button
                            type="button"
                            className="small-button"
                            onClick={handleAddRow}
                        >
                            Aggiungi campione
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.5rem' }}>
                        <button type="submit" className="large-button">
                            Crea spedizione
                        </button>
                    </div>

                    {/* Feedback message */}
                    {message && <p className="form-message">{message}</p>}
                </form>
            </div>
        </div>
    );

}

export default CreateShipping;