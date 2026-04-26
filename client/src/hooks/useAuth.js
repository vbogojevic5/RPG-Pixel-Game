import { useCallback, useEffect, useState } from 'react';
import { AUTH_STORAGE_KEY } from '../constants/gameConstants.js';
import * as api from '../services/api.js';

/**
 * Authentication state for the whole app.
 *
 * Token + player are persisted in localStorage under AUTH_STORAGE_KEY.
 * On mount we re-hydrate from storage and revalidate with /auth/me, so
 * expired or revoked tokens are dropped cleanly.
 */

function readStored() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStored(value) {
  if (value === null) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export default function useAuth() {
  const [player, setPlayer] = useState(() => readStored()?.player ?? null);
  const [checking, setChecking] = useState(() => Boolean(readStored()?.token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // On mount, verify any cached token is still valid.
  useEffect(() => {
    let cancelled = false;
    const cached = readStored();
    const task = cached?.token
      ? api
          .fetchMe()
          .then((data) => {
            if (!cancelled) setPlayer(data.player);
          })
          .catch(() => {
            if (cancelled) return;
            writeStored(null);
            setPlayer(null);
          })
      : Promise.resolve();
    task.finally(() => {
      if (!cancelled) setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setSubmitting(true);
    setError(null);
    try {
      const { token, player: p } = await api.login(username, password);
      writeStored({ token, player: p });
      setPlayer(p);
      return p;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setSubmitting(true);
    setError(null);
    try {
      const { token, player: p } = await api.register(username, password);
      writeStored({ token, player: p });
      setPlayer(p);
      return p;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    writeStored(null);
    setPlayer(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    player,
    isAuthenticated: Boolean(player),
    checking,
    submitting,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
