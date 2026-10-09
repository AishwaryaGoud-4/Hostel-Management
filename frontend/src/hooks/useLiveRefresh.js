'use client';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/store/socketProvider';

/**
 * Calls `onEvent` whenever any of `events` arrives over the socket, and after a reconnect
 * (events sent while offline are lost). Bursts are coalesced into one call.
 */
export function useLiveRefresh(events, onEvent, { debounceMs = 250 } = {}) {
  const { socket } = useSocket() || {};
  const handlerRef = useRef(onEvent);
  const key = events.join('|');

  useEffect(() => { handlerRef.current = onEvent; });

  useEffect(() => {
    if (!socket) return undefined;
    let timer;
    let connectedOnce = socket.connected;
    const fire = (event, payload) => {
      clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current?.(event, payload), debounceMs);
    };
    const onConnect = () => {
      if (connectedOnce) fire('reconnect');
      connectedOnce = true;
    };
    const names = key.split('|').filter(Boolean);
    const listeners = names.map((name) => [name, (payload) => fire(name, payload)]);
    listeners.forEach(([name, fn]) => socket.on(name, fn));
    socket.on('connect', onConnect);
    return () => {
      clearTimeout(timer);
      listeners.forEach(([name, fn]) => socket.off(name, fn));
      socket.off('connect', onConnect);
    };
  }, [socket, key, debounceMs]);
}
