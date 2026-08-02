import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTerminal, FaTrash, FaChevronDown, FaChevronUp, FaCircle, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaKey, FaServer, FaArrowRight } from 'react-icons/fa';
import learningLogger from '../utils/learningLogger';

const ICONS = {
  info: <FaInfoCircle />,
  success: <FaCheckCircle />,
  request: <FaArrowRight />,
  response: <FaArrowRight />,
  error: <FaExclamationTriangle />,
  warn: <FaExclamationTriangle />,
  token: <FaKey />,
  server: <FaServer />,
  system: <FaTerminal />,
};

const COLORS = {
  info: 'var(--console-info)',
  success: 'var(--console-success)',
  request: 'var(--console-request)',
  response: 'var(--console-response)',
  error: 'var(--console-error)',
  warn: 'var(--console-warn)',
  token: 'var(--console-token)',
  server: 'var(--console-server)',
  system: 'var(--console-muted)',
};

const STAGE_LABELS = {
  boot: 'Boot',
  register: 'Register',
  login: 'Login',
  refresh: 'Refresh',
  logout: 'Logout',
  'logout-all': 'Logout All',
  me: 'Profile',
  interceptor: 'Interceptor',
  session: 'Session',
  theme: 'Theme',
  general: 'General',
};

function Entry({ entry }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -14, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="console-entry"
      style={{ '--entry-color': COLORS[entry.type] || 'var(--console-muted)' }}
    >
      <span className="console-time">{entry.timestamp}</span>
      <span className="console-icon" style={{ color: COLORS[entry.type] || 'var(--console-muted)' }}>
        {ICONS[entry.type] || <FaCircle />}
      </span>
      <span className="console-badge">{STAGE_LABELS[entry.stage] || entry.stage}</span>
      <span className="console-message">{entry.message}</span>
    </motion.div>
  );
}

export default function LearningConsole({ initialOpen = true }) {
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState('live'); // live | all
  const bodyRef = useRef(null);

  useEffect(() => {
    const unsub = learningLogger.subscribe((entry) => {
      setEntries((prev) => (entry.clear ? [] : [...prev, entry]));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries, open]);

  const visibleEntries = tab === 'live' ? entries.slice(-40) : entries;

  return (
    <motion.div
      className="console"
      initial={false}
      animate={{ y: open ? 0 : 0 }}
    >
      <div className="console-header" onClick={() => setOpen((o) => !o)}>
        <div className="console-title">
          <FaTerminal />
          <span>Learning Console</span>
          <span className="console-live-dot" />
        </div>
        <div className="console-actions">
          <button
            className="console-clear"
            title="Clear console"
            onClick={(e) => {
              e.stopPropagation();
              learningLogger.clear();
            }}
          >
            <FaTrash />
          </button>
          <span className="console-chevron">{open ? <FaChevronDown /> : <FaChevronUp />}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="console-tabs">
              <button
                className={`console-tab ${tab === 'live' ? 'active' : ''}`}
                onClick={() => setTab('live')}
              >
                Live Stream
              </button>
              <button
                className={`console-tab ${tab === 'all' ? 'active' : ''}`}
                onClick={() => setTab('all')}
              >
                Full Log
              </button>
            </div>
            <div className="console-body" ref={bodyRef}>
              {visibleEntries.length === 0 ? (
                <div className="console-empty">
                  <FaTerminal />
                  <p>Waiting for auth events…</p>
                  <p className="console-empty-hint">Try logging in or registering to see every stage.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visibleEntries.map((entry) => (
                    <Entry key={entry.id} entry={entry} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

