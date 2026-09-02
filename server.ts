import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/routes/authRoutes.js';
import { userRouter } from './server/routes/userRoutes.js';
import { clientRouter } from './server/routes/clientRoutes.js';
import { projectRouter } from './server/routes/projectRoutes.js';
import { dashboardRouter } from './server/routes/dashboardRoutes.js';
import { taskRouter } from './server/routes/taskRoutes.js';

async function startServer() {
  const app = express();
  const configuredPort = Number(process.env.PORT);
  const PORT = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
    ? configuredPort
    : 3000;

  // Middlewares essenciais
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Inicializar banco de dados relacional e seeds
  await initDatabase();

  // Rota de Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Tecnihub CRM & Project Management API',
      timestamp: new Date().toISOString()
    });
  });

  // Rotas da API REST
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/clients', clientRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/tasks', taskRouter);

  // Integração com Vite Middleware para Desenvolvimento / Produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TECNIHUB SERVER] Executando com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[TECNIHUB SERVER] Falha fatal ao iniciar servidor:', err);
  process.exit(1);
});
