import Joi from 'joi';
import logger from '../utils/logger.js';

export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      logger.warn(`Validation error on ${req.method} ${req.path}:`, error.details[0].message);
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        validationError: true
      });
    }
    
    next();
  };
};

export const validateQuery = (schema) => {
  return validateRequest(schema, 'query');
};

export const validateParams = (schema) => {
  return validateRequest(schema, 'params');
};

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().required(),
  sessionId: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^\d+$/).required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate'))
  })
};

// Error handler for validation
export const handleValidationError = (error, req, res, next) => {
  if (error.isJoi) {
    logger.warn(`Joi validation error on ${req.method} ${req.path}:`, error.details[0].message);
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
      validationError: true
    });
  }
  
  next(error);
};