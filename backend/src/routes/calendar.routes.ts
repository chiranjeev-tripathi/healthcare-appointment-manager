import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { calendarService } from '../services/calendar.service';

const router = Router();

// Middleware to ensure doctor role (assume it exists or will be applied in index)
// We just cast req to AuthRequest

router.get('/auth-url', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only doctors can access calendar auth.' });
    }

    const url = calendarService.getAuthUrl(req.user.id);
    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // Doctor ID

    if (!code || !state) {
      return res.status(400).json({ success: false, message: 'Missing code or state parameters.' });
    }

    await calendarService.handleCallback(state, code);
    
    res.json({ success: true, message: 'Google Calendar linked successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
