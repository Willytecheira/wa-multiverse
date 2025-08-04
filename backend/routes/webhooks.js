import express from 'express';
import Joi from 'joi';
import { StorageService } from '../services/storage.js';
import logger from '../utils/logger.js';

const router = express.Router();
const storage = new StorageService();

// Validation schemas
const webhookSchema = Joi.object({
  sessionId: Joi.string().required(),
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string().valid(
    'session_connected',
    'session_disconnected',
    'message_received',
    'message_sent',
    'message_ack',
    'qr_generated',
    'auth_failure',
    'all'
  )).min(1).required(),
  isActive: Joi.boolean().default(true),
  name: Joi.string().optional()
});

const updateWebhookSchema = Joi.object({
  url: Joi.string().uri().optional(),
  events: Joi.array().items(Joi.string().valid(
    'session_connected',
    'session_disconnected',
    'message_received',
    'message_sent',
    'message_ack',
    'qr_generated',
    'auth_failure',
    'all'
  )).min(1).optional(),
  isActive: Joi.boolean().optional(),
  name: Joi.string().optional()
});

// Get all webhooks
router.get('/', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const webhooks = await storage.getWebhooks(sessionId);

    res.json({
      success: true,
      webhooks
    });
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks'
    });
  }
});

// Get specific webhook
router.get('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = await storage.getWebhook(webhookId);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      webhook
    });
  } catch (error) {
    logger.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook'
    });
  }
});

// Create webhook
router.post('/', async (req, res) => {
  try {
    const { error } = webhookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { sessionId, url, events, isActive, name } = req.body;

    // Check if session exists
    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if webhook already exists for this session
    const existingWebhooks = await storage.getWebhooks(sessionId);
    const existingWebhook = existingWebhooks.find(w => w.url === url);
    
    if (existingWebhook) {
      return res.status(409).json({
        success: false,
        error: 'Webhook with this URL already exists for this session'
      });
    }

    const webhook = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      url,
      events,
      isActive: isActive !== undefined ? isActive : true,
      name: name || `Webhook ${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0,
      lastError: null
    };

    await storage.saveWebhook(webhook);

    logger.info(`Webhook created: ${webhook.id} for session ${sessionId}`);

    res.status(201).json({
      success: true,
      webhook,
      message: 'Webhook created successfully'
    });
  } catch (error) {
    logger.error('Error creating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook'
    });
  }
});

// Update webhook
router.put('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { error } = updateWebhookSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const webhook = await storage.getWebhook(webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    const updatedWebhook = {
      ...webhook,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await storage.saveWebhook(updatedWebhook);

    logger.info(`Webhook updated: ${webhookId}`);

    res.json({
      success: true,
      webhook: updatedWebhook,
      message: 'Webhook updated successfully'
    });
  } catch (error) {
    logger.error('Error updating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook'
    });
  }
});

// Delete webhook
router.delete('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    const webhook = await storage.getWebhook(webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    await storage.deleteWebhook(webhookId);
    
    logger.info(`Webhook deleted: ${webhookId}`);

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    });
  }
});

// Test webhook
router.post('/:webhookId/test', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = await storage.getWebhook(webhookId);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    if (!webhook.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Webhook is not active'
      });
    }

    // Test payload
    const testPayload = {
      event: 'webhook_test',
      sessionId: webhook.sessionId,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from WhatsApp API',
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    };

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp-API-Webhook/1.0'
        },
        body: JSON.stringify(testPayload),
        timeout: 10000
      });

      const success = response.ok;
      const responseText = await response.text();

      // Update webhook stats
      const updatedWebhook = {
        ...webhook,
        lastTriggered: new Date().toISOString(),
        triggerCount: webhook.triggerCount + 1,
        lastError: success ? null : `HTTP ${response.status}: ${responseText}`,
        updatedAt: new Date().toISOString()
      };

      await storage.saveWebhook(updatedWebhook);

      logger.info(`Webhook test ${success ? 'successful' : 'failed'}: ${webhookId}`);

      // Emit webhook event
      req.socketService?.webhookTriggered(webhook.sessionId, 'webhook_test', success, 
        success ? null : `HTTP ${response.status}: ${responseText}`);

      res.json({
        success: true,
        testResult: {
          success,
          status: response.status,
          response: responseText,
          timestamp: new Date().toISOString()
        },
        message: success ? 'Webhook test successful' : 'Webhook test failed'
      });
    } catch (fetchError) {
      // Update webhook with error
      const updatedWebhook = {
        ...webhook,
        lastTriggered: new Date().toISOString(),
        triggerCount: webhook.triggerCount + 1,
        lastError: fetchError.message,
        updatedAt: new Date().toISOString()
      };

      await storage.saveWebhook(updatedWebhook);

      logger.error(`Webhook test failed: ${webhookId}`, fetchError);

      // Emit webhook event
      req.socketService?.webhookTriggered(webhook.sessionId, 'webhook_test', false, fetchError.message);

      res.status(400).json({
        success: false,
        error: `Webhook test failed: ${fetchError.message}`,
        testResult: {
          success: false,
          error: fetchError.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test webhook'
    });
  }
});

// Get webhook statistics
router.get('/:webhookId/stats', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = await storage.getWebhook(webhookId);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    const stats = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      isActive: webhook.isActive,
      events: webhook.events,
      triggerCount: webhook.triggerCount || 0,
      lastTriggered: webhook.lastTriggered,
      lastError: webhook.lastError,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching webhook stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook statistics'
    });
  }
});

export default router;