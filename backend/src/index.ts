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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

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
