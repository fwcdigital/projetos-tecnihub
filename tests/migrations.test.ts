import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationsDirectory = path.resolve(process.cwd(), 'server', 'database', 'migrations');

test('migrations criam o núcleo e tarefas no PostgreSQL com integridade e RLS', async () => {
  const database = new PGlite();
  try {
    await database.exec(`
      CREATE TABLE schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(migrationsDirectory).filter(file => file.endsWith('.sql')).sort();
    for (const file of files) {
      await database.exec(fs.readFileSync(path.join(migrationsDirectory, file), 'utf8'));
    }

    const managerId = '00000000-0000-4000-8000-000000000001';
    const collaboratorId = '00000000-0000-4000-8000-000000000002';
    const clientId = '10000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';

    await database.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, 'Gestor', 'gestor@example.com', 'bcrypt-hash', 'PROJECT_MANAGER'),
              ($2, 'Colaborador', 'colaborador@example.com', 'bcrypt-hash', 'COLLABORATOR')`,
      [managerId, collaboratorId]
    );
    await database.query(
      `INSERT INTO clients (id, name, company_name, lead_manager_id)
       VALUES ($1, 'Cliente', 'Cliente Ltda', $2)`,
      [clientId, managerId]
    );
    await database.query(
      `INSERT INTO projects (id, client_id, name, manager_id, created_by)
       VALUES ($1, $2, 'Projeto', $3, $3)`,
      [projectId, clientId, managerId]
    );
    await database.query(
      `INSERT INTO project_members (project_id, user_id, member_role)
       VALUES ($1, $2, 'MANAGER'), ($1, $3, 'COLLABORATOR')`,
      [projectId, managerId, collaboratorId]
    );

    await assert.rejects(
      database.query(
        `INSERT INTO project_members (project_id, user_id, member_role)
         VALUES ($1, $2, 'COLLABORATOR')`,
        [projectId, collaboratorId]
      ),
      /duplicate key|unique constraint/i
    );
    await assert.rejects(
      database.query(
        `INSERT INTO projects (client_id, name, manager_id)
         VALUES ('30000000-0000-4000-8000-000000000099', 'Inválido', $1)`,
        [managerId]
      ),
      /foreign key/i
    );
    await assert.rejects(
      database.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Inválido', 'invalido@example.com', 'hash', 'OWNER')`
      ),
      /check constraint/i
    );
    await assert.rejects(
      database.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Duplicado', 'GESTOR@EXAMPLE.COM', 'hash', 'COLLABORATOR')`
      ),
      /duplicate key|unique constraint/i
    );

    const tables = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    assert.deepEqual(
      tables.rows.map(row => row.table_name),
      ['clients', 'project_members', 'projects', 'schema_migrations', 'tasks', 'users']
    );

    const rls = await database.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT relname, relrowsecurity
       FROM pg_class
       WHERE relname IN ('users', 'clients', 'projects', 'project_members', 'tasks')`
    );
    assert.equal(rls.rows.length, 5);
    assert.ok(rls.rows.every(row => row.relrowsecurity));
  } finally {
    await database.close();
  }
});
