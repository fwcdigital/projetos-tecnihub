import { closeDatabase, getPool } from '../server/database/connection.js';
import { createApiApp } from '../server/app.js';

const password = 'TecniHub2006';
const accounts = [
  { email: 'caio@tecnihub.com.br', role: 'ADMIN' },
  { email: 'fabricio@tecnihub.com.br', role: 'ADMIN' },
  { email: 'kelvin@tecnihub.com.br', role: 'PROJECT_MANAGER' },
  { email: 'gabriel@tecnihub.com.br', role: 'COLLABORATOR' }
] as const;

async function validate(): Promise<void> {
  const legacy = await getPool().query<{ email: string }>(
    `SELECT email FROM users
     WHERE email ILIKE '%.teste@tecnihub.local' OR email ILIKE '%@tecnihub.local' OR name ILIKE '[TESTE]%'`
  );
  if (legacy.rowCount) throw new Error(`Ainda existem ${legacy.rowCount} usuários legados de teste.`);

  const app = await createApiApp();
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Servidor de validação não iniciou corretamente.');

    const verified: Array<{ email: string; role: string }> = [];
    for (const account of accounts) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password })
      });
      const data = await response.json() as any;
      if (response.status !== 200 || !data.token) throw new Error(`Login falhou para ${account.email}: HTTP ${response.status}.`);
      if (data.user.role !== account.role) throw new Error(`Role incorreto para ${account.email}: ${data.user.role}.`);
      verified.push({ email: account.email, role: data.user.role });
    }
    console.log(JSON.stringify({ verified }, null, 2));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

validate().catch(error => {
  console.error('[TESTE] Falha ao validar usuários:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
