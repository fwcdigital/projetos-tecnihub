import 'dotenv/config';
import { closeDatabase, withTransaction } from './connection.js';

const testUserIds = [
  '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000009'
];
const testClientIds = ['10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000102'];
const testProjectIds = ['20000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000102'];

async function clear(): Promise<void> {
  await withTransaction(async client => {
    await client.query("DELETE FROM projects WHERE name = '[TESTE] Projeto CRUD'");
    await client.query('DELETE FROM tasks WHERE project_id = ANY($1::uuid[])', [testProjectIds]);
    await client.query('DELETE FROM projects WHERE id = ANY($1::uuid[])', [testProjectIds]);
    await client.query('DELETE FROM clients WHERE id = ANY($1::uuid[])', [testClientIds]);
    await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [testUserIds]);
    await client.query("DELETE FROM users WHERE email = 'usuario.crud.teste@tecnihub.local'");
  });
  console.log('[DB] Dados identificados com [TESTE] removidos.');
}

clear().catch(error => {
  console.error('[DB] Falha ao remover dados de teste:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
