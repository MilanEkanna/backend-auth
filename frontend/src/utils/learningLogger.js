/**
 * Learning Logger
 * ---------------
 * A tiny pub/sub logger that records every stage of an auth flow so the
 * Learning Console can display "what is happening at which stage".
 *
 * Every log entry has:
 *   - id:        unique id
 *   - type:      info | success | request | response | error | warn | token | server
 *   - stage:     which high-level stage the message belongs to
 *   - message:   human readable message
 *   - timestamp: when it happened
 */

let listeners = [];
let history = [];

const TYPES = {
  info: 'info',
  success: 'success',
  request: 'request',
  response: 'response',
  error: 'error',
  warn: 'warn',
  token: 'token',
  server: 'server',
};

let counter = 0;

function makeEntry(type, message, stage) {
  counter += 1;
  return {
    id: counter,
    type,
    message,
    stage: stage || 'general',
    timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
  };
}

function emit(entry) {
  history = [...history, entry];
  if (history.length > 200) {
    history = history.slice(history.length - 200);
  }
  listeners.forEach((fn) => fn(entry));
}

const learningLogger = {
  TYPES,
  getHistory() {
    return history;
  },
  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
  clear() {
    history = [];
    listeners.forEach((fn) => fn({ type: 'system', message: 'console cleared', timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }), clear: true }));
  },
  info(message, stage) {
    emit(makeEntry(TYPES.info, message, stage));
  },
  success(message, stage) {
    emit(makeEntry(TYPES.success, message, stage));
  },
  warn(message, stage) {
    emit(makeEntry(TYPES.warn, message, stage));
  },
  error(message, stage) {
    emit(makeEntry(TYPES.error, message, stage));
  },
  request(message, stage) {
    emit(makeEntry(TYPES.request, message, stage));
  },
  response(message, stage) {
    emit(makeEntry(TYPES.response, message, stage));
  },
  token(message, stage) {
    emit(makeEntry(TYPES.token, message, stage));
  },
  server(message, stage) {
    emit(makeEntry(TYPES.server, message, stage));
  },
};

export default learningLogger;

