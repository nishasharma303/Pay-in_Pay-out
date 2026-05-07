import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

export const authRouter = Router();

// Public routes
authRouter.post('/register', authController.register as any);
authRouter.post('/login', authController.login as any);
authRouter.post('/refresh', authController.refresh as any);
authRouter.post('/logout', authController.logout as any);

// Protected routes
authRouter.get('/me', authenticate as any, authController.me as any);