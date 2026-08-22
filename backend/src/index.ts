import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { prisma } from './config/database';
import { errorHandler } from './middleware/error-handler';

// Import routes
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import adminRoutes from './routes/admin.routes';
import bookingRoutes from './routes/booking.routes';
import visitRoutes from './routes/visit.routes';
import calendarRoutes from './routes/calendar.routes';

const app = express();

// ─── Middleware ───────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// ─── Health Check ────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ success: false, status: 'unhealthy', error: 'Database connection failed' });
  }
});

// ─── Routes ──────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/calendar', calendarRoutes);

// ─── 404 Handler ─────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL');

    // Start background workers (imported lazily to avoid boot-time errors when Redis isn't available)
    try {
      const { startAllWorkers } = await import('./jobs');
      startAllWorkers();
      console.log('[Jobs] Background workers started');
    } catch (err) {
      console.warn('[Jobs] Failed to start background workers (Redis may not be available):', (err as Error).message);
    }

    app.listen(config.port, () => {
      console.log(`[Server] Healthcare API running on port ${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export default app;
