import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { setDatabasePoolForTests } from '../server/database/connection.js';
import { clientRepository, projectRepository, routineRepository, taskRepository, userRepository } from '../server/db.js';
import { generateToken } from '../server/auth.js';
import { taskRouter } from '../server/routes/taskRoutes.js';
import { projectRouter } from '../server/routes/projectRoutes.js';
import { projectStatusRouter } from '../server/routes/projectStatusRoutes.js';
import { userRouter } from '../server/routes/userRoutes.js';
import { authRouter } from '../server/routes/authRoutes.js';
import { routineRouter } from '../server/routes/routineRoutes.js';
import { productRouter } from '../server/routes/productRoutes.js';

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
    const adminManagedProject = await projectRepository.create({ name: 'Projeto do Admin', description: '', client_id: client.id, project_type: 'SEO', manager_id: ids.admin, status: 'PLANNING', priority: 'NORMAL', start_date: null, due_date: null, progress: 0, is_recurring: false, created_by: ids.admin }, [ids.collaborator]);
    await taskRepository.create({ project_id: adminManagedProject.id, title: 'Tarefa apenas do projeto', description: '', responsible_user_id: ids.collaborator, assignee_ids: [ids.collaborator], status: 'A_FAZER', priority: 'NORMAL', start_date: null, due_date: '2026-09-11', due_time: null, completed_at: null, created_by: ids.admin });
    const adminTask = await taskRepository.create({ project_id: project.id, title: 'Tarefa operacional do admin', description: '', responsible_user_id: ids.admin, assignee_ids: [ids.admin, ids.superAdmin], status: 'A_FAZER', priority: 'NORMAL', start_date: null, due_date: '2026-09-12', due_time: null, completed_at: null, created_by: ids.manager });
    const completedAdminTask = await taskRepository.create({ project_id: project.id, title: 'Tarefa concluída do admin', description: '', responsible_user_id: ids.admin, assignee_ids: [ids.admin], status: 'CONCLUIDO', priority: 'NORMAL', start_date: null, due_date: '2026-09-09', due_time: null, completed_at: new Date().toISOString(), created_by: ids.manager });
    const ownSubtask = await taskRepository.create({ project_id: project.id, parent_task_id: adminTask.id, title: 'Subtarefa do admin', description: '', responsible_user_id: ids.admin, assignee_ids: [ids.admin], status: 'A_FAZER', priority: 'NORMAL', start_date: null, due_date: '2026-09-12', due_time: null, completed_at: null, created_by: ids.manager });
    await taskRepository.create({ project_id: project.id, parent_task_id: adminTask.id, title: 'Subtarefa de outro', description: '', responsible_user_id: ids.collaborator, assignee_ids: [ids.collaborator], status: 'A_FAZER', priority: 'NORMAL', start_date: null, due_date: '2026-09-12', due_time: null, completed_at: null, created_by: ids.manager });
    const adminRoutine = await routineRepository.upsert({ source_task_id: adminTask.id, frequency: 'SEMANAL', rule_text: 'Semanal', next_occurrence_date: '2026-09-19', created_by: ids.manager });
    await routineRepository.upsert({ source_task_id: task.id, frequency: 'MENSAL', rule_text: 'Mensal', next_occurrence_date: '2026-10-10', created_by: ids.admin });

    const app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRouter);
    app.use('/api/projects', projectRouter);
    app.use('/api/project-statuses', projectStatusRouter);
    app.use('/api/products', productRouter);
    app.use('/api/users', userRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/routines', routineRouter);
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
    const superAdminToken = await token(ids.superAdmin);

    const adminProjectsResponse = await request('/api/projects?operationalView=admin', adminToken, 'GET');
    assert.equal(adminProjectsResponse.status, 200);
    assert.deepEqual(new Set((await adminProjectsResponse.json() as any).projects.map((item: any) => item.id)), new Set([project.id, secondProject.id, adminManagedProject.id]));
    const operatorProjectsResponse = await request('/api/projects?operationalView=operator', adminToken, 'GET');
    assert.equal(operatorProjectsResponse.status, 200);
    assert.deepEqual((await operatorProjectsResponse.json() as any).projects.map((item: any) => item.id), [project.id]);
    assert.equal((await request(`/api/projects/${project.id}?operationalView=operator`, adminToken, 'GET')).status, 200);
    assert.equal((await request(`/api/projects/${adminManagedProject.id}?operationalView=operator`, adminToken, 'GET')).status, 404);
    assert.equal((await request('/api/projects?operationalView=operator', managerToken, 'GET')).status, 403);

    const adminDashboardResponse = await request('/api/tasks?operationalView=admin', adminToken, 'GET');
    assert.equal(adminDashboardResponse.status, 200);
    const adminDashboardTasks = (await adminDashboardResponse.json() as any).tasks;
    assert.ok(adminDashboardTasks.some((item: any) => item.id === task.id));
    const operatorDashboardResponse = await request('/api/tasks?operationalView=operator', adminToken, 'GET');
    assert.equal(operatorDashboardResponse.status, 200);
    const operatorDashboardTasks = (await operatorDashboardResponse.json() as any).tasks;
    assert.deepEqual(operatorDashboardTasks.map((item: any) => item.id), [adminTask.id]);
    assert.deepEqual(operatorDashboardTasks[0].subtasks.map((item: any) => item.id), [ownSubtask.id]);
    assert.equal(operatorDashboardTasks.some((item: any) => item.projectId === adminManagedProject.id), false);
    const adminProjectTasksResponse = await request(`/api/tasks?operationalView=admin&projectId=${project.id}`, adminToken, 'GET');
    assert.equal(adminProjectTasksResponse.status, 200);
    assert.deepEqual(new Set((await adminProjectTasksResponse.json() as any).tasks.map((item: any) => item.id)), new Set([task.id, adminTask.id]));
    const operatorProjectTasksResponse = await request(`/api/tasks?operationalView=operator&projectId=${project.id}`, adminToken, 'GET');
    assert.equal(operatorProjectTasksResponse.status, 200);
    assert.deepEqual((await operatorProjectTasksResponse.json() as any).tasks.map((item: any) => item.id), [adminTask.id]);
    assert.equal((await request(`/api/tasks/${task.id}?operationalView=operator`, adminToken, 'GET')).status, 403);
    assert.equal((await request(`/api/tasks/${adminTask.id}?operationalView=operator`, adminToken, 'GET')).status, 200);
    const completedOperatorResponse = await request('/api/tasks?operationalView=operator&completedOnly=true', adminToken, 'GET');
    assert.equal(completedOperatorResponse.status, 200);
    assert.deepEqual((await completedOperatorResponse.json() as any).tasks.map((item: any) => item.id), [completedAdminTask.id]);
    const superAdminOperatorResponse = await request('/api/tasks?operationalView=operator', superAdminToken, 'GET');
    assert.equal(superAdminOperatorResponse.status, 200);
    assert.deepEqual((await superAdminOperatorResponse.json() as any).tasks.map((item: any) => item.id), [adminTask.id]);
    assert.equal((await request('/api/tasks?operationalView=operator', managerToken, 'GET')).status, 403);
    const operatorRoutinesResponse = await request('/api/routines?operationalView=operator', adminToken, 'GET');
    assert.equal(operatorRoutinesResponse.status, 200);
    assert.deepEqual((await operatorRoutinesResponse.json() as any).routines.map((item: any) => item.id), [adminRoutine.id]);
    assert.equal((await request('/api/routines?operationalView=operator', managerToken, 'GET')).status, 403);

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

    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { title: 'Título operacional', start_date: '2026-09-02', due_date: '2026-09-11', status: 'SITE_DEVELOPMENT' })).status, 200);
    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { status: 'SEO_AUDIT' })).status, 400);
    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { participantIds: [ids.manager] })).status, 403);
    assert.equal((await request(`/api/tasks/${task.id}`, collaboratorToken, 'PUT', { projectId: secondProject.id })).status, 403);
    assert.equal((await request('/api/tasks', collaboratorToken, 'POST', { title: 'Tentativa de atribuição', projectId: project.id, participantIds: [ids.manager], dueDate: '2026-09-12' })).status, 403);
    const checklistResponse = await request(`/api/tasks/${task.id}/checklist`, collaboratorToken, 'POST', { title: 'Item operacional' });
    assert.equal(checklistResponse.status, 201);
    const checklistTask = (await checklistResponse.json() as any).task;
    assert.equal((await request(`/api/tasks/${task.id}/checklist/${checklistTask.checklist[0].id}`, collaboratorToken, 'PUT', { assigneeId: ids.manager })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, collaboratorToken, 'PUT', { client_id: client.id })).status, 403);

    assert.equal((await request(`/api/tasks/${task.id}`, managerToken, 'PUT', { participantIds: [ids.collaborator, ids.collaboratorTwo] })).status, 200);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', { product_status_id: 'SEO_IMPLEMENTATION' })).status, 400);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', {
      team_user_ids: [ids.collaborator],
      product_id: 'SEO',
      client_id: client.id,
      product_status_id: 'SEO_IMPLEMENTATION',
      priority: 'HIGH'
    })).status, 200);
    const operationalProject = await projectRepository.findById(project.id);
    assert.equal(operationalProject?.project_type, 'SEO');
    assert.equal(operationalProject?.productId, 'SEO');
    assert.equal(operationalProject?.projectStatusId, 'SEO_IMPLEMENTATION');
    assert.equal(operationalProject?.client_id, client.id);
    assert.equal(operationalProject?.status, 'PLANNING');
    assert.equal(operationalProject?.priority, 'HIGH');
    const remappedWorkflowTasks = await database.query<{ id: string; status: string; product_id: string; completed_at: Date | null }>(
      `SELECT task.id, task.status, workflow.product_id, task.completed_at
       FROM tasks task
       INNER JOIN product_statuses workflow ON workflow.id = task.status
       WHERE task.project_id = $1`,
      [project.id]
    );
    assert.ok(remappedWorkflowTasks.rows.every(item => item.product_id === 'SEO'));
    assert.equal(remappedWorkflowTasks.rows.find(item => item.id === completedAdminTask.id)?.status, 'SEO_COMPLETED');
    assert.ok(remappedWorkflowTasks.rows.find(item => item.id === completedAdminTask.id)?.completed_at);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', { manager_id: ids.manager })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, managerToken, 'PUT', { start_date: '2026-09-03' })).status, 403);
    assert.equal((await request(`/api/projects/${project.id}`, adminToken, 'PUT', { manager_id: ids.manager, start_date: '2026-09-03', due_date: '2026-10-01' })).status, 200);

    assert.equal((await request('/api/project-statuses', managerToken, 'POST', { name: 'Novo', color: '#38BDF8' })).status, 403);
    const createStatusResponse = await request('/api/project-statuses', adminToken, 'POST', { name: 'Aguardando aprovação', color: '#38BDF8' });
    assert.equal(createStatusResponse.status, 201);
    const createdStatus = (await createStatusResponse.json() as any).status;
    const assignStatusResponse = await request(`/api/projects/${project.id}`, adminToken, 'PUT', { product_status_id: createdStatus.id });
    assert.equal(assignStatusResponse.status, 400);
    const removeResponse = await request(`/api/project-statuses/${createdStatus.id}`, adminToken, 'DELETE');
    assert.equal(removeResponse.status, 200);
    assert.equal((await removeResponse.json() as any).removed, true);

    assert.equal((await request('/api/products', managerToken, 'POST', { name: 'Produto bloqueado', color: '#38BDF8' })).status, 403);
    const initialProductsResponse = await request('/api/products?includeInactive=true', adminToken, 'GET');
    assert.equal(initialProductsResponse.status, 200);
    const initialProducts = (await initialProductsResponse.json() as any).products;
    assert.equal(initialProducts.length, 8);
    assert.equal(initialProducts.some((product: any) => product.name === 'Social Media'), false);

    const createProductResponse = await request('/api/products', adminToken, 'POST', { name: 'Produto de teste', color: '#38BDF8' });
    assert.equal(createProductResponse.status, 201);
    const createdProduct = (await createProductResponse.json() as any).product;
    const updateProductResponse = await request(`/api/products/${createdProduct.id}`, superAdminToken, 'PUT', { name: 'Produto atualizado', color: '#A78BFA' });
    assert.equal(updateProductResponse.status, 200);
    assert.equal((await updateProductResponse.json() as any).product.color, '#A78BFA');

    const createProductStatusResponse = await request(`/api/products/${createdProduct.id}/statuses`, adminToken, 'POST', { name: 'Status de teste', color: '#34D399' });
    const createProductStatusPayload = await createProductStatusResponse.json() as any;
    assert.equal(createProductStatusResponse.status, 201, JSON.stringify(createProductStatusPayload));
    const createdProductStatus = createProductStatusPayload.status;
    assert.equal((await request(`/api/products/${createdProduct.id}/statuses/${createdProductStatus.id}`, managerToken, 'PUT', { name: 'Sem acesso' })).status, 403);
    const updateProductStatusResponse = await request(`/api/products/${createdProduct.id}/statuses/${createdProductStatus.id}`, superAdminToken, 'PUT', { name: 'Status atualizado', color: '#F59E0B' });
    assert.equal(updateProductStatusResponse.status, 200);
    assert.equal((await updateProductStatusResponse.json() as any).status.name, 'Status atualizado');

    await database.query('UPDATE projects SET product_id = $1, product_status_id = $2 WHERE id = $3', [createdProduct.id, createdProductStatus.id, project.id]);
    const removeProductStatusResponse = await request(`/api/products/${createdProduct.id}/statuses/${createdProductStatus.id}`, adminToken, 'DELETE');
    assert.equal(removeProductStatusResponse.status, 200);
    assert.equal((await removeProductStatusResponse.json() as any).deactivated, true);
    const reactivateProductStatusResponse = await request(`/api/products/${createdProduct.id}/statuses/${createdProductStatus.id}`, adminToken, 'PUT', { active: true });
    assert.equal(reactivateProductStatusResponse.status, 200);
    assert.equal((await reactivateProductStatusResponse.json() as any).status.active, true);
    const removeProductResponse = await request(`/api/products/${createdProduct.id}`, adminToken, 'DELETE');
    assert.equal(removeProductResponse.status, 200);
    assert.equal((await removeProductResponse.json() as any).deactivated, true);
    const reactivateProductResponse = await request(`/api/products/${createdProduct.id}`, adminToken, 'PUT', { active: true });
    assert.equal(reactivateProductResponse.status, 200);
    assert.equal((await reactivateProductResponse.json() as any).product.active, true);

    const productsForReorder = (await (await request('/api/products?includeInactive=true', adminToken, 'GET')).json() as any).products;
    const reorderedIds = productsForReorder.map((product: any) => product.id).reverse();
    const reorderProductsResponse = await request('/api/products/reorder', adminToken, 'PUT', { ids: reorderedIds });
    assert.equal(reorderProductsResponse.status, 200);
    assert.deepEqual((await reorderProductsResponse.json() as any).products.map((product: any) => product.id), reorderedIds);

    const statusesForReorder = (await (await request('/api/products/SITE/statuses?includeInactive=true', adminToken, 'GET')).json() as any).statuses;
    const reorderedStatusIds = statusesForReorder.map((status: any) => status.id).reverse();
    const reorderStatusesResponse = await request('/api/products/SITE/statuses/reorder', adminToken, 'PUT', { ids: reorderedStatusIds });
    assert.equal(reorderStatusesResponse.status, 200);
    assert.deepEqual((await reorderStatusesResponse.json() as any).statuses.map((status: any) => status.id), reorderedStatusIds);
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    setDatabasePoolForTests(null);
    await database.close();
  }
});
