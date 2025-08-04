import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      logger.debug(`Authenticated user: ${decoded.username}`);
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

export const rateLimitMiddleware = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const clients = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!clients.has(clientId)) {
      clients.set(clientId, { requests: 1, resetTime: now + windowMs });
      return next();
    }

    const client = clients.get(clientId);
    
    if (now > client.resetTime) {
      client.requests = 1;
      client.resetTime = now + windowMs;
      return next();
    }

    if (client.requests >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((client.resetTime - now) / 1000)
      });
    }

    client.requests++;
    next();
  };
};

export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (validApiKey && (!apiKey || apiKey !== validApiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};