import { create } from 'zustand';
import api from '@/lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        api.setToken(res.data.accessToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        return res.data.user;
      }
      set({ error: res.message, isLoading: false });
      throw new Error(res.message);
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/register', userData);
      if (res.success) {
        api.setToken(res.data.accessToken);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        return res.data.user;
      }
      set({ error: res.message, isLoading: false });
      throw new Error(res.message);
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    api.setToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me');
      if (res.success) {
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
