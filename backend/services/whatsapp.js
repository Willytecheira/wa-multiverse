import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { Session, Message } from '../models/Session.js';
import { StorageService } from './storage.js';
import logger from '../utils/logger.js';

export class WhatsAppService {
  constructor() {
    this.sessions = new Map();
    this.storageService = new StorageService();
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './backend/sessions';
    
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    this.loadExistingSessions();
  }

  async loadExistingSessions() {
    try {
      const savedSessions = await this.storageService.getSessions();
      for (const sessionData of savedSessions) {
        if (sessionData.status === 'connected') {
          // Try to reconnect existing sessions
          await this.reconnectSession(sessionData.id);
        } else {
          // Load session without connecting
          const session = new Session(sessionData);
          this.sessions.set(session.id, session);
        }
      }
      logger.info(`Loaded ${savedSessions.length} existing sessions`);
    } catch (error) {
      logger.error('Error loading existing sessions:', error);
    }
  }

  async createSession(sessionName) {
    try {
      const session = new Session({ name: sessionName });
      this.sessions.set(session.id, session);
      
      // Save to storage
      await this.storageService.saveSession(session);
      
      // Initialize WhatsApp client
      await this.initializeClient(session);
      
      logger.info(`Session created: ${session.id} (${sessionName})`);
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async initializeClient(session) {
    try {
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: session.id,
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Set up event listeners
      this.setupClientEvents(client, session);
      
      // Store client in session
      session.client = client;
      
      // Initialize client
      await client.initialize();
      
      logger.info(`WhatsApp client initialized for session: ${session.id}`);
    } catch (error) {
      logger.error(`Error initializing client for session ${session.id}:`, error);
      session.updateStatus('auth_failure');
      throw error;
    }
  }

  setupClientEvents(client, session) {
    client.on('qr', async (qr) => {
      try {
        const qrDataURL = await qrcode.toDataURL(qr);
        session.setQRCode(qrDataURL);
        await this.storageService.saveSession(session);
        
        logger.info(`QR code generated for session: ${session.id}`);
        
        // Emit event for real-time updates
        global.socketService?.emit('session_status_changed', {
          sessionId: session.id,
          status: 'qr_ready',
          qrCode: qrDataURL
        });
      } catch (error) {
        logger.error('Error generating QR code:', error);
      }
    });

    client.on('ready', async () => {
      try {
        const info = client.info;
        session.setPhone(info.wid.user);
        session.updateStatus('connected');
        await this.storageService.saveSession(session);
        
        logger.info(`Session connected: ${session.id} (${info.wid.user})`);
        
        // Emit event for real-time updates
        global.socketService?.emit('session_status_changed', {
          sessionId: session.id,
          status: 'connected',
          phone: info.wid.user
        });
      } catch (error) {
        logger.error('Error handling ready event:', error);
      }
    });

    client.on('auth_failure', async () => {
      session.updateStatus('auth_failure');
      await this.storageService.saveSession(session);
      
      logger.warn(`Authentication failed for session: ${session.id}`);
      
      // Emit event for real-time updates
      global.socketService?.emit('session_status_changed', {
        sessionId: session.id,
        status: 'auth_failure'
      });
    });

    client.on('disconnected', async (reason) => {
      session.updateStatus('disconnected');
      await this.storageService.saveSession(session);
      
      logger.info(`Session disconnected: ${session.id} (${reason})`);
      
      // Emit event for real-time updates
      global.socketService?.emit('session_status_changed', {
        sessionId: session.id,
        status: 'disconnected'
      });
    });

    client.on('message', async (message) => {
      try {
        const messageData = new Message({
          sessionId: session.id,
          from: message.from,
          to: message.to || session.phone,
          content: message.body,
          type: message.type,
          messageId: message.id.id
        });
        
        await this.storageService.saveMessage(messageData);
        
        logger.info(`Message received in session ${session.id}: ${message.from}`);
        
        // Emit event for real-time updates
        global.socketService?.emit('new_message', messageData.toJSON());
        
        // Trigger webhooks
        await this.triggerWebhooks(session.id, 'message-received', messageData.toJSON());
      } catch (error) {
        logger.error('Error handling received message:', error);
      }
    });

    client.on('message_ack', async (message, ack) => {
      try {
        let status = 'sent';
        if (ack === 2) status = 'delivered';
        if (ack === 3) status = 'read';
        
        // Update message status in storage
        await this.storageService.updateMessageStatus(message.id.id, status);
        
        // Emit event for real-time updates
        global.socketService?.emit('message_status_updated', {
          messageId: message.id.id,
          status: status
        });
        
        // Trigger webhooks
        await this.triggerWebhooks(session.id, 'message-delivered', {
          messageId: message.id.id,
          status: status
        });
      } catch (error) {
        logger.error('Error handling message acknowledgment:', error);
      }
    });
  }

  async sendMessage(sessionId, to, content, type = 'text') {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.isActive()) {
        throw new Error('Session is not connected');
      }

      const client = session.client;
      if (!client) {
        throw new Error('WhatsApp client not initialized');
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(to);
      
      let sentMessage;
      if (type === 'text') {
        sentMessage = await client.sendMessage(formattedNumber, content);
      } else if (type === 'media') {
        const media = MessageMedia.fromFilePath(content);
        sentMessage = await client.sendMessage(formattedNumber, media);
      }

      // Create message record
      const message = new Message({
        sessionId: sessionId,
        to: formattedNumber,
        from: session.phone,
        content: content,
        type: type,
        messageId: sentMessage.id.id,
        status: 'sent'
      });

      await this.storageService.saveMessage(message);
      
      logger.info(`Message sent from session ${sessionId} to ${formattedNumber}`);
      
      // Emit event for real-time updates
      global.socketService?.emit('new_message', message.toJSON());
      
      // Trigger webhooks
      await this.triggerWebhooks(sessionId, 'message-from-me', message.toJSON());
      
      return message;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async logoutSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.client) {
        await session.client.logout();
        await session.client.destroy();
      }

      session.disconnect();
      await this.storageService.saveSession(session);
      
      logger.info(`Session logged out: ${sessionId}`);
      
      // Emit event for real-time updates
      global.socketService?.emit('session_status_changed', {
        sessionId: sessionId,
        status: 'disconnected'
      });
      
      return true;
    } catch (error) {
      logger.error('Error logging out session:', error);
      throw error;
    }
  }

  async reconnectSession(sessionId) {
    try {
      const sessionData = await this.storageService.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session data not found');
      }

      const session = new Session(sessionData);
      this.sessions.set(sessionId, session);
      
      await this.initializeClient(session);
      
      logger.info(`Session reconnected: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error reconnecting session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        await this.logoutSession(sessionId);
        this.sessions.delete(sessionId);
      }
      
      await this.storageService.deleteSession(sessionId);
      
      // Clean up session files
      const sessionDir = path.join(this.sessionPath, `session-${sessionId}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      
      logger.info(`Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    }
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    return cleaned + '@c.us';
  }

  async triggerWebhooks(sessionId, event, data) {
    try {
      const webhooks = await this.storageService.getWebhooks(sessionId);
      
      for (const webhook of webhooks) {
        if (webhook.isActive && (webhook.events.includes('all') || webhook.events.includes(event))) {
          try {
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...webhook.headers
              },
              body: JSON.stringify({
                event: event,
                sessionId: sessionId,
                data: data,
                timestamp: new Date().toISOString()
              })
            });
            
            logger.info(`Webhook triggered: ${webhook.url} for event ${event}`);
          } catch (error) {
            logger.error(`Webhook error for ${webhook.url}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
    }
  }

  // Getters
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map(session => session.toJSON());
  }

  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.status : null;
  }
}