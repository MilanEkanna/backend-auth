/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, setAccessToken, clearAccessToken } from '../api/client';
import learningLogger from '../utils/learningLogger';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- helpers ------------------------------------------------------------
  const adoptSession = (data) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
  };

  const clearSession = () => {
    setUser(null);
    setAccessToken(null);
    clearAccessToken();
  };

  // ---- register -----------------------------------------------------------
  const register = useCallback(async ({ name, email, password }) => {
    learningLogger.info('📦 Preparing registration payload { name, email, password }', 'register');
    learningLogger.request('POST /api/auth/register → sending request...', 'register');
    const res = await authApi.post('/register', { name, email, password });
    learningLogger.response('✓ 201 Created — user persisted in users.json', 'register');
    learningLogger.token('🔑 Access token (JWT) issued — expires in ~15m', 'register');
    learningLogger.token('🔄 Refresh token issued — stored in httpOnly cookie', 'register');
    adoptSession(res.data.data);
    learningLogger.success('🎉 Registration complete. You are now logged in!', 'register');
    return res.data.data;
  }, []);

  // ---- login --------------------------------------------------------------
  const login = useCallback(async ({ email, password }) => {
    learningLogger.info('📦 Preparing login payload { email, password }', 'login');
    learningLogger.request('POST /api/auth/login → sending request...', 'login');
    const res = await authApi.post('/login', { email, password });
    learningLogger.response('✓ 200 OK — bcrypt.compare verified password', 'login');
    learningLogger.token('🔑 Access token (JWT) issued — expires in ~15m', 'login');
    learningLogger.token('🔄 Refresh token issued — stored in httpOnly cookie', 'login');
    adoptSession(res.data.data);
    learningLogger.success('🚀 Login successful. Welcome back!', 'login');
    return res.data.data;
  }, []);

  // ---- refresh ------------------------------------------------------------
  const refreshToken = useCallback(async () => {
    learningLogger.info('🔄 Sending httpOnly refresh cookie → /api/auth/refresh', 'refresh');
    learningLogger.request('POST /api/auth/refresh → token rotation...', 'refresh');
    const res = await authApi.post('/refresh');
    learningLogger.response('✓ 200 OK — old refresh token marked as rotated', 'refresh');
    learningLogger.token('🔁 New refresh token issued in same family (rotation)', 'refresh');
    learningLogger.token('🔑 New access token issued', 'refresh');
    adoptSession(res.data.data);
    learningLogger.success('♻️ Token pair rotated successfully.', 'refresh');
    return res.data.data;
  }, []);

  // ---- fetch me -----------------------------------------------------------
  const fetchMe = useCallback(async () => {
    learningLogger.info('👤 Fetching profile → GET /api/auth/me', 'me');
    learningLogger.request('GET /api/auth/me → Authorization: Bearer <accessToken>', 'me');
    const res = await authApi.get('/me');
    learningLogger.response('✓ 200 OK — protect middleware verified the access token', 'me');
    setUser(res.data.data.user);
    learningLogger.success('👤 User profile fetched from backend.', 'me');
    return res.data.data.user;
  }, []);

  // ---- logout -------------------------------------------------------------
  const logout = useCallback(async () => {
    learningLogger.info('👋 Logging out → POST /api/auth/logout', 'logout');
    learningLogger.request('POST /api/auth/logout → revoking refresh token...', 'logout');
    try {
      await authApi.post('/logout');
      learningLogger.response('✓ 200 OK — refresh token revoked & cookie cleared', 'logout');
    } catch {
      learningLogger.warn('⚠ Logout request failed but we clear local state anyway.', 'logout');
    }
    clearSession();
    learningLogger.success('🚪 You have been logged out.', 'logout');
  }, []);

  // ---- logout all ---------------------------------------------------------
  const logoutAll = useCallback(async () => {
    learningLogger.info('👋 Logging out everywhere → POST /api/auth/logout-all', 'logout-all');
    learningLogger.request('POST /api/auth/logout-all → protected route, needs Bearer token', 'logout-all');
    try {
      await authApi.post('/logout-all');
      learningLogger.response('✓ 200 OK — ALL refresh tokens revoked for this user', 'logout-all');
    } catch {
      learningLogger.warn('⚠ logout-all failed.', 'logout-all');
    }
    clearSession();
    learningLogger.success('🔒 Logged out from all devices.', 'logout-all');
  }, []);

  // ---- session-expired listener -------------------------------------------
  useEffect(() => {
    const onSessionExpired = () => {
      clearSession();
      learningLogger.error('⏳ Session expired — please log in again.', 'session');
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, []);

  // ---- boot: try to restore session via refresh endpoint -------------------
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      learningLogger.server('🌐 Contacting backend /api/auth/refresh to restore session...', 'boot');
      try {
        const res = await authApi.post('/refresh');
        if (!active) return;
        learningLogger.token('🔑 Restored session — new access token issued.', 'boot');
        adoptSession(res.data.data);
      } catch {
        if (!active) return;
        learningLogger.warn('ℹ️ No active session. You can log in or register.', 'boot');
      } finally {
        if (active) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    loading,
    register,
    login,
    refreshToken,
    fetchMe,
    logout,
    logoutAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

