import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' },
  });
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      },
    });
  }

  // Known app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code, details: err.details },
    });
  }

  // Prisma errors - Fixed version without type conversion issues
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle duplicate unique constraint
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.[0] || 'Field';
      return res.status(409).json({
        success: false,
        error: {
          message: `${target} already exists`,
          code: 'DUPLICATE_ENTRY',
        },
      });
    }
    
    // Handle record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Other Prisma errors
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      },
    });
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.message === 'Unexpected field') message = 'Invalid file field name';
    if (err.message === 'File too large') message = 'File too large';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPLOAD_ERROR',
      },
    });
  }

  // Unknown errors — don't leak details in production
  console.error('[Unhandled Error]', err);
  
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};