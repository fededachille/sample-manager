import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import socket from './socket';
import './css/SampleDetails.css';

/**
 * SampleDetail component
 * - Displays and manages detailed info for a specific sample
 * - Supports editing sample code, description, and image
 * - Allows adding, updating, and deleting sizes with shelf mapping
 * - Uses socket.io to update sizes in real-time
 */

function SampleDetail() {

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

  const { codice } = useParams(); // Extracts the sample code from the route parameters
  const [campione, setCampione] = useState(null); // State to store sample details
  const [loading, setLoading] = useState(true); // Loading state while data is being fetched
  const [message, setMessage] = useState(''); // Feedback message after an action (e.g., form submission)
  const [scaffali, setScaffali] = useState([]); // List of all available shelves
  const [scaffaleSelezionato, setScaffaleSelezionato] = useState(null); // Currently selected shelf
  const [sizes, setSizes] = useState([]); // List of sizes associated with the current sample
  const [editIndex, setEditIndex] = useState(null); // Index of the size row currently being edited
  const [editData, setEditData] = useState(null);  // Editable data for the selected row
  const [allBoxes, setAllBoxes] = useState([]); // List of all boxes
  const [existingBoxSelected, setExistingBoxSelected] = useState(false)

  // Form state for adding a new size
  const [form, setForm] = useState({
    codice: '',
    descrizione: '',
    numero_box: '',
    taglia: '',
    quantità: '',
    id_scaffale: '',
    sezione: '',
    ripiano: ''
  });
  const [feedbackCodice, setFeedbackCodice] = useState(null); // Feedback for code update operation
  const [editCode, setEditCode] = useState(''); // Controlled input for editing sample code
  const [codeError, setCodeError] = useState(''); // Error message related to new code validation
  const [feedbackDescrizione, setFeedbackDescrizione] = useState(null); // Feedback for description update operation
  const normalized = (str) => str?.toLowerCase().trim() || ''; // Utility to normalize strings for comparison (case-insensitive, trimmed)

  // Loads all sizes associated with the current sample
  const loadSizes = useCallback(() => {
    fetch(`/api/sample-sizes/${codice}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSizes(data));
  }, [codice]);

  // Sends an update request to save the modified size data
  const handleSave = async (index) => {
    const res = await fetch(`/api/sample-sizes/${editData.id_taglia}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editData)
    });

    const data = await res.json();

    if (res.ok) {
      setEditIndex(null);
      setEditData(null);
      loadSizes();
    } else {
      alert(data.message || 'Errore durante il salvataggio.');
    }
  };

  // Sends a request to delete the specified size (after confirmation)
  const handleDelete = async (id_taglia) => {
    const conferma = window.confirm("Sei sicuro di voler eliminare questa taglia?");
    if (!conferma) return;

    const res = await fetch(`/api/sample-sizes/${id_taglia}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Errore durante l\'eliminazione.');
    }
  };

  // Validates a new sample code before updating
  const validateNewCode = (newCode) => {
    if (!newCode.trim()) {
      setCodeError('Il codice non può essere vuoto.');
      return false;
    }

    if (newCode === campione.codice) {
      setCodeError('Il codice è identico a quello attuale.');
      return false;
    }

    if (newCode.length > 30) {
      setCodeError('Il codice non può superare i 30 caratteri.');
      return false;
    }

    setCodeError('');
    return true;
  };

  // Handles controlled input for the form state
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submits the form to add a new size to the current sample
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate size within the same box
    const tagliaEsistente = sizes.find(s =>
      normalized(s.numero_box) === normalized(form.numero_box) &&
      normalized(s.taglia) === normalized(form.taglia)
    );

    if (tagliaEsistente) {
      alert(`La taglia "${form.taglia}" è già presente nella box "${form.numero_box}".`);
      return;
    }

    const res = await fetch('/api/sample-sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...form,
        codice_campione: codice
      })
    });

    const data = await res.json();
    setMessage(data.message);
    if (res.ok) {
      // Reset form after success
      setForm({
        numero_box: '',
        taglia: '',
        quantità: '',
        id_scaffale: '',
        sezione: '',
        ripiano: ''
      });
    }
    setExistingBoxSelected(false);
    setScaffaleSelezionato(null);
    loadSizes();

  };

  // Sends an update request to change the sample's code
  const handleUpdateCode = async () => {
    if (!validateNewCode(editCode)) return;

    const res = await fetch(`/api/campioni/${campione.codice}/codice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nuovoCodice: editCode })
    });

    const data = await res.json();

    if (res.ok) {
      setFeedbackCodice({ message: data.message, success: true });
      setCampione({ ...campione, codice: editCode });
      // Update the URL without reloading the page
      window.history.replaceState(null, '', `/campione/${editCode}`);
    } else {
      setFeedbackCodice({ message: data.message || 'Errore aggiornamento codice.', success: false });
    }
  };

  // Sends an update request to change the sample's description
  const handleUpdateDescription = async () => {
    const res = await fetch(`/api/campioni/${campione.codice}/descrizione`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ descrizione: form.descrizione })
    });

    const data = await res.json();

    setFeedbackDescrizione({
      message: data.message,
      success: res.ok
    });

    if (res.ok) {
      setCampione({ ...campione, descrizione: form.descrizione });
    }
  };

  // Initial data loading: sample, sizes, shelves and boxes
  useEffect(() => {
    // Fetch sample data
    fetch(`/api/campioni/${codice}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCampione(data);
        setForm((prev) => ({
          ...prev,
          codice: data.codice,
          descrizione: data.descrizione || ''
        }));
        setLoading(false);
      });

    // Fetch all available shelves
    fetch('/api/shelves', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setScaffali(data);
      });

    fetch('/api/sample-sizes/boxes/all', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const boxOptions = data.map(box => ({
          label: box.numero_box,
          value: box.numero_box,
          id_scaffale: box.id_scaffale,
          sezione: box.sezione,
          ripiano: box.ripiano
        }));
        setAllBoxes(boxOptions);
      });


    // Fetch sample sizes
    loadSizes();
  }, [codice, loadSizes]);

  // Update editable code field when sample is loaded
  useEffect(() => {
    if (campione) {
      setEditCode(campione.codice);
    }
  }, [campione]);


  // Real-time sync of sizes via socket events
  useEffect(() => {
    const handleAdded = (newSize) => {
      if (newSize.codice_campione === codice) {
        setSizes(prev => [...prev, newSize]);
      }

      setAllBoxes(prev => {
        const alreadyExists = prev.some(
          b => b.value === newSize.numero_box
        );
        if (alreadyExists) return prev;

        return [
          ...prev,
          {
            label: newSize.numero_box,
            value: newSize.numero_box,
            id_scaffale: newSize.id_scaffale,
            sezione: newSize.sezione,
            ripiano: newSize.ripiano
          }
        ];
      });
    };

    const handleUpdated = (updatedSizes) => {
      setSizes(prev =>
        prev.map(s =>
          s.id_taglia === updatedSizes.id_taglia ? updatedSizes : s
        )
      );
    };

    const handleDeleted = (payload) => {
      if (!payload || typeof payload.id_taglia === 'undefined') return;
      setSizes(prev => prev.filter(s => s.id_taglia !== payload.id_taglia));
    };

    socket.on('size-added', handleAdded);
    socket.on('size-updated', handleUpdated);
    socket.on('size-deleted', handleDeleted);

    return () => {
      socket.off('size-added', handleAdded);
      socket.off('size-updated', handleUpdated);
      socket.off('size-deleted', handleDeleted);
    };
  }, [codice]);

  // Conditional rendering for loading or error state
  if (loading) return <p>Caricamento dettagli...</p>;
  if (!campione) return <p>Campione non trovato.</p>;

  return (
    <>
      <div className="outer-wrapper">
        <div className='sample-details-wrapper'>
          {/* Left half of the screen */}
          <div className='left-column'>
            {/* Sample details and edit box */}
            <div className='sample-details-box'>
              <h2>Dettagli campione</h2>

              {/* Image */}
              <img
                src={campione.immagine}
                alt={campione.codice}
              />
              {/* Change image form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fileInput = e.target.elements.immagine;
                  if (!fileInput.files.length) return;

                  const formData = new FormData();
                  formData.append('immagine', fileInput.files[0]);

                  const res = await fetch(`/api/campioni/${campione.codice}/immagine`, {
                    method: 'PUT',
                    body: formData,
                    credentials: 'include'
                  });

                  const data = await res.json();
                  if (res.ok) {
                    setCampione(prev => ({ ...prev, immagine: data.nuovaImmagine }));
                  } else {
                    alert(data.message || 'Errore durante aggiornamento immagine.');
                  }
                }}
              >
                <div className='file-upload'>
                  <input type="file" name="immagine" accept="image/*" required />
                  <button type="submit">Aggiorna immagine</button>
                </div>
              </form>

              {/* Change code form */}
              <div>
                <label>Codice</label><br></br>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditCode(value);
                    validateNewCode(value);
                  }}
                  placeholder="Nuovo codice"
                />
                <button
                  onClick={handleUpdateCode}
                  disabled={!!codeError}
                >
                  Salva nuovo codice
                </button>

                {codeError && (
                  <p style={{ marginTop: '0.5rem', color: 'red' }}>{codeError}</p>
                )}

                {feedbackCodice && !codeError && (
                  <p style={{ marginTop: '0.5rem', color: feedbackCodice.success ? 'green' : 'red' }}>
                    {feedbackCodice.message}
                  </p>
                )}
              </div>

              {/* Change description form */}
              <div>
                <label>Descrizione</label>
                <br />
                <textarea
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  rows={3}
                />
                <br />
                <button onClick={handleUpdateDescription} style={{ marginTop: '0.5rem' }}>
                  Salva descrizione
                </button>
                {feedbackDescrizione && (
                  <p style={{ marginTop: '0.5rem', color: feedbackDescrizione.success ? 'green' : 'red' }}>
                    {feedbackDescrizione.message}
                  </p>
                )}
              </div>
            </div>

            {/* Add new size box form */}
            <div className='sample-details-box'>
              <h2>Aggiungi nuova taglia</h2>
              <form onSubmit={handleSubmit}>
                <CreatableSelect
                  className="react-select-container"
                  classNamePrefix="react-select"
                  options={allBoxes}
                  value={form.numero_box ? { label: form.numero_box, value: form.numero_box } : null}
                  onChange={(selected) => {
                    const value = selected?.value || '';
                    const match = allBoxes.find(s => s.value === value);
                    const scaffale = match && scaffali.find(s => s.id_scaffale === match.id_scaffale);

                    setForm(prev => ({
                      ...prev,
                      numero_box: value,
                      id_scaffale: match?.id_scaffale || '',
                      sezione: match?.sezione || '',
                      ripiano: match?.ripiano || ''
                    }));

                    setScaffaleSelezionato(scaffale || null);
                    setExistingBoxSelected(!!match); // true se match trovato, altrimenti false
                  }}
                  onCreateOption={(inputValue) => {
                    setForm(prev => ({ ...prev, numero_box: inputValue }));
                    setScaffaleSelezionato(null);
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  isSearchable
                  placeholder="Numero box"
                  required
                />

                <input name="taglia" type="text" value={form.taglia} onChange={handleChange} placeholder="Taglia" required />
                <input
                  name="quantità"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.quantità}
                  onChange={e => {
                    // Allow only numbers:
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    handleChange({ target: { name: "quantità", value: val } });
                  }}
                  placeholder="Quantità"
                  required
                />


                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  value={form.id_scaffale ? { label: form.id_scaffale, value: form.id_scaffale } : null}
                  onChange={(selected) => {
                    const scaffale = scaffali.find(s => s.id_scaffale === selected.value);
                    setForm(prev => ({
                      ...prev,
                      id_scaffale: selected.value,
                      sezione: '',
                      ripiano: ''
                    }));
                    setScaffaleSelezionato(scaffale);
                  }}
                  options={scaffali.map(s => ({ label: s.id_scaffale, value: s.id_scaffale }))}
                  isDisabled={existingBoxSelected}
                  placeholder="Seleziona scaffale"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  required
                />

                {scaffaleSelezionato && (
                  <>
                    <Select
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={form.sezione ? { label: form.sezione, value: form.sezione } : null}
                      onChange={(selected) => setForm(prev => ({ ...prev, sezione: selected.value }))}
                      options={Array.from({ length: scaffaleSelezionato.numero_sezioni }, (_, i) => ({
                        label: `${i + 1}`, value: `${i + 1}`
                      }))}
                      isDisabled={existingBoxSelected}
                      placeholder="Seleziona sezione"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      required
                    />

                    <Select
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={form.ripiano ? { label: form.ripiano, value: form.ripiano } : null}
                      onChange={(selected) => setForm(prev => ({ ...prev, ripiano: selected.value }))}
                      options={Array.from({ length: scaffaleSelezionato.numero_ripiani }, (_, i) => ({
                        label: `${i + 1}`, value: `${i + 1}`
                      }))}
                      isDisabled={existingBoxSelected}
                      placeholder="Seleziona ripiano"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      required
                    />
                  </>
                )}

                <button type="submit">Aggiungi taglia</button>
              </form>
              {message && <p style={{ color: 'green', marginTop: '1rem' }}>{message}</p>}
            </div>
          </div>

          {/* Right half of the screen */}
          <div className='right-column'>
            {/* Single box for shelves and sizes */}
            <div className='sample-details-box'>
              <h2>Posizione negli scaffali</h2>

              {scaffali.every(scaffale => sizes.filter(s => s.id_scaffale === scaffale.id_scaffale).length === 0) ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>Nessuna taglia presente.</p>
              ) : (
                scaffali.map((scaffale) => {
                  const sizeInScaffale = sizes.filter(s => s.id_scaffale === scaffale.id_scaffale);
                  if (sizeInScaffale.length === 0) return null;

                  const cellMap = {};
                  sizeInScaffale.forEach((s) => {
                    const key = `${s.sezione}-${s.ripiano}`;
                    if (!cellMap[key]) cellMap[key] = new Set();
                    cellMap[key].add(s.numero_box);
                  });

                  return (
                    <div key={scaffale.id_scaffale} style={{ marginBottom: '2rem' }}>
                      <h3>{scaffale.id_scaffale}</h3>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th></th>
                              {Array.from({ length: scaffale.numero_sezioni }, (_, i) => (
                                <th key={i} style={{ width: '80px', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                  Sez. {i + 1}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: scaffale.numero_ripiani }, (_, rowIndex) => {
                              const ripiano = scaffale.numero_ripiani - rowIndex;

                              return (
                                <tr key={ripiano}>
                                  <td style={{ paddingRight: '8px', fontWeight: 'bold', minWidth: '70px', whiteSpace: 'nowrap' }}>
                                    Rip. {ripiano}
                                  </td>
                                  {Array.from({ length: scaffale.numero_sezioni }, (_, colIndex) => {
                                    const sezione = colIndex + 1;
                                    const key = `${sezione}-${ripiano}`;
                                    const boxes = cellMap[key];

                                    return (
                                      <td
                                        key={colIndex}
                                        style={{
                                          width: '60px',
                                          height: '40px',
                                          backgroundColor: boxes ? 'lightgreen' : 'white',
                                          fontSize: '0.75rem',
                                          padding: '2px',
                                          textAlign: 'center',
                                          cursor: boxes ? 'pointer' : 'default'
                                        }}
                                        onClick={() => {
                                          if (boxes) {
                                            alert(`Box presenti:\n\n${Array.from(boxes).join('\n')}`);
                                          }
                                        }}
                                      >
                                        {boxes ? (
                                          <span style={{ textDecoration: 'underline', color: '#0055aa' }}>
                                            Box presenti
                                          </span>
                                        ) : null}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Available sizes table */}
              <h2 >Taglie presenti</h2>
              {sizes.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>Nessuna taglia presente.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Box</th>
                        <th>Taglia</th>
                        <th>Quantità</th>
                        <th>Scaffale</th>
                        <th>Sezione</th>
                        <th>Ripiano</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizes.map((s, i) => (
                        <tr key={i}>
                          {editIndex === i ? (
                            <>
                              <td>
                                <input
                                  value={editData.numero_box}
                                  onChange={(e) => setEditData({ ...editData, numero_box: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  value={editData.taglia}
                                  onChange={(e) => setEditData({ ...editData, taglia: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={editData.quantità}
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setEditData({ ...editData, quantità: val });
                                  }}
                                />
                              </td>

                              <td>
                                <select
                                  value={editData.id_scaffale}
                                  onChange={(e) => {
                                    const selected = scaffali.find(s => s.id_scaffale === e.target.value);
                                    setEditData({
                                      ...editData,
                                      id_scaffale: e.target.value,
                                      sezione: '',
                                      ripiano: '',
                                      scaffaleSelezionato: selected
                                    });
                                  }}
                                >
                                  <option value="">Seleziona</option>
                                  {scaffali.map((s, i) => (
                                    <option key={i} value={s.id_scaffale}>{s.id_scaffale}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  value={editData.sezione}
                                  onChange={(e) => setEditData({ ...editData, sezione: e.target.value })}
                                  disabled={!editData.id_scaffale}
                                >
                                  <option value="">Sezione</option>
                                  {scaffali.find(s => s.id_scaffale === editData.id_scaffale) &&
                                    Array.from({
                                      length: scaffali.find(s => s.id_scaffale === editData.id_scaffale).numero_sezioni
                                    }, (_, i) => (
                                      <option key={i} value={i + 1}>{i + 1}</option>
                                    ))
                                  }
                                </select>
                              </td>
                              <td>
                                <select
                                  value={editData.ripiano}
                                  onChange={(e) => setEditData({ ...editData, ripiano: e.target.value })}
                                  disabled={!editData.id_scaffale}
                                >
                                  <option value="">Ripiano</option>
                                  {scaffali.find(s => s.id_scaffale === editData.id_scaffale) &&
                                    Array.from({
                                      length: scaffali.find(s => s.id_scaffale === editData.id_scaffale).numero_ripiani
                                    }, (_, i) => (
                                      <option key={i} value={i + 1}>{i + 1}</option>
                                    ))
                                  }
                                </select>
                              </td>
                              <td>
                                <button onClick={() => handleSave(i)} className="sample-details-button">Salva</button>
                                <button onClick={() => setEditIndex(null)} className="sample-details-button">Annulla</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{s.numero_box}</td>
                              <td>{s.taglia}</td>
                              <td>{s.quantità}</td>
                              <td>{s.id_scaffale}</td>
                              <td>{s.sezione}</td>
                              <td>{s.ripiano}</td>
                              <td>
                                <button onClick={() => {
                                  setEditIndex(i);
                                  setEditData({ ...s });
                                }}
                                  className='sample-details-button'> Modifica </button>

                                <button onClick={() => handleDelete(s.id_taglia)} className="sample-details-button" style={{ color: 'red' }}> Elimina </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      { /* Delete sample button */}
      <div style={{ textAlign: 'center' }}>
        <button
          className='delete-sample-btn'
          onClick={async () => {
            const conferma = window.confirm("Sei sicuro di voler eliminare il campione? Verranno rimosse anche tutte le taglie associate.");
            if (!conferma) return;

            const res = await fetch(`/api/campioni/${campione.codice}`, {
              method: 'DELETE',
              credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
              alert(data.message);
              window.location.href = '/';
            } else {
              alert(data.message || 'Errore durante l\'eliminazione del campione.');
            }
          }}
        >
          Elimina campione
        </button>
      </div>
    </>
  );
}

export default SampleDetail;