import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { errorHandler, notFoundHandler } from './middlewares/error';
import { requestLogger } from './middlewares/logger';
import { apiLimiter, authLimiter, transactionLimiter } from './middlewares/rate-limit';
import { sanitizeBody, sanitizeQuery } from './middlewares/sanitize';
import { authRouter }       from './routes/auth.routes';
import { userRouter }       from './routes/user.routes';
import { walletRouter }     from './routes/wallet.routes';
import { kycRouter }        from './routes/kyc.routes';
import { payinRouter }      from './routes/payin.routes';
import { payoutRouter }     from './routes/payout.routes';
import { commissionRouter } from './routes/commission.routes';
import { adminRouter }      from './routes/admin.routes';
import { servicesRouter }   from './routes/services.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use('/api/pay-in/webhook',  express.raw({ type: 'application/json' }));
app.use('/api/pay-out/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);
app.use(sanitizeBody);
app.use(sanitizeQuery);

if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.use('/api/auth',     authLimiter);
app.use('/api/pay-in',   transactionLimiter);
app.use('/api/pay-out',  transactionLimiter);
app.use('/api/services', transactionLimiter);
app.use('/api',          apiLimiter);

app.use('/api/auth',        authRouter);
app.use('/api/users',       userRouter);
app.use('/api/wallet',      walletRouter);
app.use('/api/kyc',         kycRouter);
app.use('/api/pay-in',      payinRouter);
app.use('/api/pay-out',     payoutRouter);
app.use('/api/commissions', commissionRouter);
app.use('/api/admin',       adminRouter);
app.use('/api/services',    servicesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;