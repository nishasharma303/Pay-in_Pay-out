import { Request, Response, NextFunction } from 'express';

// Strip dangerous HTML/script tags from string values
const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeValue(v)])
    );
  }
  return value;
};

// Prevent MongoDB/SQL injection patterns in query strings
const hasDangerousPattern = (value: string): boolean => {
  const patterns = [/\$where/i, /\$gt/i, /\$ne/i, /'.*OR.*'/i, /;.*DROP/i, /UNION.*SELECT/i];
  return patterns.some((p) => p.test(value));
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  next();
};

export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && hasDangerousPattern(value)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid query parameter', code: 'INVALID_QUERY' },
      });
    }
  }
  next();
};
