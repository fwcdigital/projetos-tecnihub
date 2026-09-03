import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { setDatabasePoolForTests } from '../server/database/connection.js';
import { clientRepository, projectRepository, taskRepository, userRepository } from '../server/db.js';
import { generateToken } from '../server/auth.js';
import { taskRouter } from '../server/routes/taskRoutes.js';
import { projectRouter } from '../server/routes/projectRoutes.js';
import { projectStatusRouter } from '../server/routes/projectStatusRoutes.js';
import { userRouter } from '../server/routes/userRoutes.js';
import { authRouter } from '../server/routes/authRoutes.js';

const migrationsDirectory = path.resolve(process.cwd(), 'server', 'database', 'migrations');

async function createDatabase(): Promise<PGlite> {
  const database = new PGlite();
  await database.exec('CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const file of fs.readdirSync(migrationsDirectory).filter(file => file.endsWith('.sql')).sort()) {
    await database.exec(fs.readFileSync(path.join(migrationsDirectory, file), 'utf8'));
  }
  return database;
}

function useAsPool(database: PGlite): void {
  const query = (text: string, values?: unknown[]) => database.query(text, values);
  const adapter = { query, connect: async () => ({ query, release: () => undefined }), on: () => adapter, end: () => database.close() } as unknown as Pool;
  setDatabasePoolForTests(adapter);
}

test('rotas aplicam a matriz operacional de RBAC e preservam status em uso', async () => {
  const database = await createDatabase();
  useAsPool(database);
  const ids = {
    superAdmin: '00000000-0000-4000-8000-000000000005',
    admin: '00000000-0000-4000-8000-000000000001',
    manager: '00000000-0000-4000-8000-000000000002',
    collaborator: '00000000-0000-4000-8000-000000000003',
    collaboratorTwo: '00000000-0000-4000-8000-000000000004'
  };
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
  try {
    const initialPassword = 'Initial@123';
    const passwordHash = await bcrypt.hash(initialPassword, 4);
    for (const [id, name, email, role] of [
      [ids.superAdmin, 'Super Admin', 'superadmin@rbac.local', 'SUPER_ADMIN'],
      [ids.admin, 'Admin', 'admin@rbac.local', 'ADMIN'],
      [ids.manager, 'Gestor', 'gestor@rbac.local', 'PROJECT_MANAGER'],
      [ids.collaborator, 'Colaborador', 'colaborador@rbac.local', 'COLLABORATOR'],
      [ids.collaboratorTwo, 'Colaborador 2', 'colaborador2@rbac.local', 'COLLABORATOR']
    ]) {
      await database.query('INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [id, name, email, passwordHash, role]);
    }
    const client = await clientRepository.create({ name: 'Cliente', company_name: 'Cliente Ltda', logo: 'CL', contact_name: '', email: '', phone: '', status: 'ACTIVE', lead_manager_id: ids.manager, notes: '', monthly_services: [] });
    const project = await projectRepository.create({ name: 'Projeto', description: '', client_id: client.id, project_type: 'WEBSITE', manager_id: ids.manager, status: 'PLANNING', priority: 'NORMAL', start_date: '2026-09-01', due_date: '2026-09-30', progress: 0, is_recurring: false, created_by: ids.admin }, [ids.collaborator, ids.collaboratorTwo]);
    const secondProject = await projectRepository.create({ name: 'Projeto 2', description: '', client_id: client.id, project_type: 'SEO', manager_id: ids.manager, status: 'PLANNING', priority: 'NORMAL', start_date: null, due_date: null, progress: 0, is_recurring: false, created_by: ids.admin }, [ids.collaborator]);
    const task = await taskRepository.create({ project_id: project.id, title: 'Tarefa', description: '', responsible_user_id: ids.collaborator, assignee_ids: [ids.collaborator], status: 'A_FAZER', priority: 'NORMAL', start_date: null, due_date: '2026-09-10', due_time: null, completed_at: null, created_by: ids.admin });

    const app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRouter);
    app.use('/api/projects', projectRouter);
    app.use('/api/project-statuses', projectStatusRouter);
    app.use('/api/users', userRouter);
    app.use('/api/auth', authRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = async (id: string) => {
      const user = await userRepository.findById(id);
      assert.ok(user);
      return generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    };
    const request = async (pathName: string, authToken: string, method: string, body?: unknown) => fetch(`${baseUrl}${pathName}`, {
      method,
      headers: { Authorization: `Bearer ${authToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const collaboratorToken = await token(ids.collaborator);
    const managerToken = await token(ids.manager);
    const adminToken = await token(ids.admin);

    for (const [email, role] of [
      ['superadmin@rbac.local', 'SUPER_ADMIN'],
      ['admin@rbac.local', 'ADMIN'],
      ['gestor@rbac.local', 'PROJECT_MANAGER'],
      ['colaborador@rbac.local', 'COLLABORATOR']
    ]) {
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: initialPassword })
      });
      assert.equal(loginResponse.status, 200);
      assert.equal((await loginResponse.json() as any).user.role, role);
    }

    assert.equal((await request('/api/users', managerToken, 'POST', { name: 'Sem permissão', email: 'blocked@rbac.local', password: initialPassword, role: 'COLLABORATOR' })).status, 403);
    assert.equal((await request(`/api/users/${ids.manager}`, managerToken, 'PUT', { job_title: 'Administração indevida' })).status, 403);
    assert.equal((await request(`/api/users/${ids.admin}`, adminToken, 'PUT', { role: 'COLLABORATOR' })).status, 403);

    const createdUserResponse = await request('/api/users', adminToken, 'POST', {
      name: 'Usuário gerenciado', email: 'managed@rbac.local', password: 'Managed@123', role: 'COLLABORATOR', job_title: 'Cargo inicial', status: 'ACTIVE'
    });
    assert.equal(createdUserResponse.status, 201);
    const createdUser = (await createdUserResponse.json() as any).user;
    const updatedUserResponse = await request(`/api/users/${createdUser.id}`, adminToken, 'PUT', {
      name: 'Usuário atualizado', email: 'managed.updated@rbac.local', password: 'Reset@123', role: 'PROJECT_MANAGER', job_title: 'Novo cargo', status: 'INACTIVE'
    });
    assert.equal(updatedUserResponse.status, 200);
    const updatedUser = (await updatedUserResponse.json() as any).user;
    assert.equal(updatedUser.role, 'PROJECT_MANAGER');
    assert.equal(updatedUser.job_title, 'Novo cargo');
    assert.equal(updatedUser.status, 'INACTIVE');
    const storedManagedUser = await userRepository.findByEmail('managed.updated@rbac.local');
    assert.ok(storedManagedUser);
    assert.notEqual(storedManagedUser.password_hash, 'Reset@123');
    assert.equal(await bcrypt.compare('Reset@123', storedManagedUser.password_hash), true);

    assert.equal((await request('/api/auth/change-password', collaboratorToken, 'POST', { current_password: 'incorreta', new_password: 'Changed@123' })).status, 400);
    assert.equal((await request('/api/auth/change-password', collaboratorToken, 'POST', { current_password: initialPassword, new_password: 'Changed@123' })).status, 200);
    const oldPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'colaborador@rbac.local', password: initialPassword })
    });
    assert.equal(oldPasswordLogin.status, 401);
    const newPasswordLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'colaborador@rbac.local', password: 'Changed@123' })
    });
    assert.equal(newPasswordLogin.status, 200);

    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { title: 'Título operacional', start_date: '2026-09-02', due_date: '2026-09-11', status: 'EM_ANDAMENTO' })).status, 200);
    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { participantIds: [ids.manager] })).status, 403);
    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { projectId: secondProject.id })).status, 403);
    assert.equal((await request('/api/tasks', collaboratorToken, 'POST', { title: 'Tentativa de atribuição', projectId: project.id, participantIds: [ids.manager], dueDate: '2026-09-12' })).status, 403);
    const checklistResponse = await request(`/api/tasks/${task.id}/checklist`, collaboratorToken, 'POST', { title: 'Item operacional' });
    assert.equal(checklistResponse.status, 201);
    const checklistTask = (await checklistResponse.json() as any).task;
    assert.equal((await request(`/api/tasks/${task.id}/checklist/${checklistTask.checklist[0].id}`, collaboratorToken, 'PUT', { assigneeId: ids.manager })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, collaboratorToken, 'PUT', { client_id: client.id })).status, 403);

    assert.equal((await request(`/api/tasks/${task.id}`, managerToken, 'PUT', { participantIds: [ids.collaborator, ids.collaboratorTwo] })).status, 200);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', {
      team_user_ids: [ids.collaborator],
      project_type: 'SEO',
      client_id: client.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH'
    })).status, 200);
    const operationalProject = await projectRepository.findById(project.id);
    assert.equal(operationalProject?.project_type, 'SEO');
    assert.equal(operationalProject?.client_id, client.id);
    assert.equal(operationalProject?.status, 'IN_PROGRESS');
    assert.equal(operationalProject?.priority, 'HIGH');
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', { manager_id: ids.manager })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', { start_date: '2026-09-03' })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, adminToken, 'PUT', { manager_id: ids.manager, start_date: '2026-09-03', due_date: '2026-10-01' })).status, 200);

    assert.equal((await request('/api/project-statuses', managerToken, 'POST', { name: 'Novo', color: '#38BDF8' })).status, 403);
    const createStatusResponse = await request('/api/project-statuses', adminToken, 'POST', { name: 'Aguardando aprovação', color: '#38BDF8' });
    assert.equal(createStatusResponse.status, 201);
    const createdStatus = (await createStatusResponse.json() as any).status;
    const assignStatusResponse = await request(`/api/projects/${project.id}`, adminToken, 'PUT', { status: createdStatus.id });
    assert.equal(assignStatusResponse.status, 200, await assignStatusResponse.text());
    const removeResponse = await request(`/api/project-statuses/${createdStatus.id}`, adminToken, 'DELETE');
    assert.equal(removeResponse.status, 200);
    assert.equal((await removeResponse.json() as any).deactivated, true);
    assert.equal((await projectRepository.findById(project.id))?.status, createdStatus.id);
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    setDatabasePoolForTests(null);
    await database.close();
  }
});
