import { Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import { KycStatus } from '@prisma/client';
import * as kycService from '../services/kyc.service';
import * as uploadService from '../services/upload.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';

// Accept any string — empty becomes undefined
const optStr = () => z.union([z.string(), z.undefined(), z.null()])
  .transform(v => (!v || v === '') ? undefined : String(v));

// With regex — only validates if value actually present
const optStrRegex = (regex: RegExp, msg: string) =>
  z.union([z.string(), z.undefined(), z.null()])
    .transform(v => (!v || v === '') ? undefined : String(v))
    .refine(v => !v || regex.test(v), msg);

export const submitKyc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    
    // Handle both JSON and FormData
    let body = req.body;
    let files = req.files as Record<string, Express.Multer.File[]> | undefined;
    
    // If it's FormData with files, extract text fields from body
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // body already contains the parsed form-data fields
      body = {
        panNumber: req.body.panNumber,
        aadhaarNumber: req.body.aadhaarNumber,
        bankName: req.body.bankName,
        accountNumber: req.body.accountNumber,
        ifscCode: req.body.ifscCode,
        accountHolder: req.body.accountHolder,
      };
    }
    
    console.log('📝 KYC Submission Debug:');
    console.log('User ID:', authReq.user?.userId);
    console.log('Body:', body);
    console.log('Files:', files ? Object.keys(files) : 'No files');
    
    const schema = z.object({
      panNumber:     optStrRegex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN — must be like ABCDE1234F'),
      aadhaarNumber: optStrRegex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
      bankName:      optStr(),
      accountNumber: optStr(),
      ifscCode:      optStrRegex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC — must be like SBIN0001234'),
      accountHolder: optStr(),
    });

    const fields = schema.parse(body);

    // Upload documents if provided
    const fileMap: Record<string, string> = {
      panImage:     'panImageUrl',
      aadhaarFront: 'aadhaarFrontUrl',
      aadhaarBack:  'aadhaarBackUrl',
      selfie:       'selfieUrl',
    };

    const uploadedUrls: Record<string, string> = {};
    if (files) {
      for (const [fieldName, urlKey] of Object.entries(fileMap)) {
        const file = files[fieldName]?.[0];
        if (file) {
          uploadedUrls[urlKey] = await uploadService.uploadDocument(
            file.path, authReq.user.userId, `${authReq.user.userId}-${fieldName}`
          );
        }
      }
    }

    const kyc = await kycService.submitKyc(authReq.user.userId, { ...fields, ...uploadedUrls });
    sendSuccess(res, kyc, 'KYC submitted successfully. Under review.', 201);
  } catch (err) { 
    console.error('KYC Error:', err);
    next(err); 
  }
};

export const getMyKyc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    sendSuccess(res, await kycService.getMyKyc(authReq.user.userId));
  } catch (err) { next(err); }
};

export const listKycs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt((req.query.page  as string) || '1');
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const status = req.query.status as KycStatus | undefined;
    const result = await kycService.listKycSubmissions({ status, page, limit });
    sendSuccess(res, result.kycs, undefined, 200, result.meta);
  } catch (err) { next(err); }
};

export const getKycById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await kycService.getKycById(req.params.id));
  } catch (err) { next(err); }
};

export const reviewKyc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const schema = z.object({
      status:     z.enum([KycStatus.APPROVED, KycStatus.REJECTED]),
      reviewNote: z.string().max(500).optional(),
    });
    const { status, reviewNote } = schema.parse(req.body);
    const kyc = await kycService.reviewKyc(req.params.id, authReq.user.userId, status, reviewNote);
    sendSuccess(res, kyc, `KYC ${status.toLowerCase()} successfully`);
  } catch (err) { next(err); }
};

export const getKycStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await kycService.getKycStats());
  } catch (err) { next(err); }
};