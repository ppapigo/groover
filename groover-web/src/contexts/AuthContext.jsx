import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { AUTH_CHANGED_EVENT, AUTH_EXPIRED_EVENT, authenticate, endSession, getAccessToken, getAuthEpoch, refreshSession } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const epoch = getAuthEpoch();
    setIsLoading(true);
    setError(null);
    const restore = getAccessToken()
      ? api.get('/auth/me').then(response => response.data.data)
      : refreshSession().then(session => session.user);
    restore
      .then(restored => { if (!cancelled && epoch === getAuthEpoch() && getAccessToken()) setUser(restored); })
      .catch(err => {
        if (!cancelled && epoch === getAuthEpoch() && err.response?.status !== 401 && err.code !== 'ERR_CANCELED') setError(err);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    const clearSession = () => { setUser(null); setError(null); queryClient.clear(); };
    const sessionChanged = () => { clearSession(); setAttempt(value => value + 1); };
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    window.addEventListener(AUTH_CHANGED_EVENT, sessionChanged);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
      window.removeEventListener(AUTH_CHANGED_EVENT, sessionChanged);
    };
  }, [queryClient]);

  async function signIn(path, data) {
    const session = await authenticate(path, data);
    queryClient.clear();
    setUser(session.user);
    setError(null);
    setIsLoading(false);
  }

  async function logout(all = false) {
    await endSession(all);
    setUser(null);
    setError(null);
    queryClient.clear();
  }

  return <AuthContext.Provider value={{
    user, isLoading, error, isAuthenticated: Boolean(user), logout,
    retry: () => setAttempt(value => value + 1),
    logoutAll: () => logout(true),
    login: data => signIn('/auth/login', data),
    register: data => signIn('/auth/register', data),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
