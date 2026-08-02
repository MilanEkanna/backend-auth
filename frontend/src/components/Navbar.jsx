import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaSun, FaMoon, FaUserCircle, FaSignOutAlt, FaTachometerAlt, FaHome } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <FaShieldAlt className="brand-icon" />
          <span>Auth<span className="brand-accent">Flow</span></span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FaHome /> <span>Home</span>
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FaTachometerAlt /> <span>Dashboard</span>
            </NavLink>
          )}
        </div>

        <div className="nav-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          {isAuthenticated ? (
            <div className="nav-user">
              <FaUserCircle className="nav-avatar" />
              <span className="nav-username">{user?.name}</span>
              <button className="icon-btn danger" onClick={handleLogout} title="Logout">
                <FaSignOutAlt />
              </button>
            </div>
          ) : (
            <div className="nav-auth-btns">
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

