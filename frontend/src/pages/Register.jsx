import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserPlus, FaSpinner, FaArrowRight, FaSignInAlt, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import learningLogger from '../utils/learningLogger';

const PASSWORD_RULES = {
  length: (p) => p.length >= 6,
  number: (p) => /\d/.test(p),
  upper: (p) => /[A-Z]/.test(p),
  lower: (p) => /[a-z]/.test(p),
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
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

    // --- client-side validation with learning messages ---
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError('All fields are required.');
      learningLogger.error('✗ Client validation failed — all fields are required.', 'register');
      setLoading(false);
      return;
    }
    if (!PASSWORD_RULES.length(form.password)) {
      setError('Password must be at least 6 characters.');
      learningLogger.error('✗ Password must be at least 6 characters.', 'register');
      setLoading(false);
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      learningLogger.error('✗ Passwords do not match.', 'register');
      setLoading(false);
      return;
    }
    learningLogger.info('✅ Client validation passed — all fields OK.', 'register');

try {
      await register({ name: form.name, email: form.email, password: form.password });
      learningLogger.success('🎉 Account created & logged in. Navigating to dashboard.', 'register');
      navigate('/dashboard');
    } catch (err) {
      const raw = err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      const msg = typeof raw === 'string' ? raw : (raw?.message || JSON.stringify(raw));
      setError(msg);
      learningLogger.error(`✗ ${msg}`, 'register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <motion.div
        className="auth-card auth-card-lg"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 16 }}
      >
        <div className="auth-head">
          <div className="auth-icon"><FaUserPlus /></div>
          <h1>Create Account</h1>
          <p>Join and experience the full auth flow</p>
        </div>

        {error && (
          <motion.div className="auth-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input id="name" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handleChange} autoComplete="name" />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <div className="input-wrap">
              <FaEnvelope className="input-icon" />
              <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
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
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="password-rules">
              {Object.entries({ length: '6+ characters', number: 'a number', upper: 'uppercase', lower: 'lowercase' }).map(([key, label]) => (
                <span key={key} className={PASSWORD_RULES[key](form.password) ? 'rule ok' : 'rule'}>
                  <FaCheckCircle /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="confirm">Confirm Password</label>
            <div className="input-wrap">
              <FaLock className="input-icon" />
              <input
                id="confirm"
                name="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          </div>

          <motion.button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} whileTap={{ scale: 0.98 }}>
            {loading ? (
              <>
                <FaSpinner className="spin" /> Creating account…
              </>
            ) : (
              <>
                Sign Up <FaArrowRight />
              </>
            )}
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link"><FaSignInAlt /> Log in</Link></p>
        </div>

        <div className="auth-learning">
          <strong>💡 What happens when you register?</strong>
          <ol>
            <li>Client validates name, email & password strength</li>
            <li><code>POST /api/auth/register</code> is sent</li>
            <li>Backend checks the email is not taken</li>
            <li>Password is hashed with bcrypt (10 rounds)</li>
            <li>User is saved to <code>users.json</code></li>
            <li>Access + refresh JWT pair is issued</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
}

