import React, { useState } from 'react';
import './css/AddSample.css';

/**
 * AddSample component: form to add a new sample with optional image upload.
 * - Handles text and file input
 * - Shows live image preview
 * - Sends data to backend using FormData
 */

function AddSample() {
  // Form state for codice, descrizione, and image file
  const [form, setForm] = useState({
    codice: '',
    descrizione: '',
    immagine: null
  });

  // State to display server response messages
  const [message, setMessage] = useState(null);

  // Handle text input changes (codice, descrizione)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle image file selection and set preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm(prev => ({ ...prev, immagine: file }));

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result); // Show image preview
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: codice is required
    if (!form.codice) {
      setMessage({ message: 'Il codice è obbligatorio.', success: false });
      return;
    }

    // Prepare FormData to send text and file
    const data = new FormData();
    data.append('codice', form.codice);
    data.append('descrizione', form.descrizione);
    data.append('immagine', form.immagine);

    try {
      const res = await fetch('/api/campioni', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });

      const result = await res.json();
      setMessage({ message: result.message, success: res.ok });

      // Reset form and preview if successful
      if (res.ok) {
        setForm({ codice: '', descrizione: '', immagine: null });
        setPreview(null);
        document.getElementById('immagine').value = '';
      }
    } catch (err) {
      setMessage({ message: 'Errore nella richiesta.', success: false });
    }
  };

  // State for image preview
  const [preview, setPreview] = useState(null);

  return (
    <div className="outer-wrapper">
      <div className="add-sample-wrapper">
        <h2>Aggiungi un nuovo campione</h2>
        <form className="add-sample-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="codice"
            placeholder="Codice campione"
            value={form.codice}
            onChange={handleChange}
            required
          />
          <textarea
            name="descrizione"
            placeholder="Descrizione"
            value={form.descrizione}
            onChange={handleChange}
          />
          <div className="file-upload">
            <label>Immagine</label>
            <input
              type="file"
              id="immagine"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          {/* Image preview (if selected) */}
          {preview && (
            <div className="image-preview">
              <p align='center'><i>Anteprima immagine</i></p>
              <img src={preview} alt="Anteprima immagine" className="preview-img" />
            </div>
          )}

          <button type="submit">Aggiungi</button>

          {/* Feedback message */}
          {message && (
            <p className="form-message" style={{ color: message.success ? 'green' : 'red' }}>
              {message.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );

}

export default AddSample;