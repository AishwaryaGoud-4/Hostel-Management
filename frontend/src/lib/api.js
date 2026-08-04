const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.accessToken = null;
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

    // Handle token refresh
    if (response.status === 401) {
      const refreshResult = await this.refreshToken();
      if (refreshResult) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        try {
          const retryResponse = await fetch(url, config);
          return retryResponse.json();
        } catch (retryError) {
          return { success: false, message: 'Network error during retry', data: null };
        }
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }

    try {
      return await response.json();
    } catch (jsonError) {
      return { success: false, message: 'Invalid response from server', data: null };
    }
  }

  async refreshToken() {
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
