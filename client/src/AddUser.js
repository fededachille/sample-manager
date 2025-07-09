import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import './css/AddUser.css';

/**
 * AddUser component:
 * - Renders a form to create a new user
 * - Accessible only to admin users
 * - Uses a select component to assign user permissions
 */

function AddUser() {
  const [form, setForm] = useState({ nome: '', autorizzazioni: 'user' }); // Form state for new user creation
  const [message, setMessage] = useState(''); // Feedback message displayed after form submission
  const [loading, setLoading] = useState(true); // Loading state while fetching data or validating session
  const navigate = useNavigate(); // Navigate between routes

  // Check if the current user is an admin
  useEffect(() => {
    fetch('/api/check-session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.loggedIn || data.user.autorizzazioni !== 'admin') {
          navigate('/'); // Redirect non-admin users to home
        } else {
          setLoading(false);
        }
      })
      .catch(() => navigate('/')); // Handle fetch error by redirecting
  }, [navigate]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Utente aggiunto con successo. La password iniziale è "azira".');
        setForm({ nome: '', autorizzazioni: 'user' }); // Reset form
      } else {
        setMessage(data.message || 'Errore durante la creazione dell’utente.');
      }
    } catch (error) {
      setMessage('Errore di rete o del server.');
    }
  };

  // Don't render the form until loading is finished
  if (loading) return null;

  return (
    <div className="outer-wrapper">
      <div className="add-user-container">
        <h2>Aggiungi nuovo utente</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          {/* Set username for new user */}
          <input
            className="add-user-input"
            placeholder="Nome utente"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />

          {/* Select new user permissions */}
          <div className="permissions-group">
            <label className="permissions-label">Autorizzazioni</label>
            <Select
              options={[
                { value: 'user', label: 'user' },
                { value: 'admin', label: 'admin' }
              ]}
              value={{ value: form.autorizzazioni, label: form.autorizzazioni }}
              onChange={(selected) => setForm({ ...form, autorizzazioni: selected?.value || 'user' })}
              isClearable={false}
              className="permissions-select"
            />
          </div>
          <button type="submit" className="add-user-button">Crea utente</button>

          {/* Success or error message */}
          {message && <p className="success-message">{message}</p>}
        </form>
      </div>
    </div>
  );

}

export default AddUser;