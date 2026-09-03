import 'dotenv/config';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { closeDatabase, withTransaction } from './connection.js';

const provisionalPassword = 'TecniHub2006';
const desiredUsers = [
  { preferredId: '00000000-0000-4000-8000-000000000010', name: 'Caio', email: 'caio@tecnihub.com.br', role: 'ADMIN', jobTitle: 'Administrador' },
  { preferredId: '00000000-0000-4000-8000-000000000011', name: 'Fabricio', email: 'fabricio@tecnihub.com.br', role: 'ADMIN', jobTitle: 'Administrador' },
  { preferredId: '00000000-0000-4000-8000-000000000006', name: 'Kelvin', email: 'kelvin@tecnihub.com.br', role: 'PROJECT_MANAGER', jobTitle: 'Gestor de Projetos' },
  { preferredId: '00000000-0000-4000-8000-000000000007', name: 'Gabriel', email: 'gabriel@tecnihub.com.br', role: 'COLLABORATOR', jobTitle: 'Colaborador' }
] as const;

type DesiredUser = typeof desiredUsers[number];

async function tableExists(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
  return result.rows[0].exists;
}

async function ensureUser(client: PoolClient, user: DesiredUser): Promise<string> {
  const existingByEmail = await client.query<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [user.email]);
  const existingById = await client.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [user.preferredId]);
  const id = existingByEmail.rows[0]?.id || existingById.rows[0]?.id || user.preferredId;
  const passwordHash = await bcrypt.hash(provisionalPassword, 10);

  if (existingByEmail.rowCount || existingById.rowCount) {
    await client.query(
      `UPDATE users
       SET name = $2, email = LOWER($3), password_hash = $4, role = $5, job_title = $6, status = 'ACTIVE'
       WHERE id = $1`,
      [id, user.name, user.email, passwordHash, user.role, user.jobTitle]
    );
  } else {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, job_title, status)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, 'ACTIVE')`,
      [id, user.name, user.email, passwordHash, user.role, user.jobTitle]
    );
  }
  return id;
}

async function resetTestUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Limpeza de usuários de teste bloqueada em NODE_ENV=production.');
  }

  const result = await withTransaction(async client => {
    const legacyBefore = await client.query<{ id: string }>(
      `SELECT id FROM users
       WHERE email ILIKE '%.teste@tecnihub.local'
          OR email ILIKE '%@tecnihub.local'
          OR name ILIKE '[TESTE]%'`
    );
    const desiredBefore = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM users WHERE LOWER(email) = ANY($1::text[])',
      [desiredUsers.map(user => user.email)]
    );
    if (!legacyBefore.rowCount && Number(desiredBefore.rows[0].count) !== desiredUsers.length) {
      throw new Error('A base não possui a assinatura esperada de dados de teste; nenhuma alteração foi aplicada.');
    }

    const ids = new Map<string, string>();
    for (const user of desiredUsers) ids.set(user.email, await ensureUser(client, user));

    const desiredIds = [...ids.values()];
    const obsoleteResult = await client.query<{ id: string }>(
      `SELECT id FROM users
       WHERE (email ILIKE '%.teste@tecnihub.local' OR email ILIKE '%@tecnihub.local' OR name ILIKE '[TESTE]%')
         AND NOT (id = ANY($1::uuid[]))`,
      [desiredIds]
    );
    const obsoleteIds = obsoleteResult.rows.map(row => row.id);
    const fabricioId = ids.get('fabricio@tecnihub.com.br')!;
    const kelvinId = ids.get('kelvin@tecnihub.com.br')!;
    const gabrielId = ids.get('gabriel@tecnihub.com.br')!;

    if (obsoleteIds.length) {
      await client.query('UPDATE clients SET lead_manager_id = $1 WHERE lead_manager_id = ANY($2::uuid[])', [kelvinId, obsoleteIds]);
      await client.query('UPDATE projects SET manager_id = $1 WHERE manager_id = ANY($2::uuid[])', [kelvinId, obsoleteIds]);
      await client.query('UPDATE projects SET created_by = $1 WHERE created_by = ANY($2::uuid[])', [fabricioId, obsoleteIds]);
      await client.query('UPDATE tasks SET responsible_user_id = $1 WHERE responsible_user_id = ANY($2::uuid[])', [gabrielId, obsoleteIds]);
      await client.query('UPDATE tasks SET created_by = $1 WHERE created_by = ANY($2::uuid[])', [fabricioId, obsoleteIds]);

      if (await tableExists(client, 'checklist_items')) {
        await client.query('UPDATE checklist_items SET responsible_user_id = $1 WHERE responsible_user_id = ANY($2::uuid[])', [gabrielId, obsoleteIds]);
      }
      if (await tableExists(client, 'project_resources')) {
        await client.query('UPDATE project_resources SET created_by = $1 WHERE created_by = ANY($2::uuid[])', [fabricioId, obsoleteIds]);
      }
      if (await tableExists(client, 'recurrence_rules')) {
        await client.query('UPDATE recurrence_rules SET created_by = $1 WHERE created_by = ANY($2::uuid[])', [fabricioId, obsoleteIds]);
      }
      if (await tableExists(client, 'task_comments')) {
        await client.query('UPDATE task_comments SET user_id = $1 WHERE user_id = ANY($2::uuid[])', [gabrielId, obsoleteIds]);
      }

      if (await tableExists(client, 'project_members')) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, member_role)
           SELECT DISTINCT project_id,
             CASE WHEN member_role = 'MANAGER' THEN $1::uuid ELSE $2::uuid END,
             member_role
           FROM project_members WHERE user_id = ANY($3::uuid[])
           ON CONFLICT (project_id, user_id) DO UPDATE SET member_role =
             CASE WHEN project_members.member_role = 'MANAGER' OR EXCLUDED.member_role = 'MANAGER' THEN 'MANAGER' ELSE 'COLLABORATOR' END`,
          [kelvinId, gabrielId, obsoleteIds]
        );
        await client.query('DELETE FROM project_members WHERE user_id = ANY($1::uuid[])', [obsoleteIds]);
      }
      if (await tableExists(client, 'task_assignees')) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id)
           SELECT DISTINCT task_id, $1::uuid FROM task_assignees WHERE user_id = ANY($2::uuid[])
           ON CONFLICT DO NOTHING`,
          [gabrielId, obsoleteIds]
        );
        await client.query('DELETE FROM task_assignees WHERE user_id = ANY($1::uuid[])', [obsoleteIds]);
      }

      await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [obsoleteIds]);
    }

    const verified = await client.query<{ email: string; role: string; status: string; password_hash: string }>(
      `SELECT email, role, status, password_hash FROM users
       WHERE LOWER(email) = ANY($1::text[]) ORDER BY email`,
      [desiredUsers.map(user => user.email)]
    );
    if (verified.rowCount !== desiredUsers.length) throw new Error('Não foi possível manter os quatro usuários de teste esperados.');
    for (const row of verified.rows) {
      const expected = desiredUsers.find(user => user.email === row.email.toLowerCase());
      if (!expected || row.role !== expected.role || row.status !== 'ACTIVE' || !await bcrypt.compare(provisionalPassword, row.password_hash)) {
        throw new Error(`Falha ao validar o usuário de teste ${row.email}.`);
      }
    }

    const lingering = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users
       WHERE email ILIKE '%.teste@tecnihub.local' OR email ILIKE '%@tecnihub.local' OR name ILIKE '[TESTE]%'`
    );
    if (Number(lingering.rows[0].count) !== 0) throw new Error('Ainda existem usuários legados de teste após a limpeza.');

    return { removed: obsoleteIds.length, users: verified.rows.map(({ password_hash: _passwordHash, ...user }) => user) };
  });

  console.log(JSON.stringify(result, null, 2));
}

resetTestUsers().catch(error => {
  console.error('[DB] Falha ao ajustar usuários de teste:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
