import { Router } from 'express';
import { holdSlot, confirmBooking, cancelBooking, completeAppointment } from '../services/booking.service';
// Assuming authenticate and authorize middleware exist in auth.middleware.ts or similar
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/hold', authorize([Role.PATIENT]), async (req: AuthRequest, res, next) => {
    try {
        const { doctorId, slotStart } = req.body;
        const appointment = await holdSlot({ doctorId, patientId: req.user!.id, slotStart });
        res.json({ success: true, data: appointment });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/confirm', authorize([Role.PATIENT]), async (req: AuthRequest, res, next) => {
    try {
        const { symptoms } = req.body;
        const data = await confirmBooking({ appointmentId: req.params.id, patientId: req.user!.id, symptoms });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/cancel', authorize([Role.PATIENT, Role.DOCTOR, Role.ADMIN]), async (req: AuthRequest, res, next) => {
    try {
        const appointment = await cancelBooking(req.params.id, req.user!.id, req.user!.role as Role);
        res.json({ success: true, data: appointment });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/complete', authorize([Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        const appointment = await completeAppointment(req.params.id, req.user!.id);
        res.json({ success: true, data: appointment });
    } catch (err) {
        next(err);
    }
});

router.get('/my', authorize([Role.PATIENT, Role.DOCTOR]), async (req: AuthRequest, res, next) => {
    try {
        const role = req.user!.role as Role;
        const appointments = await prisma.appointment.findMany({
            where: role === Role.PATIENT ? { patientId: req.user!.id } : { doctorId: req.user!.id },
            include: { symptomForm: true, visitNotes: true }
        });
        res.json({ success: true, data: appointments });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', authorize([Role.PATIENT, Role.DOCTOR, Role.ADMIN]), async (req: AuthRequest, res, next) => {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: req.params.id },
            include: { symptomForm: true, visitNotes: true }
        });
        res.json({ success: true, data: appointment });
    } catch (err) {
        next(err);
    }
});

export default router;
