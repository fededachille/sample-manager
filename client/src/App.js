import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import socket from './socket';

import Login from './Login';
import Home from './Home';
import SampleDetails from './SampleDetails';
import Navbar from './navbar/Navbar';
import AddSample from './AddSample';
import ShippingHistory from './ShippingHistory';
import CreateShipping from './CreateShipping';
import AddUser from './AddUser';
import UserInfo from './UserInfo';
import ManageUsers from './ManageUsers';

/**
 * Main App component
 * - Handles session check and routing
 * - Shows loading state and server offline message if needed
 * - Initializes socket listeners (force logout, role change)
 */

function App() {
  const [user, setUser] = useState(null); // Logged-in user info
  const [loading, setLoading] = useState(true); // Initial loading state
  const [serverOffline, setServerOffline] = useState(false); // Server unreachable
  const [dbConnected, setDbConnected] = useState(true); // DB connection


  // Check if user is logged in on first render
  useEffect(() => {
    fetch('/api/check-session', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setServerOffline(true);
        setLoading(false);
      });
  }, []);

  // If the server is offline, retry every 5 seconds
  useEffect(() => {
    if (!serverOffline) return;

    const interval = setInterval(() => {
      fetch('/api/check-session', { credentials: 'include' })
        .then(res => {
          if (res.ok) {
            window.location.reload(); // Reload when server is back online
          }
        })
        .catch(() => { });
    }, 5000);

    return () => clearInterval(interval);
  }, [serverOffline]);

  // Register socket events after user logs in
  useEffect(() => {
    if (user?.id) {
      socket.emit('register', user.id);

      socket.on('force-logout', (msg) => {
        alert(msg);
        setUser(null);
        window.location.href = '/';
      });

      socket.on('role-changed', (newRole) => {
        setUser(prev => ({ ...prev, autorizzazioni: newRole }));
        alert(`Il tuo ruolo è cambiato in "${newRole}".`);
      });

      return () => {
        socket.off('force-logout');
        socket.off('role-changed');
      };
    }
  }, [user]);

  // Listen for database connection status updates from the backend
  useEffect(() => {
    socket.on('db-status', (data) => {
      setDbConnected(data.connected);
    });

    return () => {
      socket.off('db-status');
    };
  }, []);

  // Callback after successful login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Logout and clear user session
  const handleLogout = async () => {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (res.ok) {
      setUser(null);
    }
  };

  return (
    <>
      <div className="wrapper">
        <div className="gradient gradient-1"></div>
        <div className="gradient gradient-2"></div>
        <div className="gradient gradient-3"></div>
      </div>

      {!dbConnected && (
        <div className="db-overlay">
          <div className="db-overlay-content">
            <div className="spinner"></div>
            <p>Connessione al database persa. Attendere il ripristino...</p>
          </div>
        </div>
      )}


      {/* Show loading or offline message */}
      {loading ? (
        <p>Caricamento...</p>
      ) : serverOffline ? (
        <div className="db-overlay">
          <div className="db-overlay-content">
            <div className="spinner"></div>
            <p>Connessione al server persa. Attendere il ripristino...</p>
          </div>
        </div>
      ) : (
        <Router>
          {!user ? (
            <Routes>
              <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            </Routes>
          ) : (
            <>
              <Navbar user={user} onLogout={handleLogout} />
              <Routes>
                <Route path="/" element={<Home user={user} />} />
                <Route path="/campione/:codice" element={<SampleDetails user={user} />} />
                <Route path="/add-sample" element={<AddSample />} />
                <Route path="/shippings" element={<ShippingHistory />} />
                <Route path="/shippings/add" element={<CreateShipping />} />
                <Route path="/add-user" element={<AddUser />} />
                <Route path="/user-info" element={<UserInfo />} />
                <Route path="/manage-users" element={<ManageUsers />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </>
          )}
        </Router>
      )}

    </>
  );
}

export default App;