export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
export const AUTH_STORAGE_KEY = 'rpg_admin_auth_v1';

export function readSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = readSession()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response was not JSON
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function login(username, password) {
  const session = await request('/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
  writeSession(session);
  return session;
}

export function fetchMe() {
  return request('/auth/me');
}

export function fetchOverview() {
  return request('/admin/overview');
}

export function fetchUsers() {
  return request('/admin/users');
}

export function deleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}

export function fetchSaves() {
  return request('/admin/saves');
}

export function fetchBattleRuns() {
  return request('/admin/battle-runs');
}

export function fetchBattleRun(id) {
  return request(`/admin/battle-runs/${id}`);
}

export function fetchConfig() {
  return request('/admin/config');
}

export function updateMonster(id, payload) {
  return request(`/admin/monsters/${id}`, { method: 'PUT', body: payload });
}

export function updateMove(id, payload) {
  return request(`/admin/moves/${id}`, { method: 'PUT', body: payload });
}

export function updateConstant(key, value) {
  return request(`/admin/constants/${key}`, { method: 'PUT', body: { value } });
}

export function updateHero(id, payload) {
  return request(`/admin/heroes/${id}`, { method: 'PUT', body: payload });
}
