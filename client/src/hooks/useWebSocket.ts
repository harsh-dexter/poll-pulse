import { useState, useEffect, useCallback } from 'react';

const WEBSOCKET_URL = 'ws://localhost:3001';

interface WebSocketMessage {
  type: string;
  payload: any;
}

type MessageHandler = (payload: any) => void;

interface UseWebSocketReturn {
  sendMessage: (type: string, payload: any) => void;
  subscribe: (messageType: string, handler: MessageHandler) => () => void;
  isConnected: boolean;
  error: Event | null;
  connect: () => Promise<WebSocket | null>; // Exposed connect method
}

let socketInstance: WebSocket | null = null;
const subscribers = new Map<string, Set<MessageHandler>>();
let connectionPromise: Promise<WebSocket | null> | null = null;
let connectionAttempted = false; // Tracks connection attempts

// Global connection state (singleton)
let globalIsConnected = false;
let globalError: Event | null = null;
const globalStateUpdaters = new Set<() => void>(); // Triggers component re-renders

const notifyGlobalStateChange = () => {
  globalStateUpdaters.forEach(updater => updater());
};

const getSocket = (): Promise<WebSocket | null> => {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    globalIsConnected = true;
    globalError = null;
    notifyGlobalStateChange();
    return Promise.resolve(socketInstance);
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionAttempted = true;
  console.log('Attempting to connect WebSocket...');
  connectionPromise = new Promise((resolve, reject) => {
    const newSocket = new WebSocket(WEBSOCKET_URL);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      socketInstance = newSocket;
      globalIsConnected = true;
      globalError = null;
      notifyGlobalStateChange();
      resolve(newSocket);
    };

    newSocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        const messageHandlers = subscribers.get(message.type);
        if (messageHandlers) {
          messageHandlers.forEach(handler => handler(message.payload));
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message or handle it:', e);
      }
    };

    newSocket.onerror = (event) => {
      console.error('WebSocket error:', event);
      socketInstance = null;
      connectionPromise = null;
      connectionAttempted = false; // Reset for retry
      globalIsConnected = false;
      globalError = event;
      notifyGlobalStateChange();
      reject(event);
    };

    newSocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.reason, event.code);
      socketInstance = null;
      connectionPromise = null;
      connectionAttempted = false; // Reset for retry
      globalIsConnected = false;
      // Alt: globalError = new Event(`WebSocket closed: ${event.code} ${event.reason}`);
      notifyGlobalStateChange();
      const disconnectHandlers = subscribers.get('disconnect');
      if (disconnectHandlers) {
        disconnectHandlers.forEach(handler => handler({ reason: event.reason, code: event.code }));
      }
      // Allow manual reconnect on close
      resolve(null); // Resolve null: socket closed
    };
  });
  return connectionPromise;
};

export const useWebSocket = (): UseWebSocketReturn => {
  const [, forceUpdate] = useState({}); // Mirrors global state locally

  useEffect(() => {
    const updater = () => forceUpdate({});
    globalStateUpdaters.add(updater);
    // Initial connect on mount if needed
    if (!socketInstance && !connectionAttempted) {
        getSocket().catch(err => {
            // Log instance-specific connect errors
            console.warn('useWebSocket initial connection attempt failed:', err.type);
        });
    }
    return () => {
      globalStateUpdaters.delete(updater);
    };
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    getSocket().then(socket => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
      } else {
        console.error('WebSocket not connected. Cannot send.');
        // Optional: queue message or throw
      }
    }).catch(err => console.error('Error sending message (connection issue):', err));
  }, []);

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    if (!subscribers.has(messageType)) {
      subscribers.set(messageType, new Set());
    }
    subscribers.get(messageType)!.add(handler);

    return () => { // Unsubscribe
      const handlers = subscribers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          subscribers.delete(messageType);
        }
      }
    };
  }, []);
  
  const connect = useCallback(() => {
    if (!socketInstance || socketInstance.readyState === WebSocket.CLOSED) {
        return getSocket();
    }
    return Promise.resolve(socketInstance);
  }, []);


  return { sendMessage, subscribe, isConnected: globalIsConnected, error: globalError, connect };
};

// Optional: Auto-connect on load (manual connect via hook often preferred)
// getSocket().catch(err => console.error("Initial WebSocket connection failed on load:", err));

export default useWebSocket;
