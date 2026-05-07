import { Router } from 'express';
import * as kycController from '../controllers/kyc.controller';
import { authenticate, isAdmin, isAnyRole } from '../middlewares/auth';
import { kycUpload } from '../middlewares/upload';

const router = Router();

router.use(authenticate as any);

router.post('/submit', isAnyRole as any, kycUpload, kycController.submitKyc as any);
router.get('/me', isAnyRole as any, kycController.getMyKyc as any);
router.get('/', isAdmin as any, kycController.listKycs as any);
router.get('/stats', isAdmin as any, kycController.getKycStats as any);
router.get('/:id', isAdmin as any, kycController.getKycById as any);
router.patch('/:id/review', isAdmin as any, kycController.reviewKyc as any);

export { router as kycRouter };