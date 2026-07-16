const BASE_URL = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response;
}

function get(endpoint, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  const query = searchParams.toString();
  return request(`${endpoint}${query ? `?${query}` : ''}`);
}

function post(endpoint, body) {
  return request(endpoint, { method: 'POST', body });
}

function put(endpoint, body) {
  return request(endpoint, { method: 'PUT', body });
}

function patch(endpoint, body) {
  return request(endpoint, { method: 'PATCH', body });
}

function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

// ──── Auth ────
export const authApi = {
  login: (username, password) =>
    post('/auth/login', { username, password }),
  signup: (username, email, password) =>
    post('/auth/signup', { username, email, password }),
  register: (data) =>
    post('/auth/register', data),
};

// ──── Workers ────
export const workersApi = {
  getWorkers: (filters = {}) =>
    get('/workers', filters),
  getWorker: (id) =>
    get(`/workers/${id}`),
  createWorker: (data) =>
    post('/workers', data),
  updateWorker: (id, data) =>
    put(`/workers/${id}`, data),
  deleteWorker: (id) =>
    del(`/workers/${id}`),
};

// ──── Helmets ────
export const helmetsApi = {
  getHelmets: (filters = {}) =>
    get('/helmets', filters),
  getHelmet: (id) =>
    get(`/helmets/${id}`),
  createHelmet: (data) =>
    post('/helmets', data),
  updateHelmet: (id, data) =>
    put(`/helmets/${id}`, data),
  assignHelmet: (id, workerId) =>
    post(`/helmets/${id}/assign`, { worker_id: workerId }),
  unassignHelmet: (id) =>
    post(`/helmets/${id}/unassign`),
};

// ──── Monitor ────
export const monitorApi = {
  getDashboard: () =>
    get('/monitor/dashboard'),
  getMonitorWorkers: () =>
    get('/monitor/workers'),
  getMonitorWorker: (id) =>
    get(`/monitor/workers/${id}`),
};

// ──── Incidents ────
export const incidentsApi = {
  getIncidents: (filters = {}) =>
    get('/incidents', filters),
  acknowledgeIncident: (id) =>
    post(`/incidents/${id}/acknowledge`),
  resolveIncident: (id) =>
    post(`/incidents/${id}/resolve`),
};

// ──── Analytics ────
export const analyticsApi = {
  getSummary: () =>
    get('/analytics/summary'),
  getTrends: () =>
    get('/analytics/trends'),
  getAlertBreakdown: () =>
    get('/analytics/alert-breakdown'),
  getGasTrends: () =>
    get('/analytics/gas-trends'),
};

// ──── Reports ────
export const reportsApi = {
  downloadDailyPDF: async (date) => {
    const response = await request(`/reports/daily?date=${date}`, {
      headers: { Accept: 'application/pdf' },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${date}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  downloadWeeklyPDF: async () => {
    const response = await request('/reports/weekly', {
      headers: { Accept: 'application/pdf' },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekly-report.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  },
  exportExcel: async (type) => {
    const response = await request(`/reports/export/${type}`, {
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-export.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

// ──── Settings ────
export const settingsApi = {
  getSettings: () =>
    get('/settings'),
  updateThresholds: (data) =>
    put('/settings/thresholds', data),
  getUsers: () =>
    get('/settings/users'),
  createUser: (data) =>
    post('/settings/users', data),
  updateUser: (id, data) =>
    put(`/settings/users/${id}`, data),
  deactivateUser: (id) =>
    post(`/settings/users/${id}/deactivate`),
  getSystemInfo: () =>
    get('/settings/system-info'),
};

export default { authApi, workersApi, helmetsApi, monitorApi, incidentsApi, analyticsApi, reportsApi, settingsApi };
