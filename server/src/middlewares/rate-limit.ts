import rateLimit from 'express-rate-limit';

const createLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message, code: 'RATE_LIMIT_EXCEEDED' } },
    skip: (req) => req.path === '/health',
  });

// Auth — relaxed in dev, strict in prod
const isDev = process.env.NODE_ENV === 'development';

export const authLimiter        = createLimiter(15 * 60 * 1000, isDev ? 500 : 20,  'Too many auth attempts. Try again in 15 minutes.');
export const apiLimiter         = createLimiter(60 * 1000,       isDev ? 500 : 100, 'Too many requests. Slow down.');
export const transactionLimiter = createLimiter(60 * 1000,       isDev ? 200 : 20,  'Too many transaction requests per minute.');
export const uploadLimiter      = createLimiter(60 * 1000,       isDev ? 50  : 5,   'Too many uploads per minute.');