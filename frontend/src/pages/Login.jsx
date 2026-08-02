import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaSpinner, FaArrowRight, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import learningLogger from '../utils/learningLogger';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation with learning messages
    if (!form.email || !form.password) {
      setError('Both email and password are required.');
      learningLogger.error('✗ Client validation failed — missing email or password.', 'login');
      setLoading(false);
      return;
    }
    learningLogger.info('✅ Client validation passed — fields are filled.', 'login');

try {
      await login({ email: form.email, password: form.password });
      learningLogger.success('🚀 Navigated to dashboard.', 'login');
      navigate('/dashboard');
    } catch (err) {
      const raw = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed. Please try again.';
      const msg = typeof raw === 'string' ? raw : (raw?.message || JSON.stringify(raw));
      setError(msg);
      learningLogger.error(`✗ ${msg}`, 'login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 16 }}
      >
        <div className="auth-head">
          <div className="auth-icon"><FaSignInAlt /></div>
          <h1>Welcome Back</h1>
          <p>Log in to your account to continue</p>
        </div>

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <div className="input-wrap">
              <FaEnvelope className="input-icon" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <FaLock className="input-icon" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <FaSpinner className="spin" /> Authenticating…
              </>
            ) : (
              <>
                Log In <FaArrowRight />
              </>
            )}
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>Don&apos;t have an account? <Link to="/register" className="auth-link"><FaUserPlus /> Create one</Link></p>
        </div>

        <div className="auth-learning">
          <strong>💡 What happens when you log in?</strong>
          <ol>
            <li>Client validation checks the fields</li>
            <li><code>POST /api/auth/login</code> is sent</li>
            <li>Backend finds user & verifies bcrypt hash</li>
            <li>Access + refresh JWT pair is issued</li>
            <li>Refresh token stored in httpOnly cookie</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
}

