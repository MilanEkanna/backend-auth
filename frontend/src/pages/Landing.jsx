import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaShieldAlt, FaUserPlus, FaSignInAlt, FaSyncAlt, FaSignOutAlt, FaUserCircle,
  FaArrowRight, FaLock, FaCode, FaBolt, FaDatabase, FaCookieBite, FaKey,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const API_ENDPOINTS = [
  {
    method: 'POST', path: '/api/auth/register', desc: 'Create a new account',
    color: '#34d399', icon: <FaUserPlus />, points: ['Validates fields', 'Hashes password with bcrypt', 'Issues access + refresh tokens'],
  },
  {
    method: 'POST', path: '/api/auth/login', desc: 'Authenticate existing user',
    color: '#60a5fa', icon: <FaSignInAlt />, points: ['Compares password via bcrypt.compare', 'Returns user + JWT pair', 'Sets httpOnly refresh cookie'],
  },
  {
    method: 'POST', path: '/api/auth/refresh', desc: 'Rotate refresh token',
    color: '#fbbf24', icon: <FaSyncAlt />, points: ['Detects token reuse (revokes family)', 'Rotates refresh token in same family', 'Issues fresh access token'],
  },
  {
    method: 'GET', path: '/api/auth/me', desc: 'Fetch current user profile',
    color: '#c084fc', icon: <FaUserCircle />, points: ['Protected — needs Bearer token', 'Verifies JWT + user existence', 'Returns safe user data'],
  },
  {
    method: 'POST', path: '/api/auth/logout', desc: 'Revoke refresh token',
    color: '#f472b6', icon: <FaSignOutAlt />, points: ['Revokes presented refresh token', 'Clears httpOnly cookie', 'One device only'],
  },
  {
    method: 'POST', path: '/api/auth/logout-all', desc: 'Revoke all sessions',
    color: '#fb7185', icon: <FaShieldAlt />, points: ['Protected — needs Bearer token', 'Revokes ALL refresh tokens', 'Logs out every device'],
  },
];

const FEATURES = [
  { icon: <FaLock />, title: 'JWT Access Tokens', desc: 'Short-lived (15m) signed tokens that prove your identity on every request.' },
  { icon: <FaCookieBite />, title: 'httpOnly Refresh Cookie', desc: 'A 7-day refresh token stored securely in an httpOnly cookie that JS can\u2019t read.' },
  { icon: <FaSyncAlt />, title: 'Token Rotation + Reuse Detection', desc: 'Every refresh issues a new token. Reusing an old one revokes the whole family.' },
  { icon: <FaDatabase />, title: 'JSON File Persistence', desc: 'Users & refresh token families are stored in simple JSON files — perfect for learning.' },
  { icon: <FaCode />, title: 'bcrypt Password Hashing', desc: 'Passwords are never stored in plain text — bcrypt hashes them with 10 salt rounds.' },
  { icon: <FaBolt />, title: 'Auto Token Refresh', desc: 'The frontend interceptor silently refreshes an expired access token before it fails.' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } },
};

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page landing-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <motion.div className="hero-content" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="hero-badge">
            <FaShieldAlt /> Full-Stack JWT Authentication
          </motion.div>

          <motion.h1 variants={item}>
            Secure Auth, <span className="gradient-text">Beautifully</span> Explained
          </motion.h1>

          <motion.p variants={item} className="hero-subtitle">
            A complete Express + React authentication flow with JWT access tokens,
            rotating refresh tokens, httpOnly cookies, reuse detection, and a live
            learning console that shows you <em>exactly what happens at every stage</em>.
          </motion.p>

          <motion.div variants={item} className="hero-cta">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard <FaArrowRight />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started <FaArrowRight />
                </Link>
                <Link to="/login" className="btn btn-ghost btn-lg">
                  <FaSignInAlt /> I already have an account
                </Link>
              </>
            )}
          </motion.div>

          <motion.div variants={item} className="hero-stats">
            <div><strong>6</strong><span>REST Endpoints</span></div>
            <div><strong>2</strong><span>JWT Tokens</span></div>
            <div><strong>15m</strong><span>Access Expiry</span></div>
            <div><strong>7d</strong><span>Refresh Expiry</span></div>
          </motion.div>
        </motion.div>
      </section>

      {/* API Endpoints */}
      <section className="section">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <span className="section-tag">REST API</span>
          <h2>Every Endpoint, Visualized</h2>
          <p>Hover each card to see what the backend does under the hood.</p>
        </motion.div>

        <motion.div className="endpoint-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {API_ENDPOINTS.map((ep) => (
            <motion.div key={ep.path} variants={item} className="endpoint-card">
              <div className="endpoint-method" style={{ background: `${ep.color}1a`, color: ep.color }}>
                {ep.method}
              </div>
              <div className="endpoint-icon" style={{ color: ep.color }}>{ep.icon}</div>
              <code className="endpoint-path">{ep.path}</code>
              <p className="endpoint-desc">{ep.desc}</p>
              <ul className="endpoint-points">
                {ep.points.map((p) => (
                  <li key={p}><FaKey /> {p}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="section">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <span className="section-tag">Why it matters</span>
          <h2>Security Concepts Built-In</h2>
          <p>Everything you need to understand modern authentication.</p>
        </motion.div>

        <motion.div className="features-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={item} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
        >
          <FaLock className="cta-icon" />
          <h2>Ready to see it in action?</h2>
          <p>
            Watch the Learning Console at the bottom of the screen stream every step
            — token generation, password hashing, cookie handling, rotation & more.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">Create an account <FaArrowRight /></Link>
            <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

