import express from 'express';
import { StorageService } from '../services/storage.js';
import logger from '../utils/logger.js';

const router = express.Router();
const storage = new StorageService();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const whatsappService = req.whatsappService;
    const socketService = req.socketService;

    // System metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Service status checks
    const services = {
      storage: {
        status: 'healthy',
        details: 'Storage service operational'
      },
      whatsapp: {
        status: whatsappService ? 'healthy' : 'error',
        details: whatsappService ? 'WhatsApp service operational' : 'WhatsApp service not available',
        activeSessions: whatsappService ? whatsappService.getAllSessions().length : 0
      },
      socket: {
        status: socketService ? 'healthy' : 'error',
        details: socketService ? 'Socket service operational' : 'Socket service not available',
        connectedClients: socketService ? socketService.getConnectedClientsCount() : 0
      }
    };

    // Database/Storage health
    try {
      const stats = await storage.getStats();
      services.storage.sessions = stats.totalSessions;
      services.storage.messages = stats.totalMessages;
    } catch (error) {
      services.storage.status = 'warning';
      services.storage.details = `Storage warning: ${error.message}`;
    }

    // Overall health determination
    const hasErrors = Object.values(services).some(service => service.status === 'error');
    const hasWarnings = Object.values(services).some(service => service.status === 'warning');
    
    const overallStatus = hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

    const healthData = {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      services,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3001,
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Service-specific health checks
router.get('/whatsapp', (req, res) => {
  try {
    const whatsappService = req.whatsappService;
    
    if (!whatsappService) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        error: 'WhatsApp service not initialized'
      });
    }

    const sessions = whatsappService.getAllSessions();
    const activeSessions = sessions.filter(session => session.isActive());
    
    res.json({
      success: true,
      status: 'healthy',
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      inactiveSessions: sessions.length - activeSessions.length,
      sessions: sessions.map(session => ({
        id: session.id,
        name: session.name,
        status: session.status,
        isActive: session.isActive(),
        lastActivity: session.lastActivity
      }))
    });
  } catch (error) {
    logger.error('WhatsApp health check error:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

router.get('/storage', async (req, res) => {
  try {
    const stats = await storage.getStats();
    
    res.json({
      success: true,
      status: 'healthy',
      stats
    });
  } catch (error) {
    logger.error('Storage health check error:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

router.get('/socket', (req, res) => {
  try {
    const socketService = req.socketService;
    
    if (!socketService) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        error: 'Socket service not initialized'
      });
    }

    res.json({
      success: true,
      status: 'healthy',
      connectedClients: socketService.getConnectedClientsCount()
    });
  } catch (error) {
    logger.error('Socket health check error:', error);
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

// Readiness probe (for container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const whatsappService = req.whatsappService;
    const socketService = req.socketService;

    if (!whatsappService) {
      return res.status(503).json({
        success: false,
        ready: false,
        error: 'WhatsApp service not ready'
      });
    }

    if (!socketService) {
      return res.status(503).json({
        success: false,
        ready: false,
        error: 'Socket service not ready'
      });
    }

    // Test storage
    await storage.getStats();

    res.json({
      success: true,
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      success: false,
      ready: false,
      error: error.message
    });
  }
});

// Liveness probe (for container orchestration)
router.get('/live', (req, res) => {
  // Simple liveness check - just verify the process is running
  res.json({
    success: true,
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;