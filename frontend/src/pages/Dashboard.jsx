import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaUserCircle, FaEnvelope, FaIdBadge, FaCalendarAlt, FaKey, FaSyncAlt,
  FaSignOutAlt, FaShieldAlt, FaCheckCircle, FaSpinner, FaCopy, FaFileCode,
  FaRegClock, FaUserCheck, FaBolt, FaCookieBite,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function useCountdown(expiryEpochMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, expiryEpochMs - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { mins, secs, now };
}

function TokenCard({ token, title, subtitle, accent }) {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(() => (token ? decodeJWT(token) : null), [token]);

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard?.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      className="token-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ '--accent': accent }}
    >
      <div className="token-head">
        <div className="token-title">
          <span className="token-icon" style={{ color: accent }}><FaKey /></span>
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        <button className="copy-btn" onClick={handleCopy} title="Copy token">
          {copied ? <FaCheckCircle /> : <FaCopy />}
        </button>
      </div>

      {token ? (
        <>
          <div className="token-jwt">
            {token.split('.').map((part, i) => (
              <span key={i} className={`jwt-part jwt-${i}`}>{part}</span>
            ))}
          </div>
          {payload && (
            <div className="token-payload">
              {Object.entries(payload).map(([k, v]) => (
                <div key={k} className="payload-row">
                  <span className="payload-key">{k}</span>
                  <span className="payload-val">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="token-empty">No token yet — log in to generate one.</div>
      )}
    </motion.div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user, accessToken, refreshToken, fetchMe, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [profileUpdatedAt, setProfileUpdatedAt] = useState(null);
  const [error, setError] = useState('');

  const decoded = useMemo(() => (accessToken ? decodeJWT(accessToken) : null), [accessToken]);
  const expiryEpoch = decoded?.exp ? decoded.exp * 1000 : 0;
  const { mins, secs, now } = useCountdown(expiryEpoch);
  const expiryPct = decoded?.iat && decoded?.exp ? ((now - decoded.iat * 1000) / ((decoded.exp - decoded.iat) * 1000)) * 100 : 0;

  const run = async (label, fn) => {
    setBusy(label);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const handleRefresh = () => run('refresh', async () => {
    await refreshToken();
  });

  const handleFetchMe = () => run('me', async () => {
    await fetchMe();
    setProfileUpdatedAt(new Date().toLocaleTimeString());
  });

  const handleLogout = () => run('logout', async () => {
    await logout();
    navigate('/login');
  });

  const handleLogoutAll = () => run('logout-all', async () => {
    await logoutAll();
    navigate('/login');
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-glow dashboard-glow-1" />
      <div className="dashboard-glow dashboard-glow-2" />

      <motion.div
        className="dashboard-head"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Dashboard</h1>
        <p>Your session, tokens, and everything the API knows about you.</p>
      </motion.div>

      {error && (
        <motion.div className="auth-error dashboard-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      <div className="dashboard-grid">
        {/* Profile card */}
        <motion.section
          className="card profile-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="card-head">
            <h2><FaUserCircle /> Your Profile</h2>
            <span className="badge-success"><FaCheckCircle /> Authenticated</span>
          </div>

          {user ? (
            <div className="profile-body">
              <div className="profile-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <h3 className="profile-name">{user.name}</h3>
              <p className="profile-email">{user.email}</p>

              <div className="profile-info">
                <InfoRow icon={<FaIdBadge />} label="User ID" value={user.id} />
                <InfoRow icon={<FaEnvelope />} label="Email" value={user.email} />
                {user.createdAt && <InfoRow icon={<FaCalendarAlt />} label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />}
              </div>

              {profileUpdatedAt && (
                <p className="profile-updated">Last fetched from /me: {profileUpdatedAt}</p>
              )}

              <div className="profile-actions">
                <motion.button
                  className="btn btn-secondary"
                  onClick={handleFetchMe}
                  disabled={!!busy}
                  whileTap={{ scale: 0.97 }}
                >
                  {busy === 'me' ? <FaSpinner className="spin" /> : <FaUserCheck />} Fetch /me
                </motion.button>
              </div>
            </div>
          ) : (
            <p>No user data.</p>
          )}
        </motion.section>

        {/* Token status card */}
        <motion.section
          className="card token-status-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-head">
            <h2><FaBolt /> Access Token Status</h2>
          </div>

          {decoded ? (
            <div className="token-status-body">
              <div className="expiry-ring-wrap">
                <div className="expiry-ring" style={{ '--pct': `${Math.min(100, expiryPct)}%` }}>
                  <div className="expiry-ring-inner">
                    <FaRegClock />
                    <strong>{mins}:{String(secs).padStart(2, '0')}</strong>
                    <span>until expiry</span>
                  </div>
                </div>
              </div>

              <div className="token-details">
                <InfoRow icon={<FaKey />} label="Type" value={decoded.type || 'access'} />
                <InfoRow icon={<FaIdBadge />} label="Subject (sub)" value={decoded.sub} />
                <InfoRow icon={<FaUserCircle />} label="Name" value={decoded.name} />
                <InfoRow icon={<FaEnvelope />} label="Email" value={decoded.email} />
              </div>
            </div>
          ) : (
            <div className="token-status-empty">
              <FaRegClock />
              <p>No active access token.</p>
              <p>Log in or refresh to generate one.</p>
            </div>
          )}
        </motion.section>

        {/* Action buttons */}
        <motion.section
          className="card actions-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="card-head">
            <h2><FaBolt /> API Actions</h2>
          </div>
          <div className="actions-body">
            <div className="action-item">
              <p className="action-desc"><code>POST /api/auth/refresh</code> — rotate tokens & get a fresh pair</p>
              <motion.button className="btn btn-primary" onClick={handleRefresh} disabled={!!busy} whileTap={{ scale: 0.97 }}>
                {busy === 'refresh' ? <FaSpinner className="spin" /> : <FaSyncAlt />} Refresh Token
              </motion.button>
            </div>

            <div className="action-item">
              <p className="action-desc"><code>POST /api/auth/logout</code> — revoke this refresh token</p>
              <motion.button className="btn btn-secondary" onClick={handleLogout} disabled={!!busy} whileTap={{ scale: 0.97 }}>
                {busy === 'logout' ? <FaSpinner className="spin" /> : <FaSignOutAlt />} Logout
              </motion.button>
            </div>

            <div className="action-item">
              <p className="action-desc"><code>POST /api/auth/logout-all</code> — revoke ALL refresh tokens</p>
              <motion.button className="btn btn-danger" onClick={handleLogoutAll} disabled={!!busy} whileTap={{ scale: 0.97 }}>
                {busy === 'logout-all' ? <FaSpinner className="spin" /> : <FaShieldAlt />} Logout All Devices
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Access token full view */}
        <motion.section
          className="card tokens-full-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-head">
            <h2><FaKey /> Access Token (JWT)</h2>
          </div>
          <TokenCard token={accessToken} title="Current Access Token" subtitle="Decoded payload below" accent="var(--accent)" />
        </motion.section>

        {/* Refresh token explanation card */}
        <motion.section
          className="card refresh-explainer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="card-head">
            <h2><FaCookieBite /> Refresh Token</h2>
          </div>
          <div className="explainer-body">
            <div className="cookie-visual">
              <div className="cookie-inner">
                <FaCookieBite />
              </div>
              <span>httpOnly</span>
            </div>
            <div className="explainer-text">
              <p>
                The refresh token is <strong>not visible to JavaScript</strong>. It is stored
                in an <code>httpOnly</code> cookie automatically sent by your browser with
                every <code>/api/auth/*</code> request.
              </p>
              <ul>
                <li><FaCheckCircle /> Auto-rotated on every refresh</li>
                <li><FaCheckCircle /> Reuse detection revokes the whole family</li>
                <li><FaCheckCircle /> 7-day expiry</li>
                <li><FaCheckCircle /> Protects against XSS token theft</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Learning note */}
        <motion.section
          className="card learning-note-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-head">
            <h2><FaFileCode /> What you just saw</h2>
          </div>
          <div className="learning-note-body">
            <p>
              Every action you take here streams detailed logs into the <strong>Learning Console</strong>{' '}
              at the bottom of the screen. Watch how:
            </p>
            <ol>
              <li><strong>Refresh Token</strong> → old token marked rotated, new pair issued in the same family</li>
              <li><strong>Fetch /me</strong> → Bearer token verified, fresh user data returned</li>
              <li><strong>Logout</strong> → refresh token revoked & cookie cleared</li>
              <li><strong>Logout All</strong> → entire token family revoked (all devices)</li>
            </ol>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

