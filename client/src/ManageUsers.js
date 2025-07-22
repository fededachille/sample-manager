import React, { useEffect, useState, useCallback } from 'react';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import socket from './socket';
import './css/ManageUsers.css';

/**
 * ManageUsers component
 * - Admin-only interface for managing all users except the currently logged-in one
 * - Supports real-time updates via socket (add/delete/update role)
 * - Allows role changes, user deletion, and password reset
 */

function ManageUsers() {

    const navigate = useNavigate(); // Navigate between routes

    /* Check current session and redirect if not admin */
    useEffect(() => {
        fetch('/api/check-session', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (!data.loggedIn || data.user.autorizzazioni !== 'admin') {
                    navigate('/');
                } else {
                    setUserLoggedIn(data.user);
                }
            });
    }, [navigate]);

    const [users, setUsers] = useState([]); // List of users (excluding self)
    const [userLoggedIn, setUserLoggedIn] = useState(null); // Logged-in user info
    const [message, setMessage] = useState(null); // Action feedback
    const [editedRoles, setEditedRoles] = useState({}); // Temporary role edits
    const [loading, setLoading] = useState(true); // Loading state

    // Role selection options
    const roleOptions = [
        { value: 'user', label: 'user' },
        { value: 'admin', label: 'admin' }
    ];

    /* Fetch all users except the current one */

    const fetchUsers = useCallback(() => {
        fetch('/api/users', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setUsers(data.filter(u => u.id !== userLoggedIn?.id));
                    setEditedRoles({});
                }
            })
            .finally(() => setLoading(false));
    }, [userLoggedIn]);

    /* Load users once admin session is confirmed */
    useEffect(() => {
        if (userLoggedIn) {
            setLoading(true);
            fetchUsers();
        }
    }, [userLoggedIn, fetchUsers]);

    /*  Handle real-time updates for users via socket */
    useEffect(() => {
        if (!userLoggedIn) return;

        socket.on('user-added', (nuovoUtente) => {
            setUsers(prev => [...prev, nuovoUtente]);
        });

        socket.on('user-deleted', (id) => {
            setUsers(prev => prev.filter(u => u.id !== id));
        });

        socket.on('role-updated', ({ id, nuovoRuolo }) => {
            setUsers(prev =>
                prev.map(u =>
                    u.id === parseInt(id) ? { ...u, autorizzazioni: nuovoRuolo } : u
                )
            );
        });

        socket.on('user-renamed', ({ id, nuovoNome }) => {
            setUsers(prev =>
                prev.map(u =>
                    u.id === id ? { ...u, nome: nuovoNome } : u
                )
            );
        });

        return () => {
            socket.off('user-added');
            socket.off('user-deleted');
            socket.off('role-updated');
            socket.off('user-renamed');
        };
    }, [userLoggedIn]);

    /* Handle user deletion with confirmation */
    const handleDelete = (id, name) => {
        const confirm = window.confirm(`Sei sicuro di voler eliminare l'utente "${name}"?`);
        if (!confirm) return;

        fetch(`/api/users/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        }).then(res =>
            res.json().then(data => {
                setMessage({ text: data.message, success: res.ok });
                fetchUsers();
            })
        ).catch(() => {
            setMessage({ text: 'Errore durante eliminazione utente.', success: false });
        });
    };

    /* Handle role selection change (temporary until confirmed) */
    const handleSelectChange = (id, newRole) => {
        setEditedRoles(prev => ({ ...prev, [id]: newRole }));
    };

    /* Confirm role update for a specific user */
    const handleConfirmRoleChange = (id) => {
        const newRole = editedRoles[id];

        fetch(`/api/users/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ autorizzazioni: newRole })
        }).then(res =>
            res.json().then(data => {
                setMessage({ text: data.message, success: res.ok });
                fetchUsers();
            })
        ).catch(() => {
            setMessage({ text: 'Errore durante aggiornamento ruolo.', success: false });
        });
    };

    /* Handle password reset with confirmation */
    const handleResetPassword = (id, name) => {
        const confirm = window.confirm(`Sei sicuro di voler reimpostare la password per "${name}"?`);
        if (!confirm) return;

        fetch(`/api/users/${id}/reset-password`, {
            method: 'PUT',
            credentials: 'include'
        }).then(res =>
            res.json().then(data => {
                setMessage({ text: data.message, success: res.ok });
            })
        ).catch(() => {
            setMessage({ text: 'Errore durante il reset della password.', success: false });
        });
    };

    return (
        <div className="outer-wrapper">
            <div className="manage-users-container">
                <h2>Gestione utenti</h2>

                {/* No users to manage */}
                {!loading && users.length === 0 ? (
                    <div className="empty-message">
                        <p>Non sono registrati altri utenti nel sistema.</p>
                    </div>
                ) : (
                    users.length > 0 && (
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Ruolo</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const currentRole = u.autorizzazioni;
                                    const editedRole = editedRoles[u.id] ?? currentRole;
                                    const roleChanged = editedRole !== currentRole;

                                    return (
                                        <tr key={u.id}>
                                            <td><p className="name-p">{u.nome}</p></td>
                                            <td>
                                                <Select
                                                    value={{ value: editedRole, label: editedRole }}
                                                    onChange={(option) => handleSelectChange(u.id, option.value)}
                                                    options={roleOptions}
                                                    className="role-select"
                                                    classNamePrefix="select"
                                                    isSearchable={false}
                                                    menuPortalTarget={document.body}
                                                    menuPosition="fixed"
                                                />
                                            </td>
                                            <td>
                                                {roleChanged && (
                                                    <button
                                                        className="user-action-button"
                                                        onClick={() => handleConfirmRoleChange(u.id)}
                                                    >
                                                        Conferma
                                                    </button>
                                                )}
                                                <button
                                                    className="user-action-button"
                                                    onClick={() => handleDelete(u.id, u.nome)}
                                                    style={{ marginLeft: roleChanged ? '0.5rem' : '0' }}
                                                >
                                                    Elimina
                                                </button>
                                                <button
                                                    className="user-action-button"
                                                    onClick={() => handleResetPassword(u.id, u.nome)}
                                                    style={{ marginLeft: '0.5rem' }}
                                                >
                                                    Resetta Password
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )
                )}

                {/* Feedback message */}
                {message && (
                    <p style={{ color: message.success ? 'green' : 'red', marginTop: '1rem' }}>
                        {message.text}
                    </p>
                )}
            </div>
        </div>
    );
}

export default ManageUsers;