import logger from '../utils/logger.js';

export class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    
    this.setupSocketHandlers();
    this.startMetricsInterval();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      socket.on('join_session', (sessionId) => {
        socket.join(`session_${sessionId}`);
        logger.info(`Socket ${socket.id} joined session ${sessionId}`);
      });

      socket.on('leave_session', (sessionId) => {
        socket.leave(`session_${sessionId}`);
        logger.info(`Socket ${socket.id} left session ${sessionId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  emit(event, data) {
    this.io.emit(event, data);
    logger.debug(`Socket event emitted: ${event}`);
  }

  emitToSession(sessionId, event, data) {
    this.io.to(`session_${sessionId}`).emit(event, data);
    logger.debug(`Socket event emitted to session ${sessionId}: ${event}`);
  }

  broadcast(event, data, excludeSocketId = null) {
    if (excludeSocketId) {
      this.io.except(excludeSocketId).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
    logger.debug(`Socket event broadcasted: ${event}`);
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  startMetricsInterval() {
    // Emit system metrics every 30 seconds
    setInterval(() => {
      this.emitSystemMetrics();
    }, 30000);
  }

  async emitSystemMetrics() {
    try {
      const metrics = {
        connectedClients: this.getConnectedClientsCount(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      };

      this.emit('system_metrics', metrics);
    } catch (error) {
      logger.error('Error emitting system metrics:', error);
    }
  }

  // Event helpers
  sessionStatusChanged(sessionId, status, additionalData = {}) {
    const data = {
      sessionId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    this.emit('session_status_changed', data);
    this.emitToSession(sessionId, 'status_changed', data);
  }

  newMessage(message) {
    this.emit('new_message', message);
    this.emitToSession(message.sessionId, 'message_received', message);
  }

  messageStatusUpdated(messageId, status, sessionId) {
    const data = {
      messageId,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.emit('message_status_updated', data);
    if (sessionId) {
      this.emitToSession(sessionId, 'message_status_updated', data);
    }
  }

  systemNotification(type, message, level = 'info') {
    const notification = {
      type,
      message,
      level,
      timestamp: new Date().toISOString()
    };
    
    this.emit('system_notification', notification);
  }

  webhookTriggered(sessionId, event, success, error = null) {
    const data = {
      sessionId,
      event,
      success,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.emit('webhook_triggered', data);
    this.emitToSession(sessionId, 'webhook_triggered', data);
  }
}

// Make socket service globally available
global.socketService = null;

export const initializeSocketService = (io) => {
  global.socketService = new SocketService(io);
  return global.socketService;
};