const BASE = import.meta.env.VITE_API_BASE;

// ── TOKEN HELPERS ──
function getAccessToken()  { return sessionStorage.getItem('access_token'); }
function getRefreshToken() { return sessionStorage.getItem('refresh_token'); }

export function saveTokens(tokens) {
  sessionStorage.setItem('access_token',  tokens.access);
  sessionStorage.setItem('refresh_token', tokens.refresh);
}

export function clearTokens() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('voter');
}

export function saveVoter(voter) {
  sessionStorage.setItem('voter', JSON.stringify(voter));
}

export function getVoter() {
  const v = sessionStorage.getItem('voter');
  return v ? JSON.parse(v) : null;
}

// ── BASE REQUEST ──
async function request(endpoint, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  let res = await fetch(`${BASE}${endpoint}`, config);

  // Token expired — try refresh
  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
    } else {
      clearTokens();
      window.location.href = '/';
      return null;
    }
  }

  return res;
}

async function tryRefresh() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${BASE}/auth/token/refresh/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh }),
  });

  if (res.ok) {
    const data = await res.json();
    sessionStorage.setItem('access_token', data.access);
    return true;
  }
  return false;
}

// ── AUTH ──
export const authAPI = {
  register: (data) =>
    request('/auth/register/', 'POST', data, false),

  adminRegister: (data) =>           
    request('/auth/admin/register/', 'POST', data, false),

  login: (national_id, password) =>
    request('/auth/login/', 'POST', { national_id, password }, false),

  logout: () =>
    request('/auth/logout/', 'POST', { refresh: getRefreshToken() }),

  profile: () =>
    request('/auth/profile/'),

  changePassword: (data) =>
    request('/auth/change-password/', 'POST', data),
};

// ── ELECTIONS ──
export const electionsAPI = {
  list: () =>
    request('/elections/', 'GET', null, false),

  active: () =>
    request('/elections/active/', 'GET', null, false),

  get: (id) =>
    request(`/elections/${id}/`, 'GET', null, false),

  summary: (id) =>
    request(`/elections/${id}/summary/`, 'GET', null, false),

  create: (data) =>
    request('/elections/', 'POST', data),

  update: (id, data) =>
    request(`/elections/${id}/`, 'PATCH', data),

  updateStatus: (id, status) =>
    request(`/elections/${id}/status/`, 'PATCH', { status }),

  delete: (id) =>
    request(`/elections/${id}/`, 'DELETE'),
};

// ── CANDIDATES ──
export const candidatesAPI = {
  list: (electionId, constituencyId) => {
    let url = '/candidates/?';
    if (electionId)     url += `election=${electionId}&`;
    if (constituencyId) url += `constituency=${constituencyId}`;
    return request(url, 'GET', null, false);
  },

  get: (id) =>
    request(`/candidates/${id}/`, 'GET', null, false),

  byElection: (electionId, constituencyId) => {
    let url = `/elections/${electionId}/candidates/`;
    if (constituencyId) url += `?constituency=${constituencyId}`;
    return request(url, 'GET', null, false);
  },

  create: (data) =>
    request('/candidates/', 'POST', data),

  update: (id, data) =>
    request(`/candidates/${id}/`, 'PATCH', data),

  delete: (id) =>
    request(`/candidates/${id}/`, 'DELETE'),
};

// ── CONSTITUENCIES ──
export const constituenciesAPI = {
  list: () =>
    request('/constituencies/', 'GET', null, false),

  get: (id) =>
    request(`/constituencies/${id}/`, 'GET', null, false),

  byRegion: (region) =>
    request(`/constituencies/region/${region}/`, 'GET', null, false),

  create: (data) =>
    request('/constituencies/', 'POST', data),

  update: (id, data) =>
    request(`/constituencies/${id}/`, 'PATCH', data),

  delete: (id) =>
    request(`/constituencies/${id}/`, 'DELETE'),
};

// ── VOTES ──
export const votesAPI = {
  cast: (election_id, candidate_id) =>
    request('/votes/cast/', 'POST', { election_id, candidate_id }),

  receipt: (id) =>
    request(`/votes/receipt/${id}/`),

  hasVoted: (electionId) =>
    request(`/votes/has-voted/${electionId}/`),

  results: (electionId) =>
    request(`/votes/results/${electionId}/`, 'GET', null, false),

  constituencyResults: (electionId, constituencyId) =>
    request(`/votes/results/${electionId}/constituency/${constituencyId}/`, 'GET', null, false),

  myHistory: () =>
    request('/votes/my-history/'),

  auditLog: (electionId) => {
    const url = electionId
      ? `/votes/log/?election=${electionId}`
      : '/votes/log/';
    return request(url);
  },
};

// ── ADMIN ──
export const adminAPI = {
  voters: (status) => {
    const url = status
      ? `/auth/voters/?status=${status}`
      : '/auth/voters/';
    return request(url);
  },

  getVoter: (id) =>
    request(`/auth/voters/${id}/`),

  toggleVoter: (id, status) =>
    request(`/auth/voters/${id}/`, 'PATCH', { status }),

  deleteVoter: (id) =>
    request(`/auth/voters/${id}/`, 'DELETE'),
};