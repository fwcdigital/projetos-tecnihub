import 'dotenv/config';
import path from 'node:path';
import { createApiApp, listen, serveProductionFrontend } from './server/app.js';

async function startServer(): Promise<void> {
  const app = await createApiApp();

  if (process.env.NODE_ENV === 'production') {
    serveProductionFrontend(app, path.resolve(process.cwd(), 'dist'));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  listen(app);
}

startServer().catch(error => {
  console.error('[TECNIHUB SERVER] Falha fatal ao iniciar servidor:', error);
  process.exit(1);
});
