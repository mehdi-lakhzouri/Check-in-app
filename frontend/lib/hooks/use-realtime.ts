'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { queryKeys } from '@/lib/api/query-keys';

// ============================================================================
// Types
// ============================================================================

interface UseRealtimeOptions {
  enabled?: boolean;
  rooms?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface AmbassadorPointsUpdate {
  ambassadorId: string;
  name: string;
  newPoints: number;
  previousPoints: number;
  change: number;
}

interface TravelGrantUpdate {
  participantId: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  previousStatus: 'pending' | 'approved' | 'rejected';
}

interface CheckInUpdate {
  participantId: string;
  participantName: string;
  sessionId: string;
  sessionName: string;
  checkInTime: string;
}

interface SessionUpdate {
  sessionId: string;
  sessionName: string;
  isOpen: boolean;
  checkInsCount: number;
  capacity?: number;
}

/**
 * Session Status Update - Real-time status change notification
 */
interface SessionStatusUpdate {
  sessionId: string;
  sessionName: string;
  previousStatus: 'scheduled' | 'open' | 'ended' | 'closed' | 'cancelled';
  newStatus: 'scheduled' | 'open' | 'ended' | 'closed' | 'cancelled';
  previousIsOpen: boolean;
  newIsOpen: boolean;
  reason: 'auto_open' | 'auto_end' | 'manual';
  timestamp: string;
}

type RealtimeEvent = 
  | { type: 'ambassador-points'; data: AmbassadorPointsUpdate }
  | { type: 'travel-grant-update'; data: TravelGrantUpdate }
  | { type: 'check-in'; data: CheckInUpdate }
  | { type: 'session-update'; data: SessionUpdate }
  | { type: 'session-status-update'; data: SessionStatusUpdate };

type EventCallback<T> = (data: T) => void;

// ============================================================================
// WebSocket Hook
// ============================================================================

// WebSocket URL should point to the backend server (port 3000), not frontend (3001)
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
const SOCKET_NAMESPACE = '/realtime';

export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    enabled = true,
    rooms = [],
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  // Event callbacks registry
  const eventCallbacks = useRef<Map<string, Set<EventCallback<any>>>>(new Map());

  // Subscribe to events
  const subscribe = useCallback(<T>(event: string, callback: EventCallback<T>) => {
    if (!eventCallbacks.current.has(event)) {
      eventCallbacks.current.set(event, new Set());
    }
    eventCallbacks.current.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      eventCallbacks.current.get(event)?.delete(callback);
    };
  }, []);

  // Join a room
  const joinRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join', room);
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave', room);
    }
  }, []);

  // Subscribe to ambassador updates
  const subscribeToAmbassador = useCallback((ambassadorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribeAmbassador', ambassadorId);
    }
  }, []);

  // Unsubscribe from ambassador updates
  const unsubscribeFromAmbassador = useCallback((ambassadorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribeAmbassador', ambassadorId);
    }
  }, []);

  // Subscribe to session updates
  const subscribeToSession = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribeSession', sessionId);
    }
  }, []);

  // Unsubscribe from session updates
  const unsubscribeFromSession = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribeSession', sessionId);
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Connect to the /realtime namespace on the backend
    const socket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      setIsConnected(true);
      setConnectionError(null);
      onConnect?.();
      
      // Subscribe to rooms using the backend's expected event format
      rooms.forEach(room => {
        console.log(`[WebSocket] Subscribing to room: ${room}`);
        // Backend expects 'subscribe:roomName' format
        socket.emit(`subscribe:${room}`);
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error);
      onError?.(error);
    });

    // Listen for events and dispatch to registered callbacks
    // Backend emits these events when data changes
    socket.on('ambassadorPointsUpdated', (data: AmbassadorPointsUpdate) => {
      eventCallbacks.current.get('ambassador-points')?.forEach(cb => cb(data));
    });

    socket.on('travelGrantUpdated', (data: TravelGrantUpdate) => {
      eventCallbacks.current.get('travel-grant-update')?.forEach(cb => cb(data));
    });

    socket.on('participantCheckedIn', (data: CheckInUpdate) => {
      eventCallbacks.current.get('check-in')?.forEach(cb => cb(data));
    });

    socket.on('sessionUpdated', (data: SessionUpdate) => {
      eventCallbacks.current.get('session-update')?.forEach(cb => cb(data));
    });

    // Listen for session status updates (auto-open, auto-end, manual)
    socket.on('sessionStatusUpdated', (data: SessionStatusUpdate) => {
      console.log('[WebSocket] Received sessionStatusUpdated:', data);
      eventCallbacks.current.get('session-status-update')?.forEach(cb => cb(data));
    });

    // Also listen for the sessions room broadcast format
    socket.on('sessions:status-update', (payload: { type: string; data: SessionStatusUpdate; timestamp: Date }) => {
      console.log('[WebSocket] Received sessions:status-update:', payload);
      eventCallbacks.current.get('session-status-update')?.forEach(cb => cb(payload.data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onConnect, onDisconnect, onError]);

  // Re-subscribe to rooms when connection is re-established
  useEffect(() => {
    if (isConnected && socketRef.current) {
      rooms.forEach(room => socketRef.current?.emit(`subscribe:${room}`));
    }
  }, [isConnected, rooms]);

  return {
    isConnected,
    connectionError,
    subscribe,
    joinRoom,
    leaveRoom,
    subscribeToAmbassador,
    unsubscribeFromAmbassador,
    subscribeToSession,
    unsubscribeFromSession,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

export function useAmbassadorRealtime(options: {
  enabled?: boolean;
  onPointsUpdate?: (data: AmbassadorPointsUpdate) => void;
} = {}) {
  const { enabled = true, onPointsUpdate } = options;
  
  const realtime = useRealtime({
    enabled,
    rooms: ['ambassadors'],
  });

  useEffect(() => {
    if (!onPointsUpdate) return;
    return realtime.subscribe('ambassador-points', onPointsUpdate);
  }, [realtime, onPointsUpdate]);

  return realtime;
}

export function useTravelGrantRealtime(options: {
  enabled?: boolean;
  onStatusUpdate?: (data: TravelGrantUpdate) => void;
} = {}) {
  const { enabled = true, onStatusUpdate } = options;
  
  const realtime = useRealtime({
    enabled,
    rooms: ['travel-grants'],
  });

  useEffect(() => {
    if (!onStatusUpdate) return;
    return realtime.subscribe('travel-grant-update', onStatusUpdate);
  }, [realtime, onStatusUpdate]);

  return realtime;
}

export function useSessionRealtime(options: {
  enabled?: boolean;
  sessionId?: string;
  onCheckIn?: (data: CheckInUpdate) => void;
  onSessionUpdate?: (data: SessionUpdate) => void;
} = {}) {
  const { enabled = true, sessionId, onCheckIn, onSessionUpdate } = options;
  
  const realtime = useRealtime({
    enabled,
    rooms: sessionId ? [`session:${sessionId}`] : ['sessions'],
  });

  useEffect(() => {
    if (!onCheckIn) return;
    return realtime.subscribe('check-in', onCheckIn);
  }, [realtime, onCheckIn]);

  useEffect(() => {
    if (!onSessionUpdate) return;
    return realtime.subscribe('session-update', onSessionUpdate);
  }, [realtime, onSessionUpdate]);

  return realtime;
}

/**
 * Hook for real-time session status updates
 * Automatically invalidates TanStack Query cache when sessions change status
 * 
 * Use this to:
 * - Show toast notifications when session status changes
 * - Keep UI in sync without manual refresh
 * - React to auto-open/auto-end events
 */
export function useSessionStatusRealtime(options: {
  enabled?: boolean;
  onStatusChange?: (data: SessionStatusUpdate) => void;
  autoInvalidateCache?: boolean;
} = {}) {
  const { enabled = true, onStatusChange, autoInvalidateCache = true } = options;
  const queryClient = useQueryClient();
  
  const realtime = useRealtime({
    enabled,
    rooms: ['sessions'],
  });

  // Handler that invalidates cache and calls user callback
  const handleStatusChange = useCallback((data: SessionStatusUpdate) => {
    // Auto-invalidate the sessions query cache
    if (autoInvalidateCache) {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    }
    
    // Call user's callback
    onStatusChange?.(data);
  }, [queryClient, autoInvalidateCache, onStatusChange]);

  useEffect(() => {
    return realtime.subscribe('session-status-update', handleStatusChange);
  }, [realtime, handleStatusChange]);

  return realtime;
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  AmbassadorPointsUpdate,
  TravelGrantUpdate,
  CheckInUpdate,
  SessionUpdate,
  SessionStatusUpdate,
  RealtimeEvent,
};
