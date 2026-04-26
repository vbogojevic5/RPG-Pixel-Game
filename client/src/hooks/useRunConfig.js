import { useCallback, useState } from 'react';
import { getRunConfig } from '../services/api.js';

/**
 * Fetches and caches the run config from the server.
 * Called once when the player starts a new run.
 */
export default function useRunConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRunConfig();
      setConfig(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load run config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setConfig(null);
    setError(null);
  }, []);

  return { config, loading, error, load, reset };
}
