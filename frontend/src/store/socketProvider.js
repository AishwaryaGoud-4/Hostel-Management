'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://hostelmanagements.onrender.com';
const AUTH_ERRORS = ['Invalid token', 'Authentication required'];

const TYPE_ICONS = {
  ATTENDANCE: '📋',
  COMPLAINT: '🛠️',
  FEE: '💳',
  GATE_PASS: '🎫',
  ROOM: '🛏️',
  EMERGENCY: '🚨',
  SYSTEM: '🔔',
};

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

const normalize = (n) => ({
  id: n._id || n.id || `${Date.now()}-${Math.random()}`,
  title: n.title,
  message: n.message || 'New notification',
  type: n.type,
  isRead: Boolean(n.isRead),
  createdAt: n.createdAt || new Date().toISOString(),
});

export function SocketProvider({ children }) {
  const userId = useAuthStore((s) => s.user?._id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const res = await api.get('/notifications?limit=20').catch(() => null);
    if (!res?.success) return;
    setNotifications((res.data?.notifications || []).map(normalize));
    setUnreadCount(res.data?.unreadCount || 0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;

    let disposed = false;
    const sock = io(SOCKET_URL, {
      // Read the token on every (re)connect so a refreshed token is always used.
      auth: (cb) => cb({ token: api.accessToken }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current = sock;
    setSocket(sock);
    loadNotifications();

    sock.on('connect', () => {
      setIsConnected(true);
      // Catch up on anything that happened while disconnected.
      loadNotifications();
    });

    sock.on('disconnect', () => setIsConnected(false));

    sock.on('connect_error', async (err) => {
      setIsConnected(false);
      if (err.message === 'Account inactive') {
        toast.error('Your account has been deactivated.');
        await useAuthStore.getState().logout();
        window.location.href = '/login';
        return;
      }
      // Server-side auth rejections are not retried automatically by socket.io.
      if (AUTH_ERRORS.includes(err.message) && !disposed) {
        const ok = await api.refreshToken();
        if (ok && !disposed) sock.connect();
      }
    });

    sock.on('notification:new', (raw) => {
      const n = normalize(raw);
      setNotifications((list) => [n, ...list.filter((x) => x.id !== n.id)].slice(0, 30));
      setUnreadCount((c) => c + 1);
      toast(n.title ? `${n.title} — ${n.message}` : n.message, {
        icon: TYPE_ICONS[n.type] || '🔔',
        duration: n.type === 'EMERGENCY' ? 12000 : 5000,
      });
    });

    sock.on('emergency:sos', (alert) => {
      toast.error(`SOS from ${alert?.from?.name || alert?.from?.email || 'a student'}: ${alert?.message || 'Emergency'}`, {
        duration: 15000,
        icon: '🚨',
      });
    });

    sock.on('user:updated', (updated) => {
      if (updated?._id === userId) useAuthStore.getState().setUser(updated);
    });

    sock.on('session:revoked', async (data) => {
      toast.error(data?.reason || 'Your session has ended.');
      await useAuthStore.getState().logout();
      window.location.href = '/login';
    });

    return () => {
      disposed = true;
      sock.removeAllListeners();
      sock.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setUnreadCount(0);
      setNotifications([]);
    };
  }, [isAuthenticated, userId, loadNotifications]);

  const clearUnread = useCallback(() => {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    api.put('/notifications/read-all').catch(() => {});
  }, [unreadCount]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    api.put('/notifications/read-all').catch(() => {});
  }, []);

  const sendSOS = useCallback((payload) => new Promise((resolve) => {
    const sock = socketRef.current;
    if (!sock?.connected) return resolve({ ok: false });
    sock.timeout(8000).emit('emergency:sos', payload, (err, res) => resolve(err ? { ok: false } : res));
  }), []);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      unreadCount,
      notifications,
      clearUnread,
      clearNotifications,
      sendSOS,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
