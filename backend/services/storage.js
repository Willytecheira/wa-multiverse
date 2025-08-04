import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StorageService {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.sessionsFile = path.join(this.dataPath, 'sessions.json');
    this.messagesFile = path.join(this.dataPath, 'messages.json');
    this.webhooksFile = path.join(this.dataPath, 'webhooks.json');
    this.usersFile = path.join(this.dataPath, 'users.json');
    
    this.initStorage();
  }

  async initStorage() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Initialize files if they don't exist
      const files = [
        { path: this.sessionsFile, data: [] },
        { path: this.messagesFile, data: [] },
        { path: this.webhooksFile, data: [] },
        { path: this.usersFile, data: [] }
      ];

      for (const file of files) {
        try {
          await fs.access(file.path);
        } catch {
          await fs.writeFile(file.path, JSON.stringify(file.data, null, 2));
        }
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  // Session methods
  async getSessions() {
    return await this.readFile(this.sessionsFile);
  }

  async getSession(sessionId) {
    const sessions = await this.getSessions();
    return sessions.find(session => session.id === sessionId);
  }

  async saveSession(session) {
    const sessions = await this.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    const sessionData = {
      ...session.toJSON(),
      // Don't save the client instance
      client: undefined
    };
    
    if (index >= 0) {
      sessions[index] = sessionData;
    } else {
      sessions.push(sessionData);
    }
    
    await this.writeFile(this.sessionsFile, sessions);
  }

  async deleteSession(sessionId) {
    const sessions = await this.getSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    await this.writeFile(this.sessionsFile, filteredSessions);
  }

  // Message methods
  async getMessages(sessionId = null, limit = null) {
    const messages = await this.readFile(this.messagesFile);
    let filteredMessages = sessionId 
      ? messages.filter(msg => msg.sessionId === sessionId)
      : messages;
    
    // Sort by timestamp descending
    filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (limit) {
      filteredMessages = filteredMessages.slice(0, limit);
    }
    
    return filteredMessages;
  }

  async getMessage(messageId) {
    const messages = await this.readFile(this.messagesFile);
    return messages.find(msg => msg.id === messageId || msg.messageId === messageId);
  }

  async saveMessage(message) {
    const messages = await this.readFile(this.messagesFile);
    const index = messages.findIndex(m => m.id === message.id);
    
    const messageData = message.toJSON();
    
    if (index >= 0) {
      messages[index] = messageData;
    } else {
      messages.push(messageData);
    }
    
    await this.writeFile(this.messagesFile, messages);
  }

  async updateMessageStatus(messageId, status) {
    const messages = await this.readFile(this.messagesFile);
    const message = messages.find(m => m.messageId === messageId);
    
    if (message) {
      message.status = status;
      await this.writeFile(this.messagesFile, messages);
    }
  }

  async deleteMessage(messageId) {
    const messages = await this.readFile(this.messagesFile);
    const filteredMessages = messages.filter(msg => msg.id !== messageId);
    await this.writeFile(this.messagesFile, filteredMessages);
  }

  // Webhook methods
  async getWebhooks(sessionId = null) {
    const webhooks = await this.readFile(this.webhooksFile);
    return sessionId 
      ? webhooks.filter(webhook => webhook.sessionId === sessionId)
      : webhooks;
  }

  async getWebhook(webhookId) {
    const webhooks = await this.readFile(this.webhooksFile);
    return webhooks.find(webhook => webhook.id === webhookId);
  }

  async saveWebhook(webhook) {
    const webhooks = await this.readFile(this.webhooksFile);
    const index = webhooks.findIndex(w => w.id === webhook.id);
    
    const webhookData = webhook.toJSON();
    
    if (index >= 0) {
      webhooks[index] = webhookData;
    } else {
      webhooks.push(webhookData);
    }
    
    await this.writeFile(this.webhooksFile, webhooks);
  }

  async deleteWebhook(webhookId) {
    const webhooks = await this.readFile(this.webhooksFile);
    const filteredWebhooks = webhooks.filter(webhook => webhook.id !== webhookId);
    await this.writeFile(this.webhooksFile, filteredWebhooks);
  }

  // User methods
  async getUsers() {
    return await this.readFile(this.usersFile);
  }

  async getUser(userId) {
    const users = await this.getUsers();
    return users.find(user => user.id === userId);
  }

  async getUserByUsername(username) {
    const users = await this.getUsers();
    return users.find(user => user.username === username);
  }

  async saveUser(user) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    
    await this.writeFile(this.usersFile, users);
  }

  async deleteUser(userId) {
    const users = await this.getUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    await this.writeFile(this.usersFile, filteredUsers);
  }

  // Statistics methods
  async getStats() {
    const sessions = await this.getSessions();
    const messages = await this.getMessages();
    
    const activeSessions = sessions.filter(s => s.status === 'connected').length;
    const totalMessages = messages.length;
    const messagesToday = messages.filter(m => {
      const messageDate = new Date(m.timestamp);
      const today = new Date();
      return messageDate.toDateString() === today.toDateString();
    }).length;

    return {
      totalSessions: sessions.length,
      activeSessions,
      totalMessages,
      messagesToday,
      uptime: process.uptime()
    };
  }
}