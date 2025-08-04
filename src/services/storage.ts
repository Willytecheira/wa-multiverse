import { 
  WhatsAppSession, 
  WebhookConfig, 
  Message, 
  User
} from '@/types/whatsapp';
import {
  AUTH_TOKEN_KEY,
  USER_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  WEBHOOK_STORAGE_KEY,
  MESSAGES_STORAGE_KEY
} from '@/utils/constants';

class StorageService {
  // Auth methods
  setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  removeAuthToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  setCurrentUser(user: User): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  removeCurrentUser(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  // Session methods
  getSessions(): WhatsAppSession[] {
    const sessionsStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionsStr) return [];
    
    try {
      const sessions = JSON.parse(sessionsStr);
      return sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        connectedAt: session.connectedAt ? new Date(session.connectedAt) : undefined,
        lastActivity: session.lastActivity ? new Date(session.lastActivity) : undefined,
      }));
    } catch {
      return [];
    }
  }

  setSessions(sessions: WhatsAppSession[]): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }

  addSession(session: WhatsAppSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.setSessions(sessions);
  }

  updateSession(sessionId: string, updates: Partial<WhatsAppSession>): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      this.setSessions(sessions);
    }
  }

  removeSession(sessionId: string): void {
    const sessions = this.getSessions().filter(s => s.id !== sessionId);
    this.setSessions(sessions);
  }

  getSession(sessionId: string): WhatsAppSession | null {
    return this.getSessions().find(s => s.id === sessionId) || null;
  }

  // Webhook methods
  getWebhookConfigs(): WebhookConfig[] {
    const configsStr = localStorage.getItem(WEBHOOK_STORAGE_KEY);
    if (!configsStr) return [];
    
    try {
      const configs = JSON.parse(configsStr);
      return configs.map((config: any) => ({
        ...config,
        createdAt: new Date(config.createdAt),
      }));
    } catch {
      return [];
    }
  }

  setWebhookConfigs(configs: WebhookConfig[]): void {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(configs));
  }

  addWebhookConfig(config: WebhookConfig): void {
    const configs = this.getWebhookConfigs();
    // Remove existing config for the same session
    const filteredConfigs = configs.filter(c => c.sessionId !== config.sessionId);
    filteredConfigs.push(config);
    this.setWebhookConfigs(filteredConfigs);
  }

  getWebhookConfig(sessionId: string): WebhookConfig | null {
    return this.getWebhookConfigs().find(c => c.sessionId === sessionId) || null;
  }

  removeWebhookConfig(sessionId: string): void {
    const configs = this.getWebhookConfigs().filter(c => c.sessionId !== sessionId);
    this.setWebhookConfigs(configs);
  }

  // Message methods
  getMessages(): Message[] {
    const messagesStr = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!messagesStr) return [];
    
    try {
      const messages = JSON.parse(messagesStr);
      return messages.map((message: any) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }));
    } catch {
      return [];
    }
  }

  setMessages(messages: Message[]): void {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  }

  addMessage(message: Message): void {
    const messages = this.getMessages();
    messages.push(message);
    // Keep only last 1000 messages
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    this.setMessages(messages);
  }

  getMessagesBySession(sessionId: string): Message[] {
    return this.getMessages().filter(m => m.sessionId === sessionId);
  }

  // Clear all data
  clearAllData(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(WEBHOOK_STORAGE_KEY);
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }
}

export const storageService = new StorageService();
