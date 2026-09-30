import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import claimRoutes from './routes/claim.routes.js';
import handoverRoutes from './routes/handover.routes.js';
import itemRoutes from './routes/item.routes.js';
import matchingRoutes from './routes/matching.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import storageRoutes from './routes/storage.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/items', storageRoutes);
app.use('/api/handover', handoverRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/matches', matchingRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
