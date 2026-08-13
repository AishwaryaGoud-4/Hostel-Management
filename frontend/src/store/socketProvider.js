'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://hostelmanagements.onrender.com';

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Clean up any existing socket when auth state changes
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    if (!isAuthenticated || !user) return;

    // Read token directly from authStore — it's set synchronously during login/register
    const { default: api } = require('@/lib/api');
    const token = api.accessToken;

    if (!token) {
      // Token not ready yet — wait for next render cycle when it is
      return;
    }

    const sock = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = sock;
    setSocket(sock);

    sock.on('connect', () => {
      console.log('🔌 Socket connected:', sock.id);
      setIsConnected(true);
    });

    sock.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    sock.on('connect_error', (err) => {
      console.warn('⚠ Socket connection error:', err.message);
    });

    // Global notification handler
    sock.on('notification:new', (notification) => {
      toast(notification.message || 'New notification', {
        icon: notification.type === 'ATTENDANCE' ? '📋' : '🔔',
        duration: 5000,
      });
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
