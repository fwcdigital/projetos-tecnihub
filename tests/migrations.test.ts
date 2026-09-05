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
    await database.query('INSERT INTO client_products (client_id, product_id) VALUES ($1, $2)', [clientId, 'SITE']);
    assert.deepEqual(
      (await database.query<{ product_id: string }>('SELECT product_id FROM client_products WHERE client_id = $1', [clientId])).rows.map(row => row.product_id),
      ['SITE']
    );
    await assert.rejects(
      database.query('INSERT INTO client_products (client_id, product_id) VALUES ($1, $2)', [clientId, 'SITE']),
      /duplicate key|unique constraint/i
    );
    await assert.rejects(
      database.query('INSERT INTO client_products (client_id, product_id) VALUES ($1, $2)', [clientId, 'PRODUTO_INEXISTENTE']),
      /foreign key/i
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
      ['checklist_items', 'client_products', 'clients', 'comment_mentions', 'deleted_client_snapshots', 'deleted_project_snapshots', 'notifications', 'product_statuses', 'product_task_template_items', 'product_task_templates', 'products', 'project_members', 'project_resources', 'project_statuses', 'projects', 'recurrence_rules', 'schema_migrations', 'task_assignees', 'task_comments', 'tasks', 'users']
    );

    const products = await database.query<{ id: string; name: string; position: number }>(
      'SELECT id, name, position FROM products ORDER BY position'
    );
    assert.deepEqual(products.rows.map(product => product.name), [
      'Site', 'Landing Page', 'E-commerce', 'Tráfego Pago', 'SEO', 'Manutenção', 'Interno', 'Outro'
    ]);

    const productStatusCounts = await database.query<{ product_id: string; total: number }>(
      `SELECT product_id, COUNT(*)::integer AS total
       FROM product_statuses
       GROUP BY product_id`
    );
    assert.deepEqual(
      Object.fromEntries(productStatusCounts.rows.map(row => [row.product_id, Number(row.total)])),
      { SITE: 10, LANDING_PAGE: 10, ECOMMERCE: 12, PAID_TRAFFIC: 9, SEO: 8, MAINTENANCE: 7, INTERNAL: 6, OTHER: 7 }
    );
    const templateCounts = await database.query<{ product_id: string; total: number }>(
      `SELECT template.product_id, COUNT(item.id)::integer AS total
       FROM product_task_templates template
       LEFT JOIN product_task_template_items item ON item.template_id = template.id
       GROUP BY template.product_id`
    );
    assert.deepEqual(
      Object.fromEntries(templateCounts.rows.map(row => [row.product_id, Number(row.total)])),
      { SITE: 13, LANDING_PAGE: 13, ECOMMERCE: 18, PAID_TRAFFIC: 15, SEO: 13, MAINTENANCE: 7, INTERNAL: 8, OTHER: 8 }
    );
    const configuredTemplateDefaults = await database.query<{ non_normal: number; configured_statuses: number }>(
      `SELECT COUNT(*) FILTER (WHERE priority <> 'NORMAL')::integer AS non_normal,
              COUNT(status_id)::integer AS configured_statuses
       FROM product_task_template_items`
    );
    assert.equal(Number(configuredTemplateDefaults.rows[0].non_normal), 0);
    assert.equal(Number(configuredTemplateDefaults.rows[0].configured_statuses), 0);

    const mappedProject = await database.query<{ product_id: string }>('SELECT product_id FROM projects WHERE id = $1', [projectId]);
    assert.equal(mappedProject.rows[0].product_id, 'SITE');
    const paidTrafficProjectId = '20000000-0000-4000-8000-000000000002';
    await database.query(
      `INSERT INTO projects (id, client_id, name, project_type, manager_id, created_by)
       VALUES ($1, $2, 'Google Ads legado', 'GOOGLE_ADS', $3, $3)`,
      [paidTrafficProjectId, clientId, managerId]
    );
    assert.equal(
      (await database.query<{ product_id: string }>('SELECT product_id FROM projects WHERE id = $1', [paidTrafficProjectId])).rows[0].product_id,
      'PAID_TRAFFIC'
    );
    await database.query("UPDATE projects SET product_status_id = 'SITE_PLANNING' WHERE id = $1", [projectId]);
    await assert.rejects(
      database.query("UPDATE projects SET product_status_id = 'SEO_PLANNING' WHERE id = $1", [projectId]),
      /foreign key/i
    );

    const taskColumns = await database.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'tasks' AND column_name IN ('start_date', 'start_time', 'due_date', 'due_time')`
    );
    assert.deepEqual(new Set(taskColumns.rows.map(row => row.column_name)), new Set(['start_date', 'start_time', 'due_date', 'due_time']));

    const commentColumns = await database.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'task_comments' AND column_name IN ('parent_comment_id', 'updated_at', 'deleted_at', 'deleted_by')`
    );
    assert.deepEqual(new Set(commentColumns.rows.map(row => row.column_name)), new Set(['parent_comment_id', 'updated_at', 'deleted_at', 'deleted_by']));

    const legacyTaskId = '30000000-0000-4000-8000-000000000001';
    await database.query(
      `INSERT INTO tasks (id, project_id, title, responsible_user_id, status, due_date, created_by)
       VALUES ($1, $2, 'Tarefa legada', $3, 'A_FAZER', '2026-09-10', $3)`,
      [legacyTaskId, projectId, collaboratorId]
    );
    assert.equal(
      (await database.query<{ status: string }>('SELECT status FROM tasks WHERE id = $1', [legacyTaskId])).rows[0].status,
      'SITE_PLANNING'
    );
    await assert.rejects(
      database.query(
        `INSERT INTO tasks (project_id, title, responsible_user_id, status, due_date, created_by)
         VALUES ($1, 'Status incompatível', $2, 'SEO_AUDIT', '2026-09-10', $2)`,
        [projectId, collaboratorId]
      ),
      /incompatível|constraint/i
    );
    const completedStatuses = await database.query<{ total: number }>(
      'SELECT COUNT(*)::integer AS total FROM product_statuses WHERE is_completed = TRUE'
    );
    assert.equal(Number(completedStatuses.rows[0].total), 8);

    const rls = await database.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT relname, relrowsecurity
       FROM pg_class
       WHERE relname IN ('users', 'clients', 'client_products', 'comment_mentions', 'deleted_client_snapshots', 'deleted_project_snapshots', 'notifications', 'products', 'product_statuses', 'product_task_templates', 'product_task_template_items', 'projects', 'project_members', 'project_statuses', 'tasks', 'task_assignees', 'task_comments', 'checklist_items', 'project_resources', 'recurrence_rules')`
    );
    assert.equal(rls.rows.length, 20);
    assert.ok(rls.rows.every(row => row.relrowsecurity));
  } finally {
    await database.close();
  }
});
