import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import { generateAndSavePostVisitSummary } from '../services/llm';

const router = Router();

router.use(authenticate);

router.post('/appointments/:id/notes', authorize([Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        const { clinicalNotes, prescription } = req.body;
        const notes = await prisma.visitNotes.create({
            data: {
                appointmentId: req.params.id,
                clinicalNotes,
                prescription,
            }
        });

        generateAndSavePostVisitSummary(req.params.id).catch(console.error);

        res.json({ success: true, data: notes });
    } catch (err) {
        next(err);
    }
});

router.post('/appointments/:id/notes/regenerate', authorize([Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        generateAndSavePostVisitSummary(req.params.id).catch(console.error);
        res.json({ success: true, message: 'Regeneration started' });
    } catch (err) {
        next(err);
    }
});

router.get('/appointments/:id/summary', authorize([Role.PATIENT, Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        const note = await prisma.visitNotes.findUnique({
            where: { appointmentId: req.params.id }
        });
        
        // Assuming aiPatientSummaryJson exists in the Prisma schema for VisitNotes
        const summaryObj = note ? (note as any).aiPatientSummaryJson : null;
        
        if (!note || !summaryObj) {
            res.json({ success: true, data: { summary: null, status: 'pending' } });
        } else {
            res.json({ success: true, data: { summary: summaryObj, status: 'completed' } });
        }
    } catch (err) {
        next(err);
    }
});

router.get('/appointments/:id/notes', authorize([Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        const note = await prisma.visitNotes.findUnique({
            where: { appointmentId: req.params.id }
        });
        res.json({ success: true, data: note });
    } catch (err) {
        next(err);
    }
});

export default router;
