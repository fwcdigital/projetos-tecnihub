import express, { Express } from 'express';
import path from 'node:path';
import { initDatabase } from './db.js';
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { clientRouter } from './routes/clientRoutes.js';
import { projectRouter } from './routes/projectRoutes.js';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { taskRouter } from './routes/taskRoutes.js';
import { routineRouter } from './routes/routineRoutes.js';
import { projectStatusRouter } from './routes/projectStatusRoutes.js';
import { productRouter } from './routes/productRoutes.js';

export async function createApiApp(): Promise<Express> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  await initDatabase();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Tecnihub CRM & Project Management API',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/clients', clientRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/project-statuses', projectStatusRouter);
  app.use('/api/products', productRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/routines', routineRouter);

  return app;
}

export function serveProductionFrontend(app: Express, distDirectory: string): void {
  const indexPath = path.join(distDirectory, 'index.html');

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota de API não encontrada.' });
  });
  app.use(express.static(distDirectory, { index: false }));
  app.get('*', (_req, res) => {
    res.sendFile(indexPath);
  });
}

export function configuredPort(): number {
  const candidate = Number(process.env.PORT);
  return Number.isInteger(candidate) && candidate > 0 && candidate <= 65535 ? candidate : 3000;
}

export function listen(app: Express): void {
  const port = configuredPort();
  app.listen(port, '0.0.0.0', () => {
    console.log(`[TECNIHUB SERVER] Executando com sucesso em http://0.0.0.0:${port}`);
  });
}
