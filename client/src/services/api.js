import { API_BASE_URL, AUTH_STORAGE_KEY } from '../constants/gameConstants.js';

/** HTTP client: attaches JWT from localStorage on authenticated routes. */

function getToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // body wasn't JSON
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  // 204 No Content would break res.json(); current server always returns JSON.
  return res.json();
}

// --- Config / battle ---------------------------------------------------------

export function getRunConfig() {
  return request('/run/config');
}

/** Base64-encoded battle state, per the spec (GET, no body). */
export function getMonsterMove(battleState) {
  const json = JSON.stringify(battleState);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return request(`/battle/monster-move?state=${encodeURIComponent(b64)}`);
}

export function recordBattleResult(payload) {
  return request('/battle/results', { method: 'POST', body: payload });
}

// --- Auth --------------------------------------------------------------------

export function register(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

export function fetchMe() {
  return request('/auth/me');
}

// --- Saves -------------------------------------------------------------------

export function listSaves() {
  return request('/saves');
}

export function createSave(payload) {
  return request('/saves', { method: 'POST', body: payload });
}

export function updateSave(id, payload) {
  return request(`/saves/${id}`, { method: 'PUT', body: payload });
}

export function deleteSave(id) {
  return request(`/saves/${id}`, { method: 'DELETE' });
}
