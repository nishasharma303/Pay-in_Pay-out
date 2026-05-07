import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, isAdmin, isAnyRole } from '../middlewares/auth';

export const userRouter = Router();

userRouter.use(authenticate as any);

userRouter.get('/', isAnyRole as any, userController.listUsers as any);
userRouter.get('/:id', isAnyRole as any, userController.getUserById as any);
userRouter.patch('/:id/toggle-status', isAdmin as any, userController.toggleStatus as any);
userRouter.patch('/:id/kyc/review', isAdmin as any, userController.reviewKyc as any);