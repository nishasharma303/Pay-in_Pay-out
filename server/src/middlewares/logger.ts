import morgan from 'morgan';
import { Request, Response } from 'express';

// Custom token: log authenticated userId
morgan.token('user-id', (req: Request) => (req as any).user?.userId || 'anonymous');
morgan.token('body-size', (req: Request) => `${JSON.stringify(req.body || {}).length}b`);

// Development: colorised human-readable format
export const devLogger = morgan('dev');

// Production: JSON structured logs (for log aggregators like Datadog/CloudWatch)
const jsonFormat = (tokens: any, req: Request, res: Response) => {
  const log = {
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res) || '0'),
    responseTime: `${tokens['response-time'](req, res)}ms`,
    userId: (req as any).user?.userId || null,
    ip: tokens['remote-addr'](req, res),
    userAgent: tokens['user-agent'](req, res),
  };

  // Don't log webhook raw bodies or auth passwords
  const isSensitive = req.path.includes('/auth/') || req.path.includes('/webhook');
  if (!isSensitive && process.env.LOG_BODY === 'true') {
    (log as any).bodySize = JSON.stringify(req.body || {}).length;
  }

  return JSON.stringify(log);
};

export const prodLogger = morgan(jsonFormat as any);

export const requestLogger = process.env.NODE_ENV === 'production' ? prodLogger : devLogger;
