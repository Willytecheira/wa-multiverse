import { v4 as uuidv4 } from 'uuid';

export class Session {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.status = data.status || 'initializing';
    this.qrCode = data.qrCode || null;
    this.phone = data.phone || null;
    this.createdAt = data.createdAt || new Date();
    this.connectedAt = data.connectedAt || null;
    this.lastActivity = data.lastActivity || null;
    this.client = data.client || null; // WhatsApp client instance
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      qrCode: this.qrCode,
      phone: this.phone,
      createdAt: this.createdAt,
      connectedAt: this.connectedAt,
      lastActivity: this.lastActivity
    };
  }

  updateStatus(status) {
    this.status = status;
    this.lastActivity = new Date();
    
    if (status === 'connected') {
      this.connectedAt = new Date();
    }
  }

  setQRCode(qrCode) {
    this.qrCode = qrCode;
    this.status = 'qr_ready';
  }

  setPhone(phone) {
    this.phone = phone;
  }

  isActive() {
    return this.status === 'connected';
  }

  disconnect() {
    this.status = 'disconnected';
    this.lastActivity = new Date();
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

export class Message {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.sessionId = data.sessionId || '';
    this.to = data.to || '';
    this.from = data.from || '';
    this.content = data.content || '';
    this.timestamp = data.timestamp || new Date();
    this.status = data.status || 'sent';
    this.type = data.type || 'text';
    this.messageId = data.messageId || null; // WhatsApp message ID
  }

  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      to: this.to,
      from: this.from,
      content: this.content,
      timestamp: this.timestamp,
      status: this.status,
      type: this.type,
      messageId: this.messageId
    };
  }

  updateStatus(status) {
    this.status = status;
  }
}

export class WebhookConfig {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.sessionId = data.sessionId || '';
    this.url = data.url || '';
    this.events = data.events || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.headers = data.headers || {};
  }

  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      url: this.url,
      events: this.events,
      isActive: this.isActive,
      createdAt: this.createdAt,
      headers: this.headers
    };
  }
}