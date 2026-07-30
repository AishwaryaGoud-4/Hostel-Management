'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // Get token from api client
    const { api } = require('@/lib/api');
    const token = api.accessToken;
    if (!token) return;
    tokenRef.current = token;

    const sock = getSocket(token);
    setSocket(sock);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    // Global notification handler
    const onNotification = (notification) => {
      toast(notification.message || 'New notification', {
        icon: notification.type === 'ATTENDANCE' ? '📋' : '🔔',
        duration: 5000,
      });
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('notification:new', onNotification);

    if (sock.connected) setIsConnected(true);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('notification:new', onNotification);
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
