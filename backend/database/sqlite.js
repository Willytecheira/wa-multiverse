import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';

class SQLiteDatabase {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || './backend/data/whatsapp.db';
    this.init();
  }

  async init() {
    try {
      // Ensure the data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open the database
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');
      
      // Create tables
      await this.createTables();
      
      logger.info(`SQLite database initialized at: ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = {
      sessions: `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT DEFAULT 'disconnected',
          phone TEXT,
          qr_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME,
          is_active BOOLEAN DEFAULT 0
        )
      `,
      messages: `
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          from_user TEXT,
          to_user TEXT,
          content TEXT,
          type TEXT DEFAULT 'text',
          status TEXT DEFAULT 'pending',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          message_id TEXT,
          is_from_me BOOLEAN DEFAULT 0,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `,
      webhooks: `
        CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          name TEXT,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_triggered DATETIME,
          trigger_count INTEGER DEFAULT 0,
          last_error TEXT,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `,
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `
    };

    for (const [tableName, sql] of Object.entries(tables)) {
      try {
        await this.db.exec(sql);
        logger.debug(`Table '${tableName}' created/verified`);
      } catch (error) {
        logger.error(`Failed to create table '${tableName}':`, error);
        throw error;
      }
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status)',
      'CREATE INDEX IF NOT EXISTS idx_webhooks_session_id ON webhooks (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)'
    ];

    for (const indexSql of indexes) {
      try {
        await this.db.exec(indexSql);
      } catch (error) {
        logger.warn('Failed to create index:', error);
      }
    }
  }

  // Session methods
  async getSessions() {
    const sessions = await this.db.all('SELECT * FROM sessions ORDER BY created_at DESC');
    return sessions.map(this.transformSession);
  }

  async getSession(sessionId) {
    const session = await this.db.get('SELECT * FROM sessions WHERE id = ?', sessionId);
    return session ? this.transformSession(session) : null;
  }

  async saveSession(session) {
    const sql = `
      INSERT OR REPLACE INTO sessions 
      (id, name, status, phone, qr_code, created_at, updated_at, last_activity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      session.id,
      session.name,
      session.status,
      session.phone,
      session.qrCode,
      session.createdAt,
      session.updatedAt || new Date().toISOString(),
      session.lastActivity,
      session.isActive ? 1 : 0
    ]);
    
    return session;
  }

  async deleteSession(sessionId) {
    await this.db.run('DELETE FROM sessions WHERE id = ?', sessionId);
  }

  // Message methods
  async getMessages(sessionId = null, limit = 50) {
    let sql = 'SELECT * FROM messages';
    let params = [];
    
    if (sessionId) {
      sql += ' WHERE session_id = ?';
      params.push(sessionId);
    }
    
    sql += ' ORDER BY timestamp DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    const messages = await this.db.all(sql, params);
    return messages.map(this.transformMessage);
  }

  async getMessage(messageId) {
    const message = await this.db.get('SELECT * FROM messages WHERE id = ?', messageId);
    return message ? this.transformMessage(message) : null;
  }

  async saveMessage(message) {
    const sql = `
      INSERT OR REPLACE INTO messages 
      (id, session_id, from_user, to_user, content, type, status, timestamp, message_id, is_from_me)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      message.id,
      message.sessionId,
      message.from,
      message.to,
      message.content,
      message.type,
      message.status,
      message.timestamp,
      message.messageId,
      message.isFromMe ? 1 : 0
    ]);
    
    return message;
  }

  async updateMessageStatus(messageId, status) {
    await this.db.run(
      'UPDATE messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, messageId]
    );
  }

  async deleteMessage(messageId) {
    await this.db.run('DELETE FROM messages WHERE id = ?', messageId);
  }

  // Webhook methods
  async getWebhooks(sessionId = null) {
    let sql = 'SELECT * FROM webhooks';
    let params = [];
    
    if (sessionId) {
      sql += ' WHERE session_id = ?';
      params.push(sessionId);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const webhooks = await this.db.all(sql, params);
    return webhooks.map(this.transformWebhook);
  }

  async getWebhook(webhookId) {
    const webhook = await this.db.get('SELECT * FROM webhooks WHERE id = ?', webhookId);
    return webhook ? this.transformWebhook(webhook) : null;
  }

  async saveWebhook(webhook) {
    const sql = `
      INSERT OR REPLACE INTO webhooks 
      (id, session_id, name, url, events, is_active, created_at, updated_at, last_triggered, trigger_count, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      webhook.id,
      webhook.sessionId,
      webhook.name,
      webhook.url,
      JSON.stringify(webhook.events),
      webhook.isActive ? 1 : 0,
      webhook.createdAt,
      webhook.updatedAt || new Date().toISOString(),
      webhook.lastTriggered,
      webhook.triggerCount || 0,
      webhook.lastError
    ]);
    
    return webhook;
  }

  async deleteWebhook(webhookId) {
    await this.db.run('DELETE FROM webhooks WHERE id = ?', webhookId);
  }

  // User methods
  async getUsers() {
    const users = await this.db.all('SELECT * FROM users ORDER BY created_at DESC');
    return users.map(this.transformUser);
  }

  async getUser(userId) {
    const user = await this.db.get('SELECT * FROM users WHERE id = ?', userId);
    return user ? this.transformUser(user) : null;
  }

  async getUserByUsername(username) {
    const user = await this.db.get('SELECT * FROM users WHERE username = ?', username);
    return user ? this.transformUser(user) : null;
  }

  async saveUser(user) {
    const sql = `
      INSERT OR REPLACE INTO users 
      (id, username, password, email, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      user.id,
      user.username,
      user.password,
      user.email,
      user.role,
      user.createdAt,
      user.updatedAt || new Date().toISOString(),
      user.isActive ? 1 : 0
    ]);
    
    return user;
  }

  async deleteUser(userId) {
    await this.db.run('DELETE FROM users WHERE id = ?', userId);
  }

  // Statistics
  async getStats() {
    const [sessions, messages, webhooks, users] = await Promise.all([
      this.db.get('SELECT COUNT(*) as count FROM sessions'),
      this.db.get('SELECT COUNT(*) as count FROM messages'),
      this.db.get('SELECT COUNT(*) as count FROM webhooks'),
      this.db.get('SELECT COUNT(*) as count FROM users')
    ]);

    const activeSessions = await this.db.get('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1');
    const recentMessages = await this.db.get(
      'SELECT COUNT(*) as count FROM messages WHERE timestamp > datetime("now", "-24 hours")'
    );

    return {
      totalSessions: sessions.count,
      activeSessions: activeSessions.count,
      totalMessages: messages.count,
      recentMessages: recentMessages.count,
      totalWebhooks: webhooks.count,
      totalUsers: users.count,
      uptime: process.uptime()
    };
  }

  // Transform methods to convert snake_case to camelCase
  transformSession(session) {
    return {
      id: session.id,
      name: session.name,
      status: session.status,
      phone: session.phone,
      qrCode: session.qr_code,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      lastActivity: session.last_activity,
      isActive: Boolean(session.is_active)
    };
  }

  transformMessage(message) {
    return {
      id: message.id,
      sessionId: message.session_id,
      from: message.from_user,
      to: message.to_user,
      content: message.content,
      type: message.type,
      status: message.status,
      timestamp: message.timestamp,
      messageId: message.message_id,
      isFromMe: Boolean(message.is_from_me)
    };
  }

  transformWebhook(webhook) {
    return {
      id: webhook.id,
      sessionId: webhook.session_id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events || '[]'),
      isActive: Boolean(webhook.is_active),
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
      lastTriggered: webhook.last_triggered,
      triggerCount: webhook.trigger_count,
      lastError: webhook.last_error
    };
  }

  transformUser(user) {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isActive: Boolean(user.is_active)
    };
  }

  async close() {
    if (this.db) {
      await this.db.close();
      logger.info('SQLite database connection closed');
    }
  }
}

export default SQLiteDatabase;