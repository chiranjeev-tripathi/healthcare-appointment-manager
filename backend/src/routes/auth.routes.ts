import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';
import { AuthRequest, ApiResponse, AppError, ValidationError, UnauthorizedError, ForbiddenError } from '../types';
import { authenticate, generateAccessToken, generateRefreshToken } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role).optional().default(Role.PATIENT)
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

router.post('/register', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { name, email, password, role } = parseResult.data;

    // Check if trying to create an ADMIN
    if (role === Role.ADMIN) {
      // Must be authenticated and be an admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication required to create ADMIN');
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        if (decoded.role !== Role.ADMIN) {
          throw new ForbiddenError('Only ADMIN can create an ADMIN');
        }
      } catch (err) {
        throw new UnauthorizedError('Invalid or expired token for ADMIN creation');
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role
      }
    });

    const authUser = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.status(201).json({
      success: true,
      data: {
        user: authUser,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const authUser = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.json({
      success: true,
      data: {
        user: authUser,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parseResult = RefreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { refreshToken } = parseResult.data;

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const authUser = { id: user.id, email: user.email, role: user.role, name: user.name };
    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(authUser);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        doctorProfile: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

export default router;
