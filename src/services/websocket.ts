import { WEBSOCKET_EVENTS } from '@/utils/constants';

class WebSocketService {
  private socket: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private connected = false;

  constructor() {
    // Since we don't have a real WebSocket server, we'll simulate events
    this.simulateConnection();
  }

  private simulateConnection(): void {
    // Simulate connection delay
    setTimeout(() => {
      this.connected = true;
      this.emit('connected', { message: 'WebSocket connected (simulated)' });
      console.log('WebSocket connected (simulated)');
    }, 1000);
  }

  connect(url?: string): void {
    // In a real implementation, this would connect to an actual WebSocket server
    console.log('WebSocket connection initiated (simulated)');
    this.simulateConnection();
  }

  disconnect(): void {
    this.connected = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    console.log('WebSocket disconnected');
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  // Simulate receiving events from server
  simulateEvent(event: string, data: any): void {
    setTimeout(() => {
      this.emit(event, data);
    }, Math.random() * 1000);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Session-specific events
  subscribeToSessionEvents(sessionId: string): void {
    // Simulate periodic session updates
    const interval = setInterval(() => {
      if (!this.connected) {
        clearInterval(interval);
        return;
      }

      // Randomly emit session status changes for demonstration
      if (Math.random() < 0.1) { // 10% chance every interval
        const statuses = ['connected', 'disconnected', 'qr_ready'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        this.emit(WEBSOCKET_EVENTS.SESSION_STATUS_CHANGED, {
          sessionId,
          status: randomStatus,
          timestamp: new Date()
        });
      }
    }, 10000); // Every 10 seconds
  }

  unsubscribeFromSessionEvents(sessionId: string): void {
    // In a real implementation, this would unsubscribe from specific session events
    console.log(`Unsubscribed from session ${sessionId} events`);
  }

  // System events
  subscribeToSystemEvents(): void {
    // Simulate system notifications
    const interval = setInterval(() => {
      if (!this.connected) {
        clearInterval(interval);
        return;
      }

      // Randomly emit system notifications
      if (Math.random() < 0.05) { // 5% chance every interval
        const notifications = [
          { type: 'info', message: 'System is running smoothly' },
          { type: 'warning', message: 'High memory usage detected' },
          { type: 'success', message: 'New session connected successfully' }
        ];
        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        
        this.emit(WEBSOCKET_EVENTS.SYSTEM_NOTIFICATION, {
          ...randomNotification,
          timestamp: new Date()
        });
      }
    }, 15000); // Every 15 seconds
  }

  // Message events
  simulateIncomingMessage(sessionId: string): void {
    const messages = [
      'Hello! How are you?',
      'Thanks for your message',
      'I received your file',
      'Can you please send me more details?',
      'Perfect! Everything looks good.'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    this.emit(WEBSOCKET_EVENTS.NEW_MESSAGE, {
      sessionId,
      from: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      content: randomMessage,
      timestamp: new Date(),
      type: 'incoming'
    });
  }

  // Health check
  ping(): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate ping/pong
      setTimeout(() => {
        resolve(this.connected);
      }, 100);
    });
  }
}

export const websocketService = new WebSocketService();