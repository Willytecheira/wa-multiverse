export type SessionStatus = 'initializing' | 'qr_ready' | 'connected' | 'disconnected' | 'auth_failure';

export interface WhatsAppSession {
  id: string;
  name: string;
  status: SessionStatus;
  qrCode?: string;
  phone?: string;
  createdAt: Date;
  connectedAt?: Date;
  lastActivity?: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  to: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface WebhookConfig {
  sessionId: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: Date;
}

export type WebhookEvent = 'all' | 'message-received' | 'message-delivered' | 'message-from-me' | 'session-status';

export interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  uptime: number;
  memoryUsage: number[];
  cpuUsage: number;
  diskUsage: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}