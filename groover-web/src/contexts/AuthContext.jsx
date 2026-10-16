import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { AUTH_EXPIRED_EVENT, getAccessToken, setAccessToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    setIsLoading(true);
    setError(null);
    if (!token) setIsLoading(false);
    else api.get('/auth/me', { signal: controller.signal })
      .then(response => { if (getAccessToken() === token) setUser(response.data.data); })
      .catch(err => {
        if (!controller.signal.aborted && err.response?.status !== 401) setError(err);
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const clearSession = () => { setUser(null); setError(null); queryClient.clear(); };
    const storageChanged = (event) => {
      if (event.key === 'accessToken' || event.key === null) { clearSession(); setAttempt(value => value + 1); }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
      window.removeEventListener('storage', storageChanged);
    };
  }, [queryClient]);

  async function authenticate(path, data) {
    const response = await api.post(path, data);
    queryClient.clear();
    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    setError(null);
    setIsLoading(false);
  }

  function logout() {
    // The API uses stateless JWTs; logging out discards the local session.
    setAccessToken(null);
    setUser(null);
    setError(null);
    queryClient.clear();
  }

  return <AuthContext.Provider value={{
    user, isLoading, error, isAuthenticated: Boolean(user), logout,
    retry: () => setAttempt(value => value + 1),
    login: data => authenticate('/auth/login', data),
    register: data => authenticate('/auth/register', data),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
