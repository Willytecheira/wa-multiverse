import express from 'express';
import Joi from 'joi';
import { StorageService } from '../services/storage.js';
import logger from '../utils/logger.js';

const router = express.Router();
const storage = new StorageService();

// Validation schemas
const createSessionSchema = Joi.object({
  name: Joi.string().min(1).max(50).required()
});

const updateSessionSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  status: Joi.string().valid('connecting', 'connected', 'disconnected', 'qr_ready', 'authenticated').optional()
});

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await storage.getSessions();
    const whatsappService = req.whatsappService;
    
    // Update sessions with real-time status from WhatsApp service
    const updatedSessions = sessions.map(session => {
      const whatsappSession = whatsappService.getSession(session.id);
      if (whatsappSession) {
        return {
          ...session,
          status: whatsappSession.status,
          isActive: whatsappSession.isActive(),
          lastActivity: whatsappSession.lastActivity
        };
      }
      return session;
    });

    res.json({
      success: true,
      sessions: updatedSessions
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// Get specific session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const whatsappService = req.whatsappService;
    const whatsappSession = whatsappService.getSession(sessionId);
    
    if (whatsappSession) {
      session.status = whatsappSession.status;
      session.isActive = whatsappSession.isActive();
      session.lastActivity = whatsappSession.lastActivity;
      session.qrCode = whatsappSession.qrCode;
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

// Create new session
router.post('/', async (req, res) => {
  try {
    const { error } = createSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name } = req.body;
    const whatsappService = req.whatsappService;

    // Create session in WhatsApp service
    const session = await whatsappService.createSession(name);
    
    logger.info(`Session created: ${session.id} (${name})`);
    
    res.status(201).json({
      success: true,
      session,
      message: 'Session created successfully'
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session'
    });
  }
});

// Update session
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { error } = updateSessionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const updatedSession = {
      ...session,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await storage.saveSession(updatedSession);

    logger.info(`Session updated: ${sessionId}`);

    res.json({
      success: true,
      session: updatedSession,
      message: 'Session updated successfully'
    });
  } catch (error) {
    logger.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session'
    });
  }
});

// Delete session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const whatsappService = req.whatsappService;

    // Delete from WhatsApp service (handles cleanup)
    await whatsappService.deleteSession(sessionId);
    
    logger.info(`Session deleted: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete session'
    });
  }
});

// Refresh session status
router.post('/:sessionId/refresh', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const whatsappService = req.whatsappService;
    const socketService = req.socketService;

    const session = whatsappService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Emit status update via socket
    socketService.sessionStatusChanged(sessionId, session.status, {
      isActive: session.isActive(),
      lastActivity: session.lastActivity,
      qrCode: session.qrCode
    });

    res.json({
      success: true,
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        isActive: session.isActive(),
        lastActivity: session.lastActivity,
        qrCode: session.qrCode
      },
      message: 'Session status refreshed'
    });
  } catch (error) {
    logger.error('Error refreshing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh session'
    });
  }
});

// Get session QR code
router.get('/:sessionId/qr', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const whatsappService = req.whatsappService;

    const session = whatsappService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!session.qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not available'
      });
    }

    res.json({
      success: true,
      qrCode: session.qrCode
    });
  } catch (error) {
    logger.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code'
    });
  }
});

// Reconnect session
router.post('/:sessionId/reconnect', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const whatsappService = req.whatsappService;

    await whatsappService.reconnectSession(sessionId);
    
    logger.info(`Session reconnection initiated: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session reconnection initiated'
    });
  } catch (error) {
    logger.error('Error reconnecting session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconnect session'
    });
  }
});

// Logout session
router.post('/:sessionId/logout', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const whatsappService = req.whatsappService;

    await whatsappService.logoutSession(sessionId);
    
    logger.info(`Session logged out: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session logged out successfully'
    });
  } catch (error) {
    logger.error('Error logging out session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to logout session'
    });
  }
});

export default router;