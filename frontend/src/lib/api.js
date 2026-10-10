const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hostelmanagements.onrender.com/api';

// In the browser on a deployed site, go through the Next.js /api rewrite so auth cookies are first-party.
function resolveApiUrl() {
  if (typeof window === 'undefined') return DIRECT_API_URL;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return DIRECT_API_URL;
  try {
    return new URL(DIRECT_API_URL).hostname === host ? DIRECT_API_URL : '/api';
  } catch {
    return DIRECT_API_URL;
  }
}

// A 401 from these means "wrong credentials", not "session expired".
const NO_REFRESH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];
// The caller decides where to go when these fail.
const NO_REDIRECT_ENDPOINTS = ['/auth/me', '/auth/logout'];

class ApiClient {
  constructor() {
    this.accessToken = null;
  }

  get baseURL() {
    return resolveApiUrl();
  }

  setToken(token) {
    this.accessToken = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (error) {
      console.error(`API Fetch Error [${endpoint}]:`, error);
      return { success: false, message: 'Network error or backend is down', data: null };
    }

    const path = endpoint.split('?')[0];
    if (response.status === 401 && !NO_REFRESH_ENDPOINTS.includes(path)) {
      const refreshResult = await this.refreshToken();
      if (refreshResult) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        try {
          const retryResponse = await fetch(url, config);
          const retryBody = await retryResponse.json();
          return { ...retryBody, httpStatus: retryResponse.status };
        } catch (retryError) {
          return { success: false, message: 'Network error during retry', data: null };
        }
      }
      this.accessToken = null;
      if (NO_REDIRECT_ENDPOINTS.includes(path)) {
        return { success: false, message: 'Session expired', data: null, httpStatus: 401 };
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }

    try {
      const body = await response.json();
      return { ...body, httpStatus: response.status };
    } catch (jsonError) {
      return { success: false, message: 'Invalid response from server', data: null, httpStatus: response.status };
    }
  }

  // The backend rotates refresh tokens, so parallel refreshes would invalidate each other.
  refreshToken() {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async doRefresh() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.data?.accessToken;
        return true;
      }
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 1500));
        const retry = await fetch(`${this.baseURL}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (retry.ok) {
          this.accessToken = (await retry.json()).data?.accessToken;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  get(endpoint) { return this.request(endpoint); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient();
export default api;
