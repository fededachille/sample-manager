import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Login.css';

/**
 * Login component
 * - Displays a login form with username and password fields
 * - Sends login request to the backend
 * - On success: calls onLoginSuccess and redirects to home
 * - On failure: displays error message
 */

function Login({ onLoginSuccess }) {
  const [nome, setNome] = useState(''); // Username input
  const [password, setPassword] = useState(''); // Password input
  const [errorMessage, setErrorMessage] = useState(''); // Error message state
  const navigate = useNavigate(); // Navigation hook

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ nome, password })
    });

    const data = await response.json();

    if (response.ok) {
      onLoginSuccess(data.user);  // Pass user info to parent component
      navigate('/'); // Redirect to home
    } else {
      setErrorMessage(data.message); // Show error message
    }
  };

  return (
    <div className='outer-wrapper'>
      <div className='login-form'>
        <img src='/logo512.png' alt='Logo' />

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          <label>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Accedi</button>
        </form>
        {/* Error message */}
        {errorMessage && <p>{errorMessage}</p>}
      </div>
    </div>
  );
}

export default Login;