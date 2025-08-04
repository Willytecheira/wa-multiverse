import express from 'express';
import Joi from 'joi';
import { StorageService } from '../services/storage.js';
import logger from '../utils/logger.js';

const router = express.Router();
const storage = new StorageService();

// Validation schemas
const sendMessageSchema = Joi.object({
  sessionId: Joi.string().required(),
  to: Joi.string().required(),
  content: Joi.string().required(),
  type: Joi.string().valid('text', 'image', 'document', 'audio', 'video').default('text')
});

const updateMessageStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'sent', 'delivered', 'read', 'failed').required()
});

// Get messages with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { sessionId, limit = 50, offset = 0, status, from, to } = req.query;
    
    let messages = await storage.getMessages(sessionId, parseInt(limit));
    
    // Apply additional filters
    if (status) {
      messages = messages.filter(msg => msg.status === status);
    }
    
    if (from) {
      messages = messages.filter(msg => msg.from === from);
    }
    
    if (to) {
      messages = messages.filter(msg => msg.to === to);
    }

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = messages.slice(startIndex, endIndex);

    res.json({
      success: true,
      messages: paginatedMessages,
      pagination: {
        total: messages.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < messages.length
      }
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Get specific message
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await storage.getMessage(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    logger.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// Send message
router.post('/send', async (req, res) => {
  try {
    const { error } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { sessionId, to, content, type } = req.body;
    const whatsappService = req.whatsappService;
    const socketService = req.socketService;

    // Check if session exists and is connected
    const session = whatsappService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!session.isActive()) {
      return res.status(400).json({
        success: false,
        error: 'Session is not connected'
      });
    }

    // Send message through WhatsApp service
    const messageResult = await whatsappService.sendMessage(sessionId, to, content, type);
    
    if (!messageResult.success) {
      return res.status(400).json({
        success: false,
        error: messageResult.error || 'Failed to send message'
      });
    }

    logger.info(`Message sent: ${messageResult.message.id} from session ${sessionId} to ${to}`);

    // Emit message sent event
    socketService.newMessage(messageResult.message);

    res.json({
      success: true,
      message: messageResult.message,
      messageId: messageResult.message.id
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
});

// Update message status
router.put('/:messageId/status', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { error } = updateMessageStatusSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { status } = req.body;
    const socketService = req.socketService;

    // Update message status in storage
    await storage.updateMessageStatus(messageId, status);
    
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    logger.info(`Message status updated: ${messageId} -> ${status}`);

    // Emit status update
    socketService.messageStatusUpdated(messageId, status, message.sessionId);

    res.json({
      success: true,
      message,
      newStatus: status
    });
  } catch (error) {
    logger.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message status'
    });
  }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    await storage.deleteMessage(messageId);
    
    logger.info(`Message deleted: ${messageId}`);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// Get message statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { sessionId, period = '24h' } = req.query;
    
    let messages = await storage.getMessages(sessionId);
    
    // Filter by time period
    const now = new Date();
    let periodStart;
    
    switch (period) {
      case '1h':
        periodStart = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        periodStart = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        periodStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        periodStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(now - 24 * 60 * 60 * 1000);
    }

    messages = messages.filter(msg => 
      new Date(msg.timestamp) >= periodStart
    );

    const stats = {
      total: messages.length,
      sent: messages.filter(msg => ['sent', 'delivered', 'read'].includes(msg.status)).length,
      delivered: messages.filter(msg => ['delivered', 'read'].includes(msg.status)).length,
      read: messages.filter(msg => msg.status === 'read').length,
      failed: messages.filter(msg => msg.status === 'failed').length,
      pending: messages.filter(msg => msg.status === 'pending').length,
      byType: {
        text: messages.filter(msg => msg.type === 'text').length,
        image: messages.filter(msg => msg.type === 'image').length,
        document: messages.filter(msg => msg.type === 'document').length,
        audio: messages.filter(msg => msg.type === 'audio').length,
        video: messages.filter(msg => msg.type === 'video').length
      },
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString()
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message statistics'
    });
  }
});

// Bulk message operations
router.post('/bulk/send', async (req, res) => {
  try {
    const { sessionId, messages } = req.body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required and cannot be empty'
      });
    }

    const whatsappService = req.whatsappService;
    const session = whatsappService.getSession(sessionId);
    
    if (!session || !session.isActive()) {
      return res.status(400).json({
        success: false,
        error: 'Session not found or not connected'
      });
    }

    const results = [];
    const failed = [];

    for (const msg of messages) {
      try {
        const result = await whatsappService.sendMessage(sessionId, msg.to, msg.content, msg.type || 'text');
        if (result.success) {
          results.push(result.message);
        } else {
          failed.push({ ...msg, error: result.error });
        }
      } catch (error) {
        failed.push({ ...msg, error: error.message });
      }
    }

    logger.info(`Bulk messages sent: ${results.length} successful, ${failed.length} failed`);

    res.json({
      success: true,
      sent: results.length,
      failed: failed.length,
      messages: results,
      failedMessages: failed
    });
  } catch (error) {
    logger.error('Error sending bulk messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk messages'
    });
  }
});

export default router;