import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { closeDatabase, withTransaction } from './connection.js';

const ids = {
  superAdmin: '00000000-0000-4000-8000-000000000001',
  kelvin: '00000000-0000-4000-8000-000000000006',
  gabriel: '00000000-0000-4000-8000-000000000007',
  caio: '00000000-0000-4000-8000-000000000010',
  fabricio: '00000000-0000-4000-8000-000000000011',
  clientA: '10000000-0000-4000-8000-000000000101',
  clientB: '10000000-0000-4000-8000-000000000102',
  projectA: '20000000-0000-4000-8000-000000000101',
  projectB: '20000000-0000-4000-8000-000000000102',
  taskA: '30000000-0000-4000-8000-000000000101',
  taskB: '30000000-0000-4000-8000-000000000102'
};

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Seed de demonstração bloqueado em produção. Defina ALLOW_DEMO_SEED=true apenas para uma execução consciente.');
  }
  const passwordHash = await bcrypt.hash('TecniHub2006', 10);

  await withTransaction(async client => {
    async function ensureUser(id: string, name: string, email: string, role: string, jobTitle: string): Promise<string> {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, job_title, status)
         VALUES ($1, $2, LOWER($3), $4, $5, $6, 'ACTIVE')
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role, job_title = EXCLUDED.job_title, status = 'ACTIVE'`,
        [id, name, email, passwordHash, role, jobTitle]
      );
      const result = await client.query<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (!result.rowCount) throw new Error(`Não foi possível resolver o usuário ${email}.`);
      return result.rows[0].id;
    }

    await ensureUser(ids.superAdmin, 'Administrador Principal', 'admin@tecnihub.com', 'SUPER_ADMIN', 'Diretor de Operações');
    await ensureUser(ids.caio, 'Caio', 'caio@tecnihub.com.br', 'ADMIN', 'Administrador');
    const fabricioId = await ensureUser(ids.fabricio, 'Fabricio', 'fabricio@tecnihub.com.br', 'ADMIN', 'Administrador');
    const kelvinId = await ensureUser(ids.kelvin, 'Kelvin', 'kelvin@tecnihub.com.br', 'PROJECT_MANAGER', 'Gestor de Projetos');
    const gabrielId = await ensureUser(ids.gabriel, 'Gabriel', 'gabriel@tecnihub.com.br', 'COLLABORATOR', 'Colaborador');

    const clients = [
      [ids.clientA, '[TESTE] Cliente A', '[TESTE] Cliente A Ltda', 'TA', kelvinId],
      [ids.clientB, '[TESTE] Cliente B', '[TESTE] Cliente B Ltda', 'TB', kelvinId]
    ];
    for (const row of clients) {
      await client.query(
        `INSERT INTO clients (id, name, company_name, logo, contact_name, email, status, lead_manager_id, monthly_services)
         VALUES ($1, $2, $3, $4, 'Contato de teste', '', 'ACTIVE', $5, ARRAY['Validação'])
         ON CONFLICT (id) DO UPDATE SET lead_manager_id = EXCLUDED.lead_manager_id`, row
      );
    }

    const projects = [
      [ids.projectA, ids.clientA, '[TESTE] Projeto A', 'Cenário controlado Kelvin/Gabriel.', kelvinId],
      [ids.projectB, ids.clientB, '[TESTE] Projeto B', 'Cenário controlado Kelvin/Gabriel.', kelvinId]
    ];
    for (const row of projects) {
      await client.query(
        `INSERT INTO projects (id, client_id, name, description, project_type, manager_id, status, priority, start_date, due_date, created_by)
         VALUES ($1, $2, $3, $4, 'INTERNAL', $5, 'IN_PROGRESS', 'NORMAL', '2026-09-02', '2026-09-30', $6)
         ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id, manager_id = EXCLUDED.manager_id`,
        [...row, fabricioId]
      );
    }

    await client.query('DELETE FROM project_members WHERE project_id = ANY($1::uuid[])', [[ids.projectA, ids.projectB]]);
    for (const [projectId, managerId, collaboratorId] of [[ids.projectA, kelvinId, gabrielId], [ids.projectB, kelvinId, gabrielId]]) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, member_role)
         VALUES ($1, $2, 'MANAGER'), ($1, $3, 'COLLABORATOR')
         ON CONFLICT (project_id, user_id) DO UPDATE SET member_role = EXCLUDED.member_role`,
        [projectId, managerId, collaboratorId]
      );
    }

    for (const row of [
      [ids.taskA, ids.projectA, '[TESTE] Tarefa do Projeto A', gabrielId, 'A_FAZER', 'ALTA', '2026-09-10', '10:00'],
      [ids.taskB, ids.projectB, '[TESTE] Tarefa do Projeto B', gabrielId, 'EM_ANDAMENTO', 'NORMAL', '2026-09-11', '14:00']
    ]) {
      await client.query(
        `INSERT INTO tasks (id, project_id, title, description, responsible_user_id, status, priority, start_date, due_date, due_time, created_by)
         VALUES ($1, $2, $3, 'Registro controlado para validação.', $4, $5, $6, '2026-09-02', $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET responsible_user_id = EXCLUDED.responsible_user_id, status = EXCLUDED.status`,
        [...row, fabricioId]
      );
    }
  });
  console.log('[DB] Seed [TESTE] concluído de forma idempotente para os quatro usuários manuais.');
}

seed().catch(error => {
  console.error('[DB] Falha no seed:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
