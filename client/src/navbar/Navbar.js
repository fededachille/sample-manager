import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import logo from './logo512.png';
import './Navbar.css';


/**
 * Navbar component: displays the navigation bar with conditional links based on user role.
 * - Shows public routes to all users
 * - Shows admin-only routes if the user is an admin
 * - Handles user dropdown with profile and logout actions
 */

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  // State to control visibility of the user dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ref to detect clicks outside the dropdown
  const dropdownRef = useRef(null);

  // List of navigation routes
  const routes = [
    { path: '/add-sample', label: 'Aggiungi campione' },
    { path: '/shippings/add', label: 'Crea spedizione' },
    { path: '/shippings', label: 'Cronologia spedizioni' },
    { path: '/add-user', label: 'Aggiungi utente', adminOnly: true },
    { path: '/manage-users', label: "Gestisci utenti", adminOnly: true }
  ];

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>

        {/* Public links */}
        {routes
          .filter(r => !r.adminOnly)
          .map(r => (
            <Link key={r.path} to={r.path}>
              <button className="navbar-button">{r.label}</button>
            </Link>
          ))}

        {/* Admin-only links */}
        {user?.autorizzazioni === 'admin' && (
          <>
            <div className="navbar-separator" />
            <Link to="/add-user">
              <button className="navbar-button">Aggiungi utente</button>
            </Link>
            <Link to="/manage-users">
              <button className="navbar-button">Gestisci utenti</button>
            </Link>
          </>
        )}

      </div>

      {/* User avatar and dropdown */}
      <div className="navbar-user" ref={dropdownRef}>
        <div
          className="navbar-avatar"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {/* First letter of the user's name or fallback 'U' */}
          {user?.nome?.charAt(0).toUpperCase() || 'U'}
        </div>

        {dropdownOpen && (
          <div className="navbar-dropdown">
            <button
              className="navbar-dropdown-item"
              onClick={() => {
                setDropdownOpen(false);
                navigate('/user-info');
              }}
            >
              Profilo utente
            </button>
            <button
              className="navbar-dropdown-item"
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;