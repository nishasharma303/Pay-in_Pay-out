import { Response } from 'express';
import { ApiResponse } from '../types';

// BigInt cannot be JSON.stringify'd — convert to Number
const bigIntReplacer = (_key: string, value: unknown) => {
  if (typeof value === 'bigint') return Number(value);
  return value;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: ApiResponse['meta']
) => {
  const response: ApiResponse<T> = { success: true, data, message, meta };
  return res
    .status(statusCode)
    .setHeader('Content-Type', 'application/json')
    .end(JSON.stringify(response, bigIntReplacer));
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  code?: string
) => {
  const response: ApiResponse = { success: false, error: { message, code } };
  return res
    .status(statusCode)
    .setHeader('Content-Type', 'application/json')
    .end(JSON.stringify(response, bigIntReplacer));
};

export const paiseToRupees = (paise: bigint): string => (Number(paise) / 100).toFixed(2);
export const rupeesToPaise = (rupees: number): bigint => BigInt(Math.round(rupees * 100));

export const getPaginationParams = (query: { page?: string; limit?: string }) => {
  const page  = Math.max(1, parseInt(query.page  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  return { page, limit, skip: (page - 1) * limit };
};