import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().min(10).max(15).regex(/^\d+$/, 'Phone must contain only digits'),
  password: z.string().min(6),
  role:     z.enum(['CLIENT', 'AGENT']).optional().default('CLIENT'),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const getCookieOpts = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if trying to create AGENT account
    if (data.role === 'AGENT') {
      // Check if requester is admin (if authorization header exists)
      const authReq = req as AuthRequest;
      const userRole = authReq.user?.role as string;
      const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
      
      if (authReq.user && isAdmin) {
        // Admin can create agent - pass all required fields
        const user = await authService.registerUser({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: Role.AGENT
        });
        sendSuccess(res, user, 'Agent account created successfully', 201);
      } else {
        // Non-admin trying to create agent - create as CLIENT instead
        const user = await authService.registerUser({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: Role.CLIENT
        });
        sendSuccess(res, user, 'Account created successfully', 201);
      }
    } else {
      // Normal CLIENT registration
      const user = await authService.registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: Role.CLIENT
      });
      sendSuccess(res, user, 'Account created successfully', 201);
    }
  } catch (err) { 
    next(err); 
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginUser(email, password);
    res.cookie('refreshToken', result.refreshToken, getCookieOpts());
    sendSuccess(res, {
      user:         result.user,
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login successful');
  } catch (err) { 
    next(err); 
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenFromCookie  = req.cookies?.refreshToken;
    const tokenFromHeader  = req.headers['x-refresh-token'] as string | undefined;
    const token = (tokenFromCookie || tokenFromHeader)?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No refresh token', code: 'NO_TOKEN' },
      });
    }

    const result = await authService.refreshAccessToken(token);
    res.cookie('refreshToken', result.refreshToken, getCookieOpts());
    sendSuccess(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (err) { 
    next(err); 
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logoutUser(token.trim());
    res.clearCookie('refreshToken', { path: '/' });
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) { 
    next(err); 
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = await authService.getMe(authReq.user.userId);
    sendSuccess(res, user);
  } catch (err) { 
    next(err); 
  }
};