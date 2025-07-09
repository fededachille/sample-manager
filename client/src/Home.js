import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import socket from './socket';
import './css/Home.css';

/**
 * Home component
 * - Displays all samples (campioni) from the backend
 * - Supports real-time updates via socket (add, update, delete)
 * - Includes a search bar to filter samples by code or description
 */

function Home({ user }) {
  const [campioni, setCampioni] = useState([]); // List of samples
  const [loading, setLoading] = useState(true); // Initial loading state
  const [searchTerm, setSearchTerm] = useState(''); // Search input state

  // Fetch samples and set up socket listeners on mount
  useEffect(() => {
    // Initial fetch of sample data
    fetch('/api/campioni', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCampioni(data);
        setLoading(false);
      });

    // Add sample in real-time
    socket.on('sample-added', (newSample) => {
      setCampioni(prev => {
        const esiste = prev.some(c => c.codice === newSample.codice);
        if (esiste) return prev;
        return [...prev, newSample];
      });
    });

    // Remove deleted sample
    socket.on('sample-deleted', ({ codice }) => {
      setCampioni(prev => prev.filter(c => c.codice !== codice));
    });

    // Update sample (either renamed or edited)
    socket.on('sample-updated', (updated) => {
      setCampioni(prev =>
        prev.map(c =>
          c.codice === updated.oldCodice
            ? { ...c, codice: updated.nuovoCodice }
            : c.codice === updated.codice
              ? { ...c, ...updated }
              : c
        )
      );
    });

    return () => {
      socket.off('sample-added');
      socket.off('sample-updated');
      socket.off('sample-deleted');
    };
  }, []);

  // Function to check if a sample matches the search term
  const matchesSearch = (campione) => {
    const term = searchTerm.toLowerCase();
    return (
      campione.codice.toLowerCase().includes(term) ||
      (campione.descrizione && campione.descrizione.toLowerCase().includes(term))
    );
  };

  // Samples that match the search query
  const matchingCampioni = searchTerm
    ? campioni.filter(matchesSearch)
    : campioni;

  // Samples that don't match (used for visual separation)
  const nonMatchingCampioni = searchTerm
    ? campioni.filter(c => !matchesSearch(c))
    : [];

  // Renders a single sample card (with fallback image)
  const renderCampione = (campione) => (
    <Link
      to={`/campione/${campione.codice}`}
      key={campione.codice}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className='sample-card'>
        <img
          src={campione.immagine}
          alt={`Campione ${campione.codice}`}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/_missing_image.png';
          }}
        />
        <p>{campione.codice}</p>
      </div>
    </Link>
  );

  // Show loading screen
  if (loading) {
    return (
      <div className='home-wrapper'>
        <div className='empty-message'>
          <p>Caricamento campioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='home-wrapper'>
      {/* Search bar */}
      <div className='search'>
        <input
          type="text"
          placeholder="Cerca per codice o descrizione..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sample grid */}
      <div className='sample-grid-wrapper'>
        <div className='sample-grid'>
          {/* No matches found */}
          {searchTerm && matchingCampioni.length === 0 && (
            <div className='empty-message'>
              <p>Nessun campione corrisponde alla ricerca.</p>
            </div>
          )}

          {/* Matching samples */}
          {matchingCampioni.map(renderCampione)}

          {/* Separator for non-matching samples (optional visual aid) */}
          {searchTerm && nonMatchingCampioni.length > 0 && (
            <>
              <hr className='results-separator' />
              {nonMatchingCampioni.map(renderCampione)}
            </>
          )}

          {/* No samples at all */}
          {!searchTerm && campioni.length === 0 && (
            <div className='empty-message'>
              <p>Sembra che non ci sia ancora nessun campione salvato.</p>
              <Link to="/add-sample">
                <button>Aggiungi campione</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;