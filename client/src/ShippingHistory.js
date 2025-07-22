import React, { useEffect, useState } from 'react';
import socket from './socket';
import Select from 'react-select';
import './css/ShippingHistory.css';

/**
 * ShippingHistory component
 * - Displays a list of all shipments
 * - Allows filtering by recipient, courier, user, sample code, and date
 * - Listens to real-time shipment creation via socket
 */

function ShippingHistory() {

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

  const [spedizioni, setSpedizioni] = useState([]); // List of shipments
  const [loading, setLoading] = useState(true); // Initial loading state

  // Filter states
  const [filtroDestinatario, setFiltroDestinatario] = useState('');
  const [filtroCorriere, setFiltroCorriere] = useState('');
  const [filtroUtente, setFiltroUtente] = useState('');
  const [filtroCodice, setFiltroCodice] = useState('');
  const [filtroData, setFiltroData] = useState('');

  // Fetch all shipments on mount
  useEffect(() => {
    fetch('/api/spedizioni', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSpedizioni(data);
        setLoading(false);
      });
  }, []);

  // Listen for real-time creation of new shipments and username updates
  useEffect(() => {
    socket.on('shipping-created', (nuovaSpedizione) => {
      setSpedizioni(prev => [nuovaSpedizione, ...prev]);
    });

    socket.on('user-renamed', ({ id, nuovoNome }) => {
      setSpedizioni(prev =>
        prev.map(sped =>
          sped.id_utente === id ? { ...sped, utente: nuovoNome } : sped
        )
      );
    });

    return () => {
      socket.off('shipping-created');
      socket.off('user-renamed');
    };
  }, []);

  // Extract unique values for dropdown filters
  const destinatari = [...new Set(spedizioni.map(s => s.destinatario))];
  const corrieri = [...new Set(spedizioni.map(s => s.corriere))];
  const utenti = [...new Set(spedizioni.map(s => s.utente))];
  const codiciCampione = [...new Set(spedizioni.flatMap(s => s.dettagli.map(d => d.codice)))];

  // Reset all filters
  const resetFiltri = () => {
    setFiltroDestinatario('');
    setFiltroCorriere('');
    setFiltroUtente('');
    setFiltroCodice('');
    setFiltroData('');
  };

  // Check if a shipment matches all selected filters
  const matchesFiltro = (s) => {
    const matchDest = !filtroDestinatario || s.destinatario === filtroDestinatario;
    const matchCorr = !filtroCorriere || s.corriere === filtroCorriere;
    const matchUser = !filtroUtente || s.utente === filtroUtente;
    const matchCodice = !filtroCodice || s.dettagli.some(d => d.codice === filtroCodice);
    const matchData = !filtroData || new Date(s.data).toISOString().slice(0, 10) === filtroData;

    return matchDest && matchCorr && matchUser && matchCodice && matchData;
  };

  // Sort and filter shipments
  const sortedSpedizioni = [...spedizioni].sort((a, b) => new Date(b.data) - new Date(a.data));
  const matchingSpedizioni = sortedSpedizioni.filter(matchesFiltro);
  const nonMatchingSpedizioni = spedizioni.filter(s => !matchesFiltro(s));

  /* Render a single shipment card with details */
  const renderSpedizione = (s) => (
    <div key={s.id} className='shipping-card'>
      <p><strong>Destinatario:</strong> {s.destinatario}</p>
      <p><strong>Data:</strong> {new Date(s.data).toLocaleString()}</p>
      <p><strong>Corriere:</strong> {s.corriere}</p>
      <p><strong>Creato da:</strong> {s.utente}</p>

      {s.dettagli.length > 0 ? (
        <table className='shipping-table'>
          <thead>
            <tr>
              <th>Codice campione</th>
              <th>Taglia</th>
              <th>Quantità</th>
            </tr>
          </thead>
          <tbody>
            {s.dettagli.map((d, i) => (
              <tr key={i}>
                <td align='center'>{d.codice}</td>
                <td align='center'>{d.taglia}</td>
                <td align='center'>{d.quantità}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className='empty-detail'>Nessun dettaglio disponibile.</p>
      )}
    </div>
  );

  if (loading) return <p>Caricamento spedizioni...</p>;

  return (
    <div className="outer-wrapper">
      <div className="shipping-history-container">
        <h2>Cronologia spedizioni</h2>

        {/* Filter section */}
        <div className="filter-section">
          <div className="filter-group">
            <label>Destinatario</label>
            <Select
              options={destinatari.map(d => ({ value: d, label: d }))}
              value={filtroDestinatario ? { value: filtroDestinatario, label: filtroDestinatario } : null}
              onChange={(selected) => setFiltroDestinatario(selected?.value || '')}
              isClearable
              placeholder="Tutti"
            />
          </div>
          <div className="filter-group">
            <label>Corriere</label>
            <Select
              options={corrieri.map(c => ({ value: c, label: c }))}
              value={filtroCorriere ? { value: filtroCorriere, label: filtroCorriere } : null}
              onChange={(selected) => setFiltroCorriere(selected?.value || '')}
              isClearable
              placeholder="Tutti"
            />
          </div>
          <div className="filter-group">
            <label>Utente</label>
            <Select
              options={utenti.map(u => ({ value: u, label: u }))}
              value={filtroUtente ? { value: filtroUtente, label: filtroUtente } : null}
              onChange={(selected) => setFiltroUtente(selected?.value || '')}
              isClearable
              placeholder="Tutti"
            />
          </div>
          <div className="filter-group">
            <label>Codice campione</label>
            <Select
              options={codiciCampione.map(c => ({ value: c, label: c }))}
              value={filtroCodice ? { value: filtroCodice, label: filtroCodice } : null}
              onChange={(selected) => setFiltroCodice(selected?.value || '')}
              isClearable
              placeholder="Tutti"
            />
          </div>
          <div className="filter-group">
            <label>Data</label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="date-input"
            />
          </div>
        </div>

        {/* Reset filters button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button onClick={resetFiltri} className="reset-button">
            Reset filtri
          </button>
        </div>

        {/* Matching shipments */}
        {spedizioni.length === 0 ? (
          <p style={{ textAlign: 'center' }}>
            Nessuna spedizione registrata al momento.
          </p>
        ) : matchingSpedizioni.length > 0 ? (
          matchingSpedizioni.map(renderSpedizione)
        ) : (
          <p style={{ textAlign: 'center' }}>
            Nessuna spedizione trovata con i filtri selezionati.
          </p>
        )}

        {/* Show non-matching shipments (below separator) */}
        {nonMatchingSpedizioni.length > 0 && (
          <>
            <hr className='results-separator' />
            {nonMatchingSpedizioni.map(renderSpedizione)}
          </>
        )}
      </div>
    </div>
  );

}

export default ShippingHistory;