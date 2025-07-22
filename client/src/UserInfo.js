import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/UserInfo.css';

/**
 * UserInfo component
 * - Allows the logged-in user to update their username and password
 * - Redirects to home if the user is not authenticated
 */

function UserInfo() {
    const navigate = useNavigate(); // Navigate between routes

    // Fetch current session and user data on mount
    useEffect(() => {
        fetch('/api/check-session', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.loggedIn) {
                    setUser(data.user);
                    setNewName(data.user.nome);
                } else {
                    navigate('/');
                }
            });
    }, [navigate]);

    const [user, setUser] = useState(null); // Current user
    const [newName, setNewName] = useState(''); // New username input
    const [oldPassword, setOldPassword] = useState(''); // Old password input
    const [newPassword, setNewPassword] = useState(''); // New password input
    const [feedback, setFeedback] = useState(null);  // Feedback message

    // Handle name update request
    const handleNameUpdate = async () => {
        if (newName === user.nome) {
            setFeedback({ message: 'Il nuovo nome è uguale a quello attuale.', success: false });
            return;
        }

        try {
            const res = await fetch('/api/user/update-name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nome: newName })
            });

            const data = await res.json();
            setFeedback({ message: data.message, success: res.ok });

            // Update user info in session
            if (res.ok) {
                const sessionRes = await fetch('/api/check-session', { credentials: 'include' });
                const sessionData = await sessionRes.json();
                if (sessionData.loggedIn) {
                    setUser(sessionData.user);
                }
            }
        } catch {
            setFeedback({ message: 'Errore durante aggiornamento nome utente.', success: false });
        }
    };

    // Handle password update request
    const handlePasswordUpdate = async () => {
        if (!oldPassword || !newPassword) {
            setFeedback({ message: 'Inserisci la vecchia e la nuova password.', success: false });
            return;
        }

        if (oldPassword === newPassword) {
            setFeedback({ message: 'La nuova password deve essere diversa da quella attuale.', success: false });
            return;
        }

        try {
            const res = await fetch('/api/user/update-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();
            setFeedback({ message: data.message, success: res.ok });

            if (res.ok) {
                setOldPassword('');
                setNewPassword('');
            }
        } catch {
            setFeedback({ message: 'Errore durante aggiornamento password.', success: false });
        }
    };

    if (!user) return null;

    return (
        <div className='outer-wrapper'>
            <div className="user-info-container">
                <h2>Profilo utente</h2>

                {/* Name update section */}
                <div className="user-info-block">
                    <label>Nome utente</label>
                    <input
                        className="user-info-input"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <button className="user-info-button" onClick={handleNameUpdate}>
                        Aggiorna nome
                    </button>
                </div>

                {/* Password update section */}
                <div className="user-info-block">
                    <label>Vecchia password</label>
                    <input
                        className="user-info-input"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                    />

                    <label>Nuova password</label>
                    <input
                        className="user-info-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <button className="user-info-button" onClick={handlePasswordUpdate}>
                        Aggiorna password
                    </button>
                </div>

                {/* Feedback message */}
                {feedback && (
                    <p
                        className="user-info-message"
                        style={{ color: feedback.success ? 'green' : 'red', marginTop: '1rem' }}
                    >
                        {feedback.message}
                    </p>
                )}
            </div>
        </div>
    );
}

export default UserInfo;