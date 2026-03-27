import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { projectsRouter } from './routes/projects';
import { memoriesRouter } from './routes/memories';
import { parametersRouter } from './routes/parameters';
import { scopeRouter } from './routes/scope';
import { workOrdersRouter } from './routes/workOrders';
import { dreRouter } from './routes/dre';
import { suppliesRouter } from './routes/supplies';
import { milestonesRouter } from './routes/milestones';
import { documentsRouter } from './routes/documents';
import { hubspotRouter } from './routes/hubspot';
import { auditRouter } from './routes/audit';
import { ratesRouter } from './routes/rates';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects', memoriesRouter);
app.use('/api/projects', parametersRouter);
app.use('/api/projects', scopeRouter);
app.use('/api/projects', workOrdersRouter);
app.use('/api/projects', dreRouter);
app.use('/api/projects', suppliesRouter);
app.use('/api/projects', milestonesRouter);
app.use('/api/projects', documentsRouter);
app.use('/api/hubspot', hubspotRouter);
app.use('/api/audit', auditRouter);
app.use('/api/rates', ratesRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
