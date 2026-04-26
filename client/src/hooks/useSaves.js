import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api.js';

/**
 * Lists and mutates the signed-in player's saved runs.
 *
 * Ownership split with useGameState:
 *   - useGameState owns the live in-memory hero / run.
 *   - useSaves is the persistence layer on top — it serializes a
 *     snapshot into the server DB, and deserializes one back into a
 *     shape useGameState can load.
 */
export default function useSaves({ isAuthenticated }) {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSaves((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSaves();
      setSaves(data.saves);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const create = useCallback(async (payload) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.createSave(payload);
      setSaves((list) => [data.save, ...list]);
      return data.save;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const update = useCallback(async (id, payload) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.updateSave(id, payload);
      setSaves((list) => list.map((s) => (s.id === id ? data.save : s)));
      return data.save;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteSave(id);
      setSaves((list) => list.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    saves,
    loading,
    busy,
    error,
    refresh,
    create,
    update,
    remove,
  };
}
