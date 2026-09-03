import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { setDatabasePoolForTests } from '../server/database/connection.js';
import { checklistRepository, clientRepository, projectRepository, projectResourceRepository, routineRepository, taskCommentRepository, taskRepository, userRepository } from '../server/db.js';

const migrationsDirectory = path.resolve(process.cwd(), 'server', 'database', 'migrations');

async function createTestDatabase(): Promise<PGlite> {
  const database = new PGlite();
  await database.exec(`
    CREATE TABLE schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  for (const file of fs.readdirSync(migrationsDirectory).filter(file => file.endsWith('.sql')).sort()) {
    await database.exec(fs.readFileSync(path.join(migrationsDirectory, file), 'utf8'));
  }
  return database;
}

function useAsPool(database: PGlite): void {
  const query = (text: string, values?: unknown[]) => database.query(text, values);
  const adapter = {
    query,
    connect: async () => ({ query, release: () => undefined }),
    on: () => adapter,
    end: () => database.close()
  } as unknown as Pool;
  setDatabasePoolForTests(adapter);
}

test('repositórios persistem clientes/projetos e aplicam o escopo RBAC', async () => {
  const database = await createTestDatabase();
  useAsPool(database);

  const ids = {
    superAdmin: '00000000-0000-4000-8000-000000000001',
    managerOne: '00000000-0000-4000-8000-000000000002',
    managerTwo: '00000000-0000-4000-8000-000000000003',
    collaborator: '00000000-0000-4000-8000-000000000004',
    outsider: '00000000-0000-4000-8000-000000000005',
    collaboratorTwo: '00000000-0000-4000-8000-000000000006',
    admin: '00000000-0000-4000-8000-000000000010'
  };

  try {
    const passwordHash = await bcrypt.hash('Admin@123', 4);
    const users = [
      [ids.superAdmin, 'Admin', 'admin@example.com', 'SUPER_ADMIN'],
      [ids.managerOne, 'João', 'joao@example.com', 'PROJECT_MANAGER'],
      [ids.managerTwo, 'Maria', 'maria@example.com', 'PROJECT_MANAGER'],
      [ids.collaborator, 'Pedro', 'pedro@example.com', 'COLLABORATOR'],
      [ids.outsider, 'Sem Vínculo', 'sem-vinculo@example.com', 'COLLABORATOR']
      ,[ids.collaboratorTwo, 'Lucas', 'lucas@example.com', 'COLLABORATOR'],
      [ids.admin, 'Admin', 'admin-secundario@example.com', 'ADMIN']
    ];
    for (const [id, name, email, role] of users) {
      await database.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, name, email, passwordHash, role]
      );
    }

    const loginUser = await userRepository.findByEmail('ADMIN@EXAMPLE.COM');
    assert.ok(loginUser);
    assert.equal(await bcrypt.compare('Admin@123', loginUser.password_hash), true);
    assert.equal('password_hash' in (await userRepository.findById(ids.superAdmin))!, false);

    const clientOne = await clientRepository.create({
      name: 'Cliente Um', company_name: 'Cliente Um Ltda', logo: 'CU', contact_name: 'Contato',
      email: 'cliente1@example.com', phone: '', status: 'ACTIVE', lead_manager_id: ids.managerOne,
      notes: '', monthly_services: ['SEO']
    });
    const clientTwo = await clientRepository.create({
      name: 'Cliente Dois', company_name: 'Cliente Dois Ltda', logo: 'CD', contact_name: 'Contato',
      email: 'cliente2@example.com', phone: '', status: 'ACTIVE', lead_manager_id: ids.managerTwo,
      notes: '', monthly_services: []
    });

    const projectOne = await projectRepository.create({
      name: 'Projeto Um', description: '', client_id: clientOne.id, project_type: 'WEBSITE',
      manager_id: ids.managerOne, status: 'PLANNING', priority: 'NORMAL', start_date: null,
      due_date: null, progress: 0, is_recurring: false, created_by: ids.superAdmin
    }, [ids.collaborator]);
    const projectTwo = await projectRepository.create({
      name: 'Projeto Dois', description: '', client_id: clientTwo.id, project_type: 'SEO',
      manager_id: ids.managerTwo, status: 'IN_PROGRESS', priority: 'HIGH', start_date: null,
      due_date: null, progress: 25, is_recurring: false, created_by: ids.superAdmin
    }, [ids.collaboratorTwo]);

    const driveResource = await projectResourceRepository.create({
      project_id: projectOne.id, kind: 'GOOGLE_DRIVE', name: 'Briefing', url: 'https://drive.google.com/example',
      storage_path: null, mime_type: null, size_bytes: null, created_by: ids.superAdmin
    });
    assert.equal((await projectRepository.findById(projectOne.id))?.resources[0].id, driveResource.id);

    const taskOne = await taskRepository.create({
      project_id: projectOne.id, title: 'Tarefa Projeto A', description: '', responsible_user_id: ids.collaborator,
      assignee_ids: [ids.collaborator, ids.managerOne],
      status: 'A_FAZER', priority: 'ALTA', start_date: '2026-09-02', start_time: '09:00', due_date: '2026-09-10', due_time: '10:00',
      completed_at: null, created_by: ids.superAdmin
    });
    const taskTwo = await taskRepository.create({
      project_id: projectTwo.id, title: 'Tarefa Projeto B', description: '', responsible_user_id: ids.collaboratorTwo,
      status: 'EM_ANDAMENTO', priority: 'NORMAL', start_date: '2026-09-02', due_date: '2026-09-11', due_time: null,
      completed_at: null, created_by: ids.superAdmin
    });

    const subtask = await taskRepository.create({
      project_id: projectOne.id, parent_task_id: taskOne.id, title: 'Subtarefa persistida', description: '',
      responsible_user_id: ids.collaborator, assignee_ids: [ids.collaborator], status: 'A_FAZER', priority: 'NORMAL',
      start_date: '2026-09-02', due_date: '2026-09-09', due_time: null, completed_at: null, created_by: ids.superAdmin
    });
    const checklistItem = await checklistRepository.create(subtask.id, {
      title: 'Item persistido', due_date: '2026-09-08', due_time: '09:30', responsible_user_id: ids.collaborator
    });
    const clearedChecklistItem = await checklistRepository.update(checklistItem.id, {
      due_date: null, due_time: null, responsible_user_id: null
    });
    assert.equal(clearedChecklistItem?.dueDate, undefined);
    assert.equal(clearedChecklistItem?.dueTime, undefined);
    assert.equal(clearedChecklistItem?.assigneeId, undefined);
    const routine = await routineRepository.upsert({
      source_task_id: taskOne.id, frequency: 'SEMANAL', rule_text: 'Toda segunda-feira',
      next_occurrence_date: '2027-09-06', occurrence_time: '09:00', created_by: ids.superAdmin
    });
    assert.equal(routine.sourceTaskId, taskOne.id);
    const enrichedTask = await taskRepository.findById(taskOne.id, { id: ids.collaborator, role: 'COLLABORATOR' });
    assert.deepEqual(new Set(enrichedTask.assignees.map((assignee: any) => assignee.id)), new Set([ids.collaborator, ids.managerOne]));
    assert.equal(enrichedTask.subtasks[0].id, subtask.id);
    assert.equal(enrichedTask.subtasks[0].checklist[0].title, 'Item persistido');
    assert.equal(enrichedTask.recurrence.frequency, 'SEMANAL');
    assert.equal(enrichedTask.startTime, '09:00');
    await taskCommentRepository.create(taskOne.id, ids.collaborator, 'Comentário persistido');
    assert.equal((await taskRepository.findById(taskOne.id, { id: ids.collaborator, role: 'COLLABORATOR' })).comments[0].content, 'Comentário persistido');
    assert.equal((await taskRepository.update(taskOne.id, { start_time: null }))?.startTime, undefined);
    assert.equal((await routineRepository.findAll({ id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 1);
    assert.equal((await routineRepository.findAll({ id: ids.admin, role: 'ADMIN' })).length, 1);
    assert.equal((await routineRepository.findAll({ id: ids.collaborator, role: 'COLLABORATOR' })).length, 1);
    assert.equal((await routineRepository.findAll({ id: ids.outsider, role: 'COLLABORATOR' })).length, 0);

    assert.equal((await projectRepository.findAll({ id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 2);
    assert.equal((await projectRepository.findAll({ id: ids.admin, role: 'ADMIN' })).length, 2);
    assert.deepEqual(
      (await projectRepository.findAll({ id: ids.managerOne, role: 'PROJECT_MANAGER' })).map(project => project.id),
      [projectOne.id]
    );
    assert.deepEqual(
      (await projectRepository.findAll({ id: ids.collaborator, role: 'COLLABORATOR' })).map(project => project.id),
      [projectOne.id]
    );
    assert.equal((await projectRepository.findAll({ id: ids.outsider, role: 'COLLABORATOR' })).length, 0);
    assert.equal(await projectRepository.findById(projectOne.id, { id: ids.outsider, role: 'COLLABORATOR' }), null);

    assert.deepEqual(
      (await clientRepository.findAll({ id: ids.managerOne, role: 'PROJECT_MANAGER' })).map(client => client.id),
      [clientOne.id]
    );
    assert.deepEqual(
      (await clientRepository.findAll({ id: ids.collaborator, role: 'COLLABORATOR' })).map(client => client.id),
      [clientOne.id]
    );
    assert.equal((await clientRepository.findAll({ id: ids.outsider, role: 'COLLABORATOR' })).length, 0);

    assert.deepEqual((await taskRepository.findAll({}, { id: ids.managerOne, role: 'PROJECT_MANAGER' })).map(task => task.id), [taskOne.id]);
    assert.deepEqual((await taskRepository.findAll({}, { id: ids.collaborator, role: 'COLLABORATOR' })).map(task => task.id), [taskOne.id]);
    assert.deepEqual((await taskRepository.findAll({}, { id: ids.managerTwo, role: 'PROJECT_MANAGER' })).map(task => task.id), [taskTwo.id]);
    assert.deepEqual((await taskRepository.findAll({}, { id: ids.collaboratorTwo, role: 'COLLABORATOR' })).map(task => task.id), [taskTwo.id]);
    assert.equal((await taskRepository.findAll({}, { id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 2);
    assert.equal((await taskRepository.findAll({}, { id: ids.admin, role: 'ADMIN' })).length, 2);
    assert.equal(await taskRepository.findById(taskTwo.id, { id: ids.collaborator, role: 'COLLABORATOR' }), null);

    // Simula a reinicialização do backend: novo adaptador, mesmos dados PostgreSQL.
    setDatabasePoolForTests(null);
    useAsPool(database);
    assert.equal((await taskRepository.findAll({}, { id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 2);

    const taskThree = await taskRepository.create({
      project_id: projectOne.id, title: 'Tarefa Projeto A 2', description: '', responsible_user_id: ids.collaborator,
      status: 'A_FAZER', priority: 'NORMAL', start_date: '2026-09-03', due_date: '2026-09-12', due_time: null,
      completed_at: null, created_by: ids.superAdmin
    });
    const taskFour = await taskRepository.create({
      project_id: projectOne.id, title: 'Tarefa Projeto A 3', description: '', responsible_user_id: ids.collaborator,
      status: 'EM_ANDAMENTO', priority: 'BAIXA', start_date: '2026-09-03', due_date: '2026-09-13', due_time: null,
      completed_at: null, created_by: ids.superAdmin
    });

    const completedAt = new Date().toISOString();
    const completedTask = await taskRepository.update(taskOne.id, { status: 'CONCLUIDO', completed_at: completedAt });
    assert.equal(completedTask?.status, 'CONCLUIDO');
    assert.equal(completedTask?.completedAt, completedAt);

    const activeProjectTasks = await taskRepository.findAll(
      { projectId: projectOne.id },
      { id: ids.collaborator, role: 'COLLABORATOR' }
    );
    assert.deepEqual(new Set(activeProjectTasks.map(task => task.id)), new Set([taskThree.id, taskFour.id]));
    assert.deepEqual(
      (await taskRepository.findAll(
        { projectId: projectOne.id, status: 'CONCLUIDO' },
        { id: ids.collaborator, role: 'COLLABORATOR' }
      )).map(task => task.id),
      [taskOne.id]
    );
    assert.equal((await taskRepository.findAll(
      { projectId: projectOne.id, includeCompleted: true },
      { id: ids.collaborator, role: 'COLLABORATOR' }
    )).length, 3);
    assert.equal((await taskRepository.findAll(
      { projectId: projectOne.id, status: 'CONCLUIDO' },
      { id: ids.outsider, role: 'COLLABORATOR' }
    )).length, 0);

    // Simula novo carregamento/reinício com a separação entre ativas e concluídas preservada.
    setDatabasePoolForTests(null);
    useAsPool(database);
    assert.equal((await taskRepository.findAll({ projectId: projectOne.id }, { id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 2);
    assert.equal((await taskRepository.findAll(
      { projectId: projectOne.id, status: 'CONCLUIDO' },
      { id: ids.superAdmin, role: 'SUPER_ADMIN' }
    )).length, 1);

    const reopenedTask = await taskRepository.update(taskOne.id, { status: 'A_FAZER', completed_at: null });
    assert.equal(reopenedTask?.status, 'A_FAZER');
    assert.equal(reopenedTask?.completedAt, undefined);
    assert.equal((await taskRepository.findAll({ projectId: projectOne.id }, { id: ids.superAdmin, role: 'SUPER_ADMIN' })).length, 3);
    assert.equal((await taskRepository.findAll(
      { projectId: projectOne.id, status: 'CONCLUIDO' },
      { id: ids.superAdmin, role: 'SUPER_ADMIN' }
    )).length, 0);

    const persisted = await database.query<{ project_id: string; user_id: string; member_role: string }>(
      `SELECT project_id, user_id, member_role FROM project_members
       WHERE project_id = $1 ORDER BY member_role DESC`,
      [projectOne.id]
    );
    assert.deepEqual(new Set(persisted.rows.map(member => member.user_id)), new Set([ids.managerOne, ids.collaborator]));
    assert.equal(persisted.rows.find(member => member.user_id === ids.managerOne)?.member_role, 'MANAGER');

    const editedProject = await projectRepository.update(projectOne.id, {
      manager_id: ids.managerTwo,
      client_id: clientTwo.id,
      briefing: { objective: 'Briefing persistido' }
    });
    assert.equal(editedProject.manager_id, ids.managerTwo);
    assert.equal(editedProject.client_id, clientTwo.id);
    assert.equal(editedProject.briefing.objective, 'Briefing persistido');
    assert.deepEqual(
      new Set(editedProject.teamMembers.map((member: any) => member.id)),
      new Set([ids.managerTwo, ids.collaborator])
    );
    assert.equal(editedProject.teamMembers.length, 2);

    setDatabasePoolForTests(null);
    useAsPool(database);
    assert.equal((await projectRepository.findById(projectOne.id))?.briefing.objective, 'Briefing persistido');

    const today = new Date().toISOString().slice(0, 10);
    await routineRepository.update(routine.id, { next_occurrence_date: today, status: 'ACTIVE' });
    await routineRepository.materializeDueOccurrences({ id: ids.superAdmin, role: 'SUPER_ADMIN' });
    await routineRepository.materializeDueOccurrences({ id: ids.superAdmin, role: 'SUPER_ADMIN' });
    const generated = await database.query<{ id: string; generated_by_rule_id: string }>(
      'SELECT id, generated_by_rule_id FROM tasks WHERE generated_by_rule_id = $1', [routine.id]
    );
    assert.equal(generated.rows.length, 1);
    await taskRepository.update(generated.rows[0].id, { status: 'CONCLUIDO', completed_at: new Date().toISOString() });
    assert.equal((await routineRepository.findById(routine.id))?.status, 'ACTIVE');
    await routineRepository.delete(routine.id);
    assert.ok(await taskRepository.findById(taskOne.id));
  } finally {
    setDatabasePoolForTests(null);
    await database.close();
  }
});
