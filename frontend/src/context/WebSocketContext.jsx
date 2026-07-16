import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export function WebSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [toasts, setToasts] = useState([]);

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const toastIdRef = useRef(0);

  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev.slice(-4), newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/monitor?token=${token}`;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);

        switch (message.type) {
          case 'sensor_update':
            setWorkers((prev) => {
              const idx = prev.findIndex((w) => w.id === message.data.worker_id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...message.data };
                return updated;
              }
              return [...prev, message.data];
            });
            break;

          case 'alert':
            setAlerts((prev) => [message.data, ...prev].slice(0, 50));
            addToast({
              type: message.data.severity || 'warning',
              title: message.data.type || 'Alert',
              message: message.data.message || `Alert for ${message.data.worker_name || 'Unknown'}`,
              worker: message.data.worker_name,
            });
            break;

          case 'status_change':
            setWorkers((prev) => {
              const idx = prev.findIndex((w) => w.id === message.data.worker_id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], status: message.data.status };
                return updated;
              }
              return prev;
            });
            break;

          case 'dashboard_update':
            setDashboardData(message.data);
            break;

          case 'initial_state':
            if (message.data.workers) setWorkers(message.data.workers);
            if (message.data.alerts) setAlerts(message.data.alerts);
            if (message.data.dashboard) setDashboardData(message.data.dashboard);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (isAuthenticated) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
          RECONNECT_MAX_DELAY
        );
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated, token, addToast]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, connect]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        workers,
        alerts,
        dashboardData,
        lastMessage,
        toasts,
        addToast,
        removeToast,
        setWorkers,
        setAlerts,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
