import 'dotenv/config';
import path from 'node:path';
import { createApiApp, listen, serveProductionFrontend } from './server/app.js';

async function startProductionServer(): Promise<void> {
  const app = await createApiApp();
  serveProductionFrontend(app, path.resolve(process.cwd(), 'dist'));
  listen(app);
}

startProductionServer().catch(error => {
  console.error('[TECNIHUB SERVER] Falha fatal ao iniciar servidor:', error);
  process.exit(1);
});
