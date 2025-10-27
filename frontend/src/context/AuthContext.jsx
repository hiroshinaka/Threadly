import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({
  user: null,
  loggedIn: false,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const loggedIn = Boolean(user);

  const refresh = async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await res.json();
      if (data && data.ok && data.user) {
        setUser(data.user);
        return data.user;
      }
      setUser(null);
      return null;
    } catch (err) {
      console.error('Auth refresh failed', err);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // initial fetch of session
    (async () => {
      await refresh(); // this waits for the refresh to complete before loading the page
      setInitialized(true);
    })();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data && data.ok && data.user) {
        setUser(data.user);
        return { ok: true, user: data.user };
      }
      return data || { ok: false };
    } catch (err) {
      console.error('Login failed', err);
      return { ok: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setUser(null);
      return data;
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
      return { ok: false };
    }
  };

  if (!initialized) {
    return null; // can replace w/ loading component if we want 
  }

  return (
    <AuthContext.Provider value={{ user, loggedIn, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
