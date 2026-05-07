import { Router } from 'express';
import * as servicesController from '../controllers/services.controller';
import { authenticate, isAnyRole } from '../middlewares/auth';

export const servicesRouter = Router();
servicesRouter.use(authenticate as any);

servicesRouter.post('/process', isAnyRole as any, servicesController.processService as any);
servicesRouter.get('/history', isAnyRole as any, servicesController.getHistory as any);