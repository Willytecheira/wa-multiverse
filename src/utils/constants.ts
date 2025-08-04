export const API_BASE_URL = '/api';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  HOME: '/',
} as const;

export const SESSION_STORAGE_KEY = 'whatsapp_sessions';
export const WEBHOOK_STORAGE_KEY = 'webhook_configs';
export const MESSAGES_STORAGE_KEY = 'messages_history';
export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_STORAGE_KEY = 'current_user';

export const DEFAULT_USER = {
  username: 'admin',
  password: 'admin',
};

export const WEBSOCKET_EVENTS = {
  SESSION_STATUS_CHANGED: 'session_status_changed',
  NEW_MESSAGE: 'new_message',
  METRICS_UPDATE: 'metrics_update',
  SYSTEM_NOTIFICATION: 'system_notification',
} as const;

export const SESSION_STATUSES = {
  INITIALIZING: 'initializing',
  QR_READY: 'qr_ready',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  AUTH_FAILURE: 'auth_failure',
} as const;

export const MESSAGE_STATUSES = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export const WEBHOOK_EVENTS = {
  ALL: 'all',
  MESSAGE_RECEIVED: 'message-received',
  MESSAGE_DELIVERED: 'message-delivered',
  MESSAGE_FROM_ME: 'message-from-me',
  SESSION_STATUS: 'session-status',
} as const;

export const CHART_COLORS = {
  PRIMARY: '#25D366',
  SECONDARY: '#128C7E',
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
  MUTED: '#6c757d',
} as const;