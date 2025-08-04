import { 
  WhatsAppSession, 
  Message, 
  SystemMetrics, 
  ApiResponse, 
  SessionStatus,
  WebhookConfig 
} from '@/types/whatsapp';
import { storageService } from './storage';
import { 
  generateSessionId, 
  generateMessageId, 
  generateQRCode, 
  delay 
} from '@/utils/helpers';
import { websocketService } from './websocket';

class ApiService {
  private baseUrl = '/api';
  private sessions: Map<string, WhatsAppSession> = new Map();
  private systemStartTime = Date.now();

  constructor() {
    this.loadSessionsFromStorage();
    this.startSystemMetricsSimulation();
  }

  // Session Management
  async startSession(sessionName: string): Promise<ApiResponse<WhatsAppSession>> {
    await delay(1500); // Simulate API delay

    const sessionId = generateSessionId();
    const session: WhatsAppSession = {
      id: sessionId,
      name: sessionName,
      status: 'initializing',
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    storageService.addSession(session);

    // Simulate session initialization process
    this.simulateSessionConnection(sessionId);

    websocketService.emit('session_status_changed', { sessionId, status: 'initializing' });

    return {
      success: true,
      data: session,
      message: 'Session initialization started'
    };
  }

  async getQRCode(sessionId: string): Promise<ApiResponse<string>> {
    await delay(500);

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (session.status !== 'qr_ready') {
      return {
        success: false,
        error: 'QR code not ready yet'
      };
    }

    return {
      success: true,
      data: session.qrCode!,
      message: 'QR code retrieved successfully'
    };
  }

  async getSessionStatus(sessionId: string): Promise<ApiResponse<SessionStatus>> {
    await delay(200);

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    return {
      success: true,
      data: session.status
    };
  }

  async getSessions(): Promise<ApiResponse<WhatsAppSession[]>> {
    await delay(300);

    const sessions = Array.from(this.sessions.values());
    return {
      success: true,
      data: sessions
    };
  }

  async sendMessage(sessionId: string, to: string, content: string): Promise<ApiResponse<Message>> {
    await delay(1000);

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    if (session.status !== 'connected') {
      return {
        success: false,
        error: 'Session is not connected'
      };
    }

    const message: Message = {
      id: generateMessageId(),
      sessionId,
      to,
      content,
      timestamp: new Date(),
      status: 'sent'
    };

    storageService.addMessage(message);

    // Simulate message delivery
    setTimeout(() => {
      message.status = 'delivered';
      storageService.addMessage({ ...message, status: 'delivered' });
      websocketService.emit('new_message', message);
    }, 2000);

    return {
      success: true,
      data: message,
      message: 'Message sent successfully'
    };
  }

  async logoutSession(sessionId: string): Promise<ApiResponse<void>> {
    await delay(800);

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    session.status = 'disconnected';
    this.sessions.set(sessionId, session);
    storageService.updateSession(sessionId, { status: 'disconnected' });

    websocketService.emit('session_status_changed', { sessionId, status: 'disconnected' });

    return {
      success: true,
      message: 'Session logged out successfully'
    };
  }

  async setWebhook(sessionId: string, config: Omit<WebhookConfig, 'sessionId' | 'createdAt'>): Promise<ApiResponse<WebhookConfig>> {
    await delay(500);

    const webhookConfig: WebhookConfig = {
      ...config,
      sessionId,
      createdAt: new Date()
    };

    storageService.addWebhookConfig(webhookConfig);

    return {
      success: true,
      data: webhookConfig,
      message: 'Webhook configured successfully'
    };
  }

  async getHealth(): Promise<ApiResponse<{ status: string; uptime: number }>> {
    await delay(100);

    return {
      success: true,
      data: {
        status: 'healthy',
        uptime: Math.floor((Date.now() - this.systemStartTime) / 1000)
      }
    };
  }

  getSystemMetrics(): SystemMetrics {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.status === 'connected').length;
    const totalMessages = storageService.getMessages().length;

    return {
      totalSessions: sessions.length,
      activeSessions,
      totalMessages,
      uptime: Math.floor((Date.now() - this.systemStartTime) / 1000),
      memoryUsage: this.generateMemoryUsageData(),
      cpuUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
    };
  }

  // Private methods
  private loadSessionsFromStorage(): void {
    const sessions = storageService.getSessions();
    sessions.forEach(session => {
      this.sessions.set(session.id, session);
    });
  }

  private async simulateSessionConnection(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Step 1: Generate QR Code (2-5 seconds)
    await delay(2000 + Math.random() * 3000);
    session.status = 'qr_ready';
    session.qrCode = generateQRCode();
    this.sessions.set(sessionId, session);
    storageService.updateSession(sessionId, { status: 'qr_ready', qrCode: session.qrCode });
    websocketService.emit('session_status_changed', { sessionId, status: 'qr_ready' });

    // Step 2: Simulate user scanning QR (10-30 seconds)
    await delay(10000 + Math.random() * 20000);
    
    // 80% chance of success, 20% chance of auth failure
    if (Math.random() < 0.8) {
      session.status = 'connected';
      session.connectedAt = new Date();
      session.lastActivity = new Date();
      session.phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      
      this.sessions.set(sessionId, session);
      storageService.updateSession(sessionId, { 
        status: 'connected', 
        connectedAt: session.connectedAt,
        lastActivity: session.lastActivity,
        phone: session.phone
      });
      
      websocketService.emit('session_status_changed', { sessionId, status: 'connected' });
    } else {
      session.status = 'auth_failure';
      this.sessions.set(sessionId, session);
      storageService.updateSession(sessionId, { status: 'auth_failure' });
      websocketService.emit('session_status_changed', { sessionId, status: 'auth_failure' });
    }
  }

  private generateMemoryUsageData(): number[] {
    // Generate 24 hours of memory usage data (one point per hour)
    const data: number[] = [];
    let baseUsage = 40 + Math.random() * 20; // Base usage between 40-60%
    
    for (let i = 0; i < 24; i++) {
      // Add some variance
      baseUsage += (Math.random() - 0.5) * 10;
      baseUsage = Math.max(30, Math.min(90, baseUsage)); // Keep between 30-90%
      data.push(Math.round(baseUsage));
    }
    
    return data;
  }

  private startSystemMetricsSimulation(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      websocketService.emit('metrics_update', metrics);
    }, 30000);
  }
}

export const apiService = new ApiService();