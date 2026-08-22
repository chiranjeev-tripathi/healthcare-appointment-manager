import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';
import { config } from '../config';

/**
 * Global error handling middleware.
 * Catches all errors and returns consistent JSON responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('[Error]', err);
  }

  // Our custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        error: `A record with this ${target} already exists.`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found.',
        code: 'NOT_FOUND',
      });
      return;
    }
  }

  // Prisma transaction serialization failure
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    if (err.message.includes('could not serialize access')) {
      res.status(409).json({
        success: false,
        error: 'This slot is no longer available. Please choose another time.',
        code: 'SLOT_UNAVAILABLE',
      });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (err as any).errors,
    });
    return;
  }

  // Fallback: internal server error
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'INTERNAL_ERROR',
  });
}
