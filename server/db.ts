import 'dotenv/config';
import { PoolClient } from 'pg';
import { getPool, withTransaction } from './database/connection.js';
import { listMigrationFiles } from './database/migration-files.js';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PROJECT_MANAGER' | 'COLLABORATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProjectStatus = string;
export type ProjectType = string;
export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type TaskStatus = string;
export type TaskPriority = 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAIXA';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar: string;
  role: UserRole;
  job_title: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface DbClient {
  id: string;
  name: string;
  company_name: string;
  logo: string;
  contact_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  lead_manager_id?: string | null;
  notes: string;
  monthly_services: string[];
  created_at: string;
  updated_at: string;
}

export interface ClientDeletionDependencies {
  projects: number;
  tasks: number;
  projectMembers: number;
  projectResources: number;
  taskAssignees: number;
  taskComments: number;
  checklistItems: number;
  recurrenceRules: number;
}

export interface ClientPermanentDeletionResult {
  deleted: boolean;
  snapshotId?: string;
  dependencies: ClientDeletionDependencies;
  storagePaths: string[];
}

export interface DbProject {
  id: string;
  name: string;
  description: string;
  briefing?: Record<string, string>;
  client_id: string;
  project_type: ProjectType;
  product_id?: string;
  product_status_id?: string;
  manager_id: string;
  status: ProjectStatus;
  priority: Priority;
  start_date?: string | null;
  due_date?: string | null;
  progress: number;
  is_recurring: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  member_role: 'MANAGER' | 'COLLABORATOR';
  created_at: string;
}

export interface DbProjectStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  project_id: string;
  parent_task_id?: string | null;
  generated_by_rule_id?: string | null;
  title: string;
  description: string;
  responsible_user_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string | null;
  start_time?: string | null;
  due_date: string;
  due_time?: string | null;
  completed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  due_date?: string | null;
  due_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DbProjectResource {
  id: string;
  project_id: string;
  kind: 'FILE' | 'GOOGLE_DRIVE';
  name: string;
  url?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_by: string;
  created_at: string;
}

export interface AuthScope {
  id: string;
  role: UserRole;
}

type SafeUser = Omit<DbUser, 'password_hash'>;

function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? '');
}

function toDateString(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
}

function normalizeUser(row: any): DbUser {
  return {
    ...row,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbUser;
}

function toSafeUser(row: any): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = normalizeUser(row);
  return safeUser;
}

function normalizeClient(row: any): DbClient {
  return {
    ...row,
    monthly_services: Array.isArray(row.monthly_services) ? row.monthly_services : [],
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbClient;
}

function normalizeProject(row: any): DbProject {
  return {
    ...row,
    briefing: row.briefing && typeof row.briefing === 'object' ? row.briefing : {},
    start_date: row.start_date ? toDateString(row.start_date) : null,
    due_date: row.due_date ? toDateString(row.due_date) : null,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbProject;
}

function addRestrictedProjectAccess(where: string[], values: unknown[], user?: AuthScope, alias = 'p'): void {
  if (!user || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return;
  values.push(user.id);
  const userParam = `$${values.length}`;
  if (user.role === 'PROJECT_MANAGER') {
    where.push(`(
      ${alias}.manager_id = ${userParam}
      OR EXISTS (
        SELECT 1 FROM project_members access_pm
        WHERE access_pm.project_id = ${alias}.id AND access_pm.user_id = ${userParam}
      )
    )`);
  } else {
    where.push(`EXISTS (
      SELECT 1 FROM project_members access_pm
      WHERE access_pm.project_id = ${alias}.id AND access_pm.user_id = ${userParam}
    )`);
  }
}

export interface DbProduct {
  id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProductStatus {
  id: string;
  product_id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

function addOperationalAssigneeScope(where: string[], values: unknown[], assigneeId?: string, taskAlias = 't'): void {
  if (!assigneeId) return;
  values.push(assigneeId);
  where.push(`EXISTS (
    SELECT 1 FROM task_assignees operational_assignee
    WHERE operational_assignee.task_id = ${taskAlias}.id
      AND operational_assignee.user_id = $${values.length}
  )`);
}

function addOperationalProjectScope(where: string[], values: unknown[], assigneeId?: string, projectAlias = 'p'): void {
  if (!assigneeId) return;
  values.push(assigneeId);
  where.push(`EXISTS (
    SELECT 1 FROM tasks operational_task
    WHERE operational_task.project_id = ${projectAlias}.id
      AND operational_task.parent_task_id IS NULL
      AND EXISTS (
        SELECT 1 FROM task_assignees operational_assignee
        WHERE operational_assignee.task_id = operational_task.id
          AND operational_assignee.user_id = $${values.length}
      )
  )`);
}

function legacyProjectTypeToProductId(type?: string): string {
  const mapping: Record<string, string> = {
    WEBSITE: 'SITE', LANDING_PAGE: 'LANDING_PAGE', ECOMMERCE: 'ECOMMERCE',
    GOOGLE_ADS: 'PAID_TRAFFIC', META_ADS: 'PAID_TRAFFIC', SEO: 'SEO',
    MAINTENANCE: 'MAINTENANCE', INTERNAL: 'INTERNAL', OTHER: 'OTHER', SOCIAL_MEDIA: 'OTHER'
  };
  return mapping[type || ''] || 'OTHER';
}

async function enrichProjects(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];

  const projectIds = rows.map(row => row.id);
  const membersResult = await getPool().query(
    `SELECT pm.project_id, u.id, u.name, u.avatar, u.job_title, u.role
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ANY($1::uuid[])
     ORDER BY CASE pm.member_role WHEN 'MANAGER' THEN 0 ELSE 1 END, u.name`,
    [projectIds]
  );
  const resourcesResult = await getPool().query(
    `SELECT * FROM project_resources
     WHERE project_id = ANY($1::uuid[])
     ORDER BY created_at DESC`,
    [projectIds]
  );

  const membersByProject = new Map<string, any[]>();
  for (const member of membersResult.rows) {
    const members = membersByProject.get(member.project_id) || [];
    members.push({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      job_title: member.job_title,
      role: member.role
    });
    membersByProject.set(member.project_id, members);
  }

  const resourcesByProject = new Map<string, any[]>();
  for (const resource of resourcesResult.rows) {
    const resources = resourcesByProject.get(resource.project_id) || [];
    resources.push({
      id: resource.id,
      projectId: resource.project_id,
      kind: resource.kind,
      name: resource.name,
      url: resource.url || undefined,
      mimeType: resource.mime_type || undefined,
      sizeBytes: resource.size_bytes == null ? undefined : Number(resource.size_bytes),
      createdAt: toIsoString(resource.created_at)
    });
    resourcesByProject.set(resource.project_id, resources);
  }

  return rows.map(row => {
    const {
      client_name, client_company, manager_name, manager_avatar,
      product_name, product_color, project_status_name, project_status_color, project_status_active, project_status_completed,
      workflow_statuses,
      ...projectRow
    } = row;
    return {
      ...normalizeProject(projectRow),
      clientName: client_name || 'Cliente Desconhecido',
      clientCompany: client_company || '',
      managerName: manager_name || 'Gestor Não Atribuído',
      managerAvatar: manager_avatar || '',
      productId: row.product_id,
      productName: product_name || row.product_id,
      productColor: product_color || '#A1A1AA',
      projectStatusId: row.product_status_id,
      projectStatusName: project_status_name || row.product_status_id,
      projectStatusColor: project_status_color || '#A1A1AA',
      projectStatusActive: project_status_active !== false,
      projectStatusCompleted: Boolean(project_status_completed),
      workflowStatuses: Array.isArray(workflow_statuses) ? workflow_statuses : [],
      teamMembers: membersByProject.get(row.id) || [],
      resources: resourcesByProject.get(row.id) || []
    };
  });
}

export async function initDatabase(): Promise<void> {
  const result = await getPool().query<{
    users_table: string | null;
    clients_table: string | null;
    projects_table: string | null;
    project_members_table: string | null;
    tasks_table: string | null;
    migrations_table: string | null;
  }>(`
    SELECT
      to_regclass('public.users')::text AS users_table,
      to_regclass('public.clients')::text AS clients_table,
      to_regclass('public.projects')::text AS projects_table,
      to_regclass('public.project_members')::text AS project_members_table,
      to_regclass('public.tasks')::text AS tasks_table,
      to_regclass('public.schema_migrations')::text AS migrations_table
  `);

  const state = result.rows[0];
  if (!state.users_table || !state.clients_table || !state.projects_table || !state.project_members_table || !state.tasks_table || !state.migrations_table) {
    throw new Error('Banco PostgreSQL ainda não foi migrado. Execute npm run db:migrate.');
  }

  const requiredMigrations = listMigrationFiles();
  const applied = await getPool().query<{ filename: string }>(
    'SELECT filename FROM schema_migrations WHERE filename = ANY($1::text[])',
    [requiredMigrations]
  );
  if (applied.rows.length !== requiredMigrations.length) {
    throw new Error('Existem migrations PostgreSQL pendentes. Execute npm run db:migrate.');
  }

  console.log('[DB] Conexão PostgreSQL validada e schema principal disponível.');
}

export const userRepository = {
  findAll: async (filter?: { role?: UserRole; status?: UserStatus; search?: string }): Promise<SafeUser[]> => {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filter?.role) {
      values.push(filter.role);
      where.push(`role = $${values.length}`);
    }
    if (filter?.status) {
      values.push(filter.status);
      where.push(`status = $${values.length}`);
    }
    if (filter?.search) {
      values.push(`%${filter.search}%`);
      where.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }

    const result = await getPool().query(
      `SELECT id, name, email, avatar, role, job_title, status, created_at, updated_at
       FROM users
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY name`,
      values
    );
    return result.rows.map(toSafeUser);
  },

  findById: async (id: string): Promise<SafeUser | null> => {
    const result = await getPool().query(
      `SELECT id, name, email, avatar, role, job_title, status, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rowCount ? toSafeUser(result.rows[0]) : null;
  },

  findByEmail: async (email: string): Promise<DbUser | null> => {
    const result = await getPool().query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rowCount ? normalizeUser(result.rows[0]) : null;
  },

  create: async (data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<SafeUser> => {
    const result = await getPool().query(
      `INSERT INTO users (name, email, password_hash, avatar, role, job_title, status)
       VALUES ($1, LOWER($2), $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.name, data.email, data.password_hash, data.avatar, data.role, data.job_title, data.status]
    );
    return toSafeUser(result.rows[0]);
  },

  update: async (id: string, updates: Partial<Omit<DbUser, 'id' | 'created_at' | 'updated_at'>>): Promise<SafeUser | null> => {
    const columnMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      password_hash: 'password_hash',
      avatar: 'avatar',
      role: 'role',
      job_title: 'job_title',
      status: 'status'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (entries.length === 0) return userRepository.findById(id);

    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rowCount ? toSafeUser(result.rows[0]) : null;
  }
};

export const clientRepository = {
  findAll: async (
    user?: AuthScope,
    filter?: { status?: ClientStatus; search?: string }
  ): Promise<DbClient[]> => {
    const where: string[] = [];
    const values: unknown[] = [];

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      values.push(user.id);
      const userParam = `$${values.length}`;
      where.push(`EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = c.id
          AND (
            ${user.role === 'PROJECT_MANAGER' ? `p.manager_id = ${userParam} OR` : ''}
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = ${userParam}
            )
          )
      )`);
    }
    if (filter?.status) {
      values.push(filter.status);
      where.push(`c.status = $${values.length}`);
    }
    if (filter?.search) {
      values.push(`%${filter.search}%`);
      where.push(`(c.name ILIKE $${values.length} OR c.company_name ILIKE $${values.length} OR c.contact_name ILIKE $${values.length} OR c.email ILIKE $${values.length})`);
    }

    const result = await getPool().query(
      `SELECT c.*, lead.name AS lead_manager_name FROM clients c
       LEFT JOIN users lead ON lead.id = c.lead_manager_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.created_at DESC`,
      values
    );
    return result.rows.map(normalizeClient);
  },

  findById: async (id: string, user?: AuthScope): Promise<DbClient | null> => {
    const values: unknown[] = [id];
    const where = ['c.id = $1'];
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      values.push(user.id);
      where.push(`EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = c.id
          AND (
            ${user.role === 'PROJECT_MANAGER' ? 'p.manager_id = $2 OR' : ''}
            EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)
          )
      )`);
    }
    const result = await getPool().query(
      `SELECT c.*, lead.name AS lead_manager_name
       FROM clients c
       LEFT JOIN users lead ON lead.id = c.lead_manager_id
       WHERE ${where.join(' AND ')}`,
      values
    );
    return result.rowCount ? normalizeClient(result.rows[0]) : null;
  },

  create: async (data: Omit<DbClient, 'id' | 'created_at' | 'updated_at'>): Promise<DbClient> => {
    const result = await getPool().query(
      `INSERT INTO clients (
        name, company_name, logo, contact_name, email, phone, status,
        lead_manager_id, notes, monthly_services
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[])
      RETURNING *`,
      [
        data.name, data.company_name, data.logo, data.contact_name, data.email,
        data.phone, data.status, data.lead_manager_id || null, data.notes,
        data.monthly_services || []
      ]
    );
    return normalizeClient(result.rows[0]);
  },

  update: async (id: string, updates: Partial<Omit<DbClient, 'id' | 'created_at' | 'updated_at'>>): Promise<DbClient | null> => {
    const columnMap: Record<string, string> = {
      name: 'name', company_name: 'company_name', logo: 'logo', contact_name: 'contact_name',
      email: 'email', phone: 'phone', status: 'status', lead_manager_id: 'lead_manager_id',
      notes: 'notes', monthly_services: 'monthly_services'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (entries.length === 0) return clientRepository.findById(id);

    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE clients SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rowCount ? clientRepository.findById(id) : null;
  },

  setStatus: async (id: string, status: Extract<ClientStatus, 'ACTIVE' | 'INACTIVE'>): Promise<DbClient | null> => (
    clientRepository.update(id, { status })
  ),

  getDeletionDependencies: async (id: string): Promise<ClientDeletionDependencies> => {
    const result = await getPool().query(
      `SELECT
         (SELECT COUNT(*)::integer FROM projects WHERE client_id = $1) AS projects,
         (SELECT COUNT(*)::integer FROM tasks task INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1) AS tasks,
         (SELECT COUNT(*)::integer FROM project_members member INNER JOIN projects project ON project.id = member.project_id WHERE project.client_id = $1) AS project_members,
         (SELECT COUNT(*)::integer FROM project_resources resource INNER JOIN projects project ON project.id = resource.project_id WHERE project.client_id = $1) AS project_resources,
         (SELECT COUNT(*)::integer FROM task_assignees assignee INNER JOIN tasks task ON task.id = assignee.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1) AS task_assignees,
         (SELECT COUNT(*)::integer FROM task_comments comment_item INNER JOIN tasks task ON task.id = comment_item.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1) AS task_comments,
         (SELECT COUNT(*)::integer FROM checklist_items checklist INNER JOIN tasks task ON task.id = checklist.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1) AS checklist_items,
         (SELECT COUNT(*)::integer FROM recurrence_rules recurrence INNER JOIN tasks task ON task.id = recurrence.source_task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1) AS recurrence_rules`,
      [id]
    );
    const row = result.rows[0] || {};
    return {
      projects: Number(row.projects || 0),
      tasks: Number(row.tasks || 0),
      projectMembers: Number(row.project_members || 0),
      projectResources: Number(row.project_resources || 0),
      taskAssignees: Number(row.task_assignees || 0),
      taskComments: Number(row.task_comments || 0),
      checklistItems: Number(row.checklist_items || 0),
      recurrenceRules: Number(row.recurrence_rules || 0)
    };
  },

  deletePermanent: async (id: string, deletedBy: string): Promise<ClientPermanentDeletionResult> => {
    return withTransaction(async transaction => {
      const clientResult = await transaction.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [id]);
      const emptyDependencies: ClientDeletionDependencies = {
        projects: 0,
        tasks: 0,
        projectMembers: 0,
        projectResources: 0,
        taskAssignees: 0,
        taskComments: 0,
        checklistItems: 0,
        recurrenceRules: 0
      };
      if (!clientResult.rowCount) return { deleted: false, dependencies: emptyDependencies, storagePaths: [] };

      const projects = await transaction.query('SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at', [id]);
      const projectMembers = await transaction.query(
        'SELECT member.* FROM project_members member INNER JOIN projects project ON project.id = member.project_id WHERE project.client_id = $1 ORDER BY member.created_at',
        [id]
      );
      const projectResources = await transaction.query(
        'SELECT resource.* FROM project_resources resource INNER JOIN projects project ON project.id = resource.project_id WHERE project.client_id = $1 ORDER BY resource.created_at',
        [id]
      );
      const tasks = await transaction.query(
        'SELECT task.* FROM tasks task INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1 ORDER BY task.created_at',
        [id]
      );
      const taskAssignees = await transaction.query(
        'SELECT assignee.* FROM task_assignees assignee INNER JOIN tasks task ON task.id = assignee.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1 ORDER BY assignee.created_at',
        [id]
      );
      const checklistItems = await transaction.query(
        'SELECT checklist.* FROM checklist_items checklist INNER JOIN tasks task ON task.id = checklist.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1 ORDER BY checklist.created_at',
        [id]
      );
      const taskComments = await transaction.query(
        'SELECT comment_item.* FROM task_comments comment_item INNER JOIN tasks task ON task.id = comment_item.task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1 ORDER BY comment_item.created_at',
        [id]
      );
      const recurrenceRules = await transaction.query(
        'SELECT recurrence.* FROM recurrence_rules recurrence INNER JOIN tasks task ON task.id = recurrence.source_task_id INNER JOIN projects project ON project.id = task.project_id WHERE project.client_id = $1 ORDER BY recurrence.created_at',
        [id]
      );

      const dependencies: ClientDeletionDependencies = {
        projects: projects.rows.length,
        tasks: tasks.rows.length,
        projectMembers: projectMembers.rows.length,
        projectResources: projectResources.rows.length,
        taskAssignees: taskAssignees.rows.length,
        taskComments: taskComments.rows.length,
        checklistItems: checklistItems.rows.length,
        recurrenceRules: recurrenceRules.rows.length
      };
      const snapshot = {
        client: clientResult.rows[0],
        projects: projects.rows,
        projectMembers: projectMembers.rows,
        projectResources: projectResources.rows,
        tasks: tasks.rows,
        taskAssignees: taskAssignees.rows,
        checklistItems: checklistItems.rows,
        taskComments: taskComments.rows,
        recurrenceRules: recurrenceRules.rows
      };
      const snapshotResult = await transaction.query<{ id: string }>(
        `INSERT INTO deleted_client_snapshots (original_client_id, client_name, deleted_by, snapshot)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id`,
        [id, clientResult.rows[0].name, deletedBy, JSON.stringify(snapshot)]
      );

      // As FKs de composição removem apenas os registros pertencentes aos projetos/tarefas excluídos.
      await transaction.query('DELETE FROM projects WHERE client_id = $1', [id]);
      const deletedClient = await transaction.query('DELETE FROM clients WHERE id = $1', [id]);
      if (!deletedClient.rowCount) throw new Error('Falha ao excluir o cliente dentro da transação.');

      return {
        deleted: true,
        snapshotId: snapshotResult.rows[0].id,
        dependencies,
        storagePaths: projectResources.rows
          .map(resource => resource.storage_path)
          .filter((storagePath): storagePath is string => Boolean(storagePath))
      };
    });
  },

  archive: async (id: string): Promise<DbClient | null> => clientRepository.setStatus(id, 'INACTIVE')
};

function normalizeProjectStatus(row: any): DbProjectStatus {
  return {
    ...row,
    position: Number(row.position),
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbProjectStatus;
}

export const projectStatusRepository = {
  findAll: async (includeInactive = false): Promise<Array<DbProjectStatus & { projectsCount: number }>> => {
    const result = await getPool().query(
      `SELECT project_status.*, COUNT(project.id)::integer AS projects_count
       FROM project_statuses project_status
       LEFT JOIN projects project ON project.status = project_status.id
       ${includeInactive ? '' : 'WHERE project_status.active = TRUE'}
       GROUP BY project_status.id
       ORDER BY project_status.position, project_status.name`
    );
    return result.rows.map(row => ({ ...normalizeProjectStatus(row), projectsCount: Number(row.projects_count) }));
  },

  findById: async (id: string): Promise<(DbProjectStatus & { projectsCount: number }) | null> => {
    const result = await getPool().query(
      `SELECT project_status.*, COUNT(project.id)::integer AS projects_count
       FROM project_statuses project_status
       LEFT JOIN projects project ON project.status = project_status.id
       WHERE project_status.id = $1
       GROUP BY project_status.id`,
      [id]
    );
    if (!result.rowCount) return null;
    return { ...normalizeProjectStatus(result.rows[0]), projectsCount: Number(result.rows[0].projects_count) };
  },

  create: async (data: Pick<DbProjectStatus, 'id' | 'name' | 'color'> & Partial<Pick<DbProjectStatus, 'active'>>): Promise<DbProjectStatus> => {
    const result = await getPool().query(
      `INSERT INTO project_statuses (id, name, color, position, active)
       VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) + 1 FROM project_statuses), 0), $4)
       RETURNING *`,
      [data.id, data.name, data.color, data.active ?? true]
    );
    return normalizeProjectStatus(result.rows[0]);
  },

  update: async (id: string, updates: Partial<Pick<DbProjectStatus, 'name' | 'color' | 'active' | 'position'>>): Promise<DbProjectStatus | null> => {
    const columnMap: Record<string, string> = { name: 'name', color: 'color', active: 'active', position: 'position' };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return (await projectStatusRepository.findById(id)) as DbProjectStatus | null;
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE project_statuses SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rowCount ? normalizeProjectStatus(result.rows[0]) : null;
  },

  reorder: async (ids: string[]): Promise<void> => {
    await withTransaction(async client => {
      for (const [position, id] of ids.entries()) {
        await client.query('UPDATE project_statuses SET position = $1 WHERE id = $2', [position, id]);
      }
    });
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM project_statuses WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  }
};

function normalizeProduct(row: any): DbProduct {
  return {
    ...row,
    position: Number(row.position),
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbProduct;
}

function normalizeProductStatus(row: any): DbProductStatus {
  return {
    ...row,
    position: Number(row.position),
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  } as DbProductStatus;
}

export const productRepository = {
  findAll: async (includeInactive = false): Promise<Array<DbProduct & { projectsCount: number; statusesCount: number }>> => {
    const result = await getPool().query(
      `SELECT product.*,
              COUNT(DISTINCT project.id)::integer AS projects_count,
              COUNT(DISTINCT product_status.id)::integer AS statuses_count
       FROM products product
       LEFT JOIN projects project ON project.product_id = product.id
       LEFT JOIN product_statuses product_status ON product_status.product_id = product.id
       ${includeInactive ? '' : 'WHERE product.active = TRUE'}
       GROUP BY product.id
       ORDER BY product.position, product.name`
    );
    return result.rows.map(row => ({
      ...normalizeProduct(row),
      projectsCount: Number(row.projects_count),
      statusesCount: Number(row.statuses_count)
    }));
  },

  findById: async (id: string): Promise<(DbProduct & { projectsCount: number; statusesCount: number }) | null> => {
    const result = await getPool().query(
      `SELECT product.*,
              COUNT(DISTINCT project.id)::integer AS projects_count,
              COUNT(DISTINCT product_status.id)::integer AS statuses_count
       FROM products product
       LEFT JOIN projects project ON project.product_id = product.id
       LEFT JOIN product_statuses product_status ON product_status.product_id = product.id
       WHERE product.id = $1
       GROUP BY product.id`,
      [id]
    );
    if (!result.rowCount) return null;
    return {
      ...normalizeProduct(result.rows[0]),
      projectsCount: Number(result.rows[0].projects_count),
      statusesCount: Number(result.rows[0].statuses_count)
    };
  },

  create: async (data: Pick<DbProduct, 'id' | 'name' | 'color'> & Partial<Pick<DbProduct, 'active'>>): Promise<DbProduct> => {
    const result = await getPool().query(
      `INSERT INTO products (id, name, color, position, active)
       VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) + 1 FROM products), 0), $4)
       RETURNING *`,
      [data.id, data.name, data.color, data.active ?? true]
    );
    return normalizeProduct(result.rows[0]);
  },

  update: async (id: string, updates: Partial<Pick<DbProduct, 'name' | 'color' | 'active' | 'position'>>): Promise<DbProduct | null> => {
    const columnMap: Record<string, string> = { name: 'name', color: 'color', active: 'active', position: 'position' };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return (await productRepository.findById(id)) as DbProduct | null;
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE products SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rowCount ? normalizeProduct(result.rows[0]) : null;
  },

  reorder: async (ids: string[]): Promise<void> => {
    await withTransaction(async client => {
      for (const [position, id] of ids.entries()) {
        await client.query('UPDATE products SET position = $1 WHERE id = $2', [position, id]);
      }
    });
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM products WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  }
};

export const productStatusRepository = {
  findAll: async (productId: string, includeInactive = false): Promise<Array<DbProductStatus & { projectsCount: number; tasksCount: number }>> => {
    const result = await getPool().query(
      `SELECT product_status.*, COUNT(DISTINCT project.id)::integer AS projects_count,
              COUNT(DISTINCT task.id)::integer AS tasks_count
       FROM product_statuses product_status
       LEFT JOIN projects project ON project.product_status_id = product_status.id
       LEFT JOIN tasks task ON task.status = product_status.id
       WHERE product_status.product_id = $1
       ${includeInactive ? '' : 'AND product_status.active = TRUE'}
       GROUP BY product_status.id
       ORDER BY product_status.position, product_status.name`,
      [productId]
    );
    return result.rows.map(row => ({
      ...normalizeProductStatus(row), projectsCount: Number(row.projects_count), tasksCount: Number(row.tasks_count)
    }));
  },

  findById: async (productId: string, id: string): Promise<(DbProductStatus & { projectsCount: number; tasksCount: number }) | null> => {
    const result = await getPool().query(
      `SELECT product_status.*, COUNT(DISTINCT project.id)::integer AS projects_count,
              COUNT(DISTINCT task.id)::integer AS tasks_count
       FROM product_statuses product_status
       LEFT JOIN projects project ON project.product_status_id = product_status.id
       LEFT JOIN tasks task ON task.status = product_status.id
       WHERE product_status.product_id = $1 AND product_status.id = $2
       GROUP BY product_status.id`,
      [productId, id]
    );
    if (!result.rowCount) return null;
    return {
      ...normalizeProductStatus(result.rows[0]),
      projectsCount: Number(result.rows[0].projects_count),
      tasksCount: Number(result.rows[0].tasks_count)
    };
  },

  findByStatusId: async (id: string): Promise<DbProductStatus | null> => {
    const result = await getPool().query('SELECT * FROM product_statuses WHERE id = $1', [id]);
    return result.rowCount ? normalizeProductStatus(result.rows[0]) : null;
  },

  findFirstActive: async (productId: string): Promise<DbProductStatus | null> => {
    const result = await getPool().query(
      'SELECT * FROM product_statuses WHERE product_id = $1 AND active = TRUE ORDER BY position, name LIMIT 1',
      [productId]
    );
    return result.rowCount ? normalizeProductStatus(result.rows[0]) : null;
  },

  create: async (data: Pick<DbProductStatus, 'id' | 'product_id' | 'name' | 'color'> & Partial<Pick<DbProductStatus, 'active'>>): Promise<DbProductStatus> => {
    const result = await getPool().query(
      `INSERT INTO product_statuses (id, product_id, name, color, position, active)
       VALUES ($1, $2, $3, $4, COALESCE((SELECT MAX(position) + 1 FROM product_statuses WHERE product_id = $2::varchar), 0), $5)
       RETURNING *`,
      [data.id, data.product_id, data.name, data.color, data.active ?? true]
    );
    return normalizeProductStatus(result.rows[0]);
  },

  update: async (productId: string, id: string, updates: Partial<Pick<DbProductStatus, 'name' | 'color' | 'active' | 'position' | 'is_completed'>>): Promise<DbProductStatus | null> => {
    const columnMap: Record<string, string> = { name: 'name', color: 'color', active: 'active', position: 'position', is_completed: 'is_completed' };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return (await productStatusRepository.findById(productId, id)) as DbProductStatus | null;
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(productId, id);
    const result = await getPool().query(
      `UPDATE product_statuses SET ${assignments.join(', ')}
       WHERE product_id = $${values.length - 1} AND id = $${values.length}
       RETURNING *`,
      values
    );
    return result.rowCount ? normalizeProductStatus(result.rows[0]) : null;
  },

  reorder: async (productId: string, ids: string[]): Promise<void> => {
    await withTransaction(async client => {
      for (const [position, id] of ids.entries()) {
        await client.query('UPDATE product_statuses SET position = $1 WHERE product_id = $2 AND id = $3', [position, productId, id]);
      }
    });
  },

  delete: async (productId: string, id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM product_statuses WHERE product_id = $1 AND id = $2', [productId, id]);
    return Boolean(result.rowCount);
  }
};

export const projectRepository = {
  findAll: async (
    user?: AuthScope,
    filter?: { status?: ProjectStatus; clientId?: string; type?: ProjectType; search?: string; assigneeId?: string }
  ): Promise<any[]> => {
    const where: string[] = [];
    const values: unknown[] = [];
    addRestrictedProjectAccess(where, values, user);
    addOperationalProjectScope(where, values, filter?.assigneeId);

    if (filter?.status) {
      values.push(filter.status);
      where.push(`p.product_status_id = $${values.length}`);
    }
    if (filter?.clientId) {
      values.push(filter.clientId);
      where.push(`p.client_id = $${values.length}`);
    }
    if (filter?.type) {
      values.push(filter.type);
      where.push(`p.product_id = $${values.length}`);
    }
    if (filter?.search) {
      values.push(`%${filter.search}%`);
      where.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
    }

    const result = await getPool().query(
      `SELECT p.*, c.name AS client_name, c.company_name AS client_company,
              manager.name AS manager_name, manager.avatar AS manager_avatar,
               product.name AS product_name, product.color AS product_color,
               project_status.name AS project_status_name, project_status.color AS project_status_color,
               project_status.active AS project_status_active,
               project_status.is_completed AS project_status_completed,
               COALESCE((SELECT json_agg(json_build_object(
                 'id', workflow.id, 'productId', workflow.product_id, 'name', workflow.name,
                 'color', workflow.color, 'position', workflow.position, 'active', workflow.active,
                 'isCompleted', workflow.is_completed, 'projectsCount', 0, 'tasksCount', 0
               ) ORDER BY workflow.position, workflow.name)
               FROM product_statuses workflow
               WHERE workflow.product_id = p.product_id AND (workflow.active = TRUE OR workflow.id = p.product_status_id)), '[]'::json) AS workflow_statuses
       FROM projects p
       INNER JOIN clients c ON c.id = p.client_id
       INNER JOIN users manager ON manager.id = p.manager_id
       INNER JOIN products product ON product.id = p.product_id
       INNER JOIN product_statuses project_status ON project_status.id = p.product_status_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC`,
      values
    );
    return enrichProjects(result.rows);
  },

  findById: async (id: string, user?: AuthScope, assigneeId?: string): Promise<any | null> => {
    const where = ['p.id = $1'];
    const values: unknown[] = [id];
    addRestrictedProjectAccess(where, values, user);
    addOperationalProjectScope(where, values, assigneeId);
    const result = await getPool().query(
      `SELECT p.*, c.name AS client_name, c.company_name AS client_company,
              manager.name AS manager_name, manager.avatar AS manager_avatar,
               product.name AS product_name, product.color AS product_color,
               project_status.name AS project_status_name, project_status.color AS project_status_color,
               project_status.active AS project_status_active,
               project_status.is_completed AS project_status_completed,
               COALESCE((SELECT json_agg(json_build_object(
                 'id', workflow.id, 'productId', workflow.product_id, 'name', workflow.name,
                 'color', workflow.color, 'position', workflow.position, 'active', workflow.active,
                 'isCompleted', workflow.is_completed, 'projectsCount', 0, 'tasksCount', 0
               ) ORDER BY workflow.position, workflow.name)
               FROM product_statuses workflow
               WHERE workflow.product_id = p.product_id AND (workflow.active = TRUE OR workflow.id = p.product_status_id)), '[]'::json) AS workflow_statuses
       FROM projects p
       INNER JOIN clients c ON c.id = p.client_id
       INNER JOIN users manager ON manager.id = p.manager_id
       INNER JOIN products product ON product.id = p.product_id
       INNER JOIN product_statuses project_status ON project_status.id = p.product_status_id
       WHERE ${where.join(' AND ')}`,
      values
    );
    if (!result.rowCount) return null;
    return (await enrichProjects(result.rows))[0];
  },

  create: async (
    data: Omit<DbProject, 'id' | 'created_at' | 'updated_at'>,
    teamUserIds: string[] = []
  ): Promise<any> => {
    const projectId = await withTransaction(async client => {
      const productId = data.product_id || legacyProjectTypeToProductId(data.project_type);
      let productStatusId = data.product_status_id;
      if (!productStatusId) {
        const initialStatus = await client.query<{ id: string }>(
          'SELECT id FROM product_statuses WHERE product_id = $1 AND active = TRUE ORDER BY position, name LIMIT 1',
          [productId]
        );
        productStatusId = initialStatus.rows[0]?.id;
      }
      if (!productStatusId) throw new Error('Produto sem status ativo para criação do projeto.');
      const projectResult = await client.query<{ id: string }>(
        `INSERT INTO projects (
          name, description, client_id, project_type, product_id, product_status_id, manager_id, status, priority,
          start_date, due_date, progress, is_recurring, created_by, briefing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          data.name, data.description, data.client_id, data.project_type, productId, productStatusId, data.manager_id,
          data.status || 'PLANNING', data.priority, data.start_date || null, data.due_date || null,
          data.progress, data.is_recurring, data.created_by || null, data.briefing || {}
        ]
      );
      const id = projectResult.rows[0].id;
      await replaceProjectMembers(client, id, data.manager_id, teamUserIds);
      return id;
    });
    return projectRepository.findById(projectId);
  },

  update: async (
    id: string,
    updates: Partial<Omit<DbProject, 'id' | 'created_at' | 'updated_at'>>,
    teamUserIds?: string[]
  ): Promise<any | null> => {
    const updated = await withTransaction(async client => {
      const currentResult = await client.query<{ manager_id: string; product_id: string }>(
        'SELECT manager_id, product_id FROM projects WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!currentResult.rowCount) return false;

      const previousManagerId = currentResult.rows[0].manager_id;
      const productChanged = Boolean(updates.product_id && updates.product_id !== currentResult.rows[0].product_id);
      const taskStatusRemap = new Map<string, { id: string; isCompleted: boolean }>();
      if (productChanged) {
        const targetStatusId = updates.product_status_id;
        if (!targetStatusId) throw new Error('A troca de produto exige um novo status compatível.');
        const [sourceStatuses, targetStatuses] = await Promise.all([
          client.query<{ id: string; name: string; position: number; is_completed: boolean }>(
            `SELECT DISTINCT status.id, status.name, status.position, status.is_completed
             FROM tasks task
             INNER JOIN product_statuses status ON status.id = task.status
             WHERE task.project_id = $1`,
            [id]
          ),
          client.query<{ id: string; name: string; position: number; is_completed: boolean }>(
            `SELECT id, name, position, is_completed
             FROM product_statuses
             WHERE product_id = $1 AND (active = TRUE OR id = $2)
             ORDER BY position, name`,
            [updates.product_id, targetStatusId]
          )
        ]);
        if (!targetStatuses.rows.some(status => status.id === targetStatusId)) {
          throw new Error('Status incompatível com o novo produto.');
        }
        for (const source of sourceStatuses.rows) {
          const sameName = targetStatuses.rows.find(target => (
            target.is_completed === source.is_completed
            && target.name.localeCompare(source.name, 'pt-BR', { sensitivity: 'base' }) === 0
          ));
          const sameSemanticStatuses = targetStatuses.rows.filter(target => target.is_completed === source.is_completed);
          const nearestPosition = sameSemanticStatuses.reduce<typeof sameSemanticStatuses[number] | undefined>((nearest, target) => (
            !nearest || Math.abs(target.position - source.position) < Math.abs(nearest.position - source.position) ? target : nearest
          ), undefined);
          const fallback = targetStatuses.rows.find(target => target.id === targetStatusId)!;
          const mapped = sameName || nearestPosition || fallback;
          taskStatusRemap.set(source.id, { id: mapped.id, isCompleted: mapped.is_completed });
        }
      }
      const columnMap: Record<string, string> = {
        name: 'name', description: 'description', client_id: 'client_id', project_type: 'project_type',
        product_id: 'product_id', product_status_id: 'product_status_id',
        manager_id: 'manager_id', status: 'status', priority: 'priority', start_date: 'start_date',
        due_date: 'due_date', progress: 'progress', is_recurring: 'is_recurring', created_by: 'created_by',
        briefing: 'briefing'
      };
      const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
      if (entries.length) {
        const values = entries.map(([, value]) => value);
        const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
        values.push(id);
        await client.query(`UPDATE projects SET ${assignments.join(', ')} WHERE id = $${values.length}`, values);
      }

      if (productChanged) {
        for (const [sourceStatusId, target] of taskStatusRemap) {
          await client.query(
            `UPDATE tasks SET status = $1,
               completed_at = CASE WHEN $2::boolean THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
             WHERE project_id = $3 AND status = $4`,
            [target.id, target.isCompleted, id, sourceStatusId]
          );
        }
      }

      const managerId = updates.manager_id || previousManagerId;
      if (teamUserIds !== undefined || managerId !== previousManagerId) {
        let effectiveTeamUserIds = teamUserIds;
        if (effectiveTeamUserIds === undefined) {
          const members = await client.query<{ user_id: string }>(
            'SELECT user_id FROM project_members WHERE project_id = $1 AND user_id <> $2',
            [id, previousManagerId]
          );
          effectiveTeamUserIds = members.rows.map(member => member.user_id);
        }
        await replaceProjectMembers(client, id, managerId, effectiveTeamUserIds);
      }
      return true;
    });
    return updated ? projectRepository.findById(id) : null;
  }
};

function normalizeTask(row: any): any {
  const assignees = Array.isArray(row.assignees) && row.assignees.length > 0
    ? row.assignees.map((assignee: any) => ({
        id: assignee.id,
        name: assignee.name,
        avatar: assignee.avatar || '',
        position: assignee.jobTitle || assignee.job_title || 'Especialista'
      }))
    : [{
        id: row.responsible_user_id,
        name: row.responsible_name || 'Não atribuído',
        avatar: row.responsible_avatar || '',
        position: row.responsible_job_title || 'Especialista'
      }];

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    clientId: row.client_id,
    clientName: row.client_name || 'Cliente',
    projectId: row.project_id,
    parentTaskId: row.parent_task_id || undefined,
    generatedByRuleId: row.generated_by_rule_id || undefined,
    projectName: row.project_name || 'Projeto',
    assigneeId: row.responsible_user_id,
    assigneeName: row.responsible_name || 'Não atribuído',
    assigneeAvatar: row.responsible_avatar || '',
    participantIds: assignees.map((assignee: any) => assignee.id),
    assignees,
    availableAssignees: Array.isArray(row.available_assignees) ? row.available_assignees.map((assignee: any) => ({
      id: assignee.id,
      name: assignee.name,
      avatar: assignee.avatar || '',
      position: assignee.jobTitle || 'Especialista'
    })) : [],
    priority: row.priority,
    status: row.status,
    statusName: row.task_status_name || row.status,
    statusColor: row.task_status_color || '#A1A1AA',
    statusCompleted: Boolean(row.task_status_completed),
    productId: row.product_id,
    workflowStatuses: Array.isArray(row.workflow_statuses) ? row.workflow_statuses : [],
    startDate: row.start_date ? toDateString(row.start_date) : undefined,
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : undefined,
    dueDate: toDateString(row.due_date),
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : undefined,
    completedAt: row.completed_at ? toIsoString(row.completed_at) : undefined,
    isRecurring: Boolean(row.recurrence_id),
    recurrence: row.recurrence_id ? {
      id: row.recurrence_id,
      frequency: row.recurrence_frequency,
      ruleText: row.recurrence_rule_text,
      customIntervalDays: row.recurrence_custom_interval_days || undefined,
      nextOccurrenceDate: row.recurrence_next_date ? toDateString(row.recurrence_next_date) : undefined,
      occurrenceTime: row.recurrence_time ? String(row.recurrence_time).slice(0, 5) : undefined,
      status: row.recurrence_status
    } : undefined,
    subtasks: [],
    checklist: [],
    comments: [],
    attachments: [],
    history: [],
    createdBy: row.created_by_name || '',
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function taskSelect(): string {
  return `SELECT t.*, p.client_id, p.name AS project_name, c.name AS client_name,
                 p.product_id, task_status.name AS task_status_name, task_status.color AS task_status_color,
                 task_status.is_completed AS task_status_completed,
                 responsible.name AS responsible_name, responsible.avatar AS responsible_avatar,
                 responsible.job_title AS responsible_job_title, creator.name AS created_by_name,
                 recurrence.id AS recurrence_id, recurrence.frequency AS recurrence_frequency,
                 recurrence.rule_text AS recurrence_rule_text, recurrence.next_occurrence_date AS recurrence_next_date,
                 recurrence.custom_interval_days AS recurrence_custom_interval_days,
                 recurrence.occurrence_time AS recurrence_time, recurrence.status AS recurrence_status,
                 COALESCE((
                   SELECT json_agg(json_build_object(
                     'id', assigned.id,
                     'name', assigned.name,
                     'avatar', assigned.avatar,
                     'jobTitle', assigned.job_title
                   ) ORDER BY ta.created_at, assigned.name)
                   FROM task_assignees ta
                   INNER JOIN users assigned ON assigned.id = ta.user_id
                   WHERE ta.task_id = t.id
                 ), '[]'::json) AS assignees,
                 COALESCE((
                   SELECT json_agg(json_build_object(
                     'id', member_user.id,
                     'name', member_user.name,
                     'avatar', member_user.avatar,
                     'jobTitle', member_user.job_title
                   ) ORDER BY CASE member.member_role WHEN 'MANAGER' THEN 0 ELSE 1 END, member_user.name)
                   FROM project_members member
                   INNER JOIN users member_user ON member_user.id = member.user_id AND member_user.status = 'ACTIVE'
                   WHERE member.project_id = t.project_id
                  ), '[]'::json) AS available_assignees
                 ,COALESCE((
                   SELECT json_agg(json_build_object(
                     'id', workflow.id, 'productId', workflow.product_id, 'name', workflow.name,
                     'color', workflow.color, 'position', workflow.position, 'active', workflow.active,
                     'isCompleted', workflow.is_completed, 'projectsCount', 0, 'tasksCount', 0
                   ) ORDER BY workflow.position, workflow.name)
                   FROM product_statuses workflow
                   WHERE workflow.product_id = p.product_id AND (workflow.active = TRUE OR workflow.id = t.status)
                 ), '[]'::json) AS workflow_statuses
           FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          INNER JOIN clients c ON c.id = p.client_id
          INNER JOIN users responsible ON responsible.id = t.responsible_user_id
           INNER JOIN users creator ON creator.id = t.created_by
           INNER JOIN product_statuses task_status ON task_status.id = t.status
          LEFT JOIN recurrence_rules recurrence ON recurrence.source_task_id = t.id AND recurrence.status <> 'ENDED'`;
}

function normalizeChecklistItem(row: any): any {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.is_completed),
    position: Number(row.position),
    dueDate: row.due_date ? toDateString(row.due_date) : undefined,
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : undefined,
    assigneeId: row.responsible_user_id || undefined
  };
}

async function enrichTasks(rows: any[], assigneeId?: string): Promise<any[]> {
  if (rows.length === 0) return [];
  const tasks = rows.map(normalizeTask);
  const taskIds = tasks.map(task => task.id);
  const subtaskResult = await getPool().query(
    `${taskSelect()} WHERE t.parent_task_id = ANY($1::uuid[])${assigneeId ? ' AND EXISTS (SELECT 1 FROM task_assignees subtask_assignee WHERE subtask_assignee.task_id = t.id AND subtask_assignee.user_id = $2)' : ''} ORDER BY t.created_at`,
    assigneeId ? [taskIds, assigneeId] : [taskIds]
  );
  const subtasks = subtaskResult.rows.map(normalizeTask);
  const allTaskIds = [...taskIds, ...subtasks.map(task => task.id)];
  const checklistResult = await getPool().query(
    `SELECT * FROM checklist_items WHERE task_id = ANY($1::uuid[]) ORDER BY position, created_at`,
    [allTaskIds]
  );
  const commentsResult = await getPool().query(
    `SELECT comment.*, author.name AS user_name, author.avatar AS user_avatar
     FROM task_comments comment
     INNER JOIN users author ON author.id = comment.user_id
     WHERE comment.task_id = ANY($1::uuid[])
     ORDER BY comment.created_at DESC`,
    [allTaskIds]
  );
  const checklistByTask = new Map<string, any[]>();
  for (const row of checklistResult.rows) {
    const items = checklistByTask.get(row.task_id) || [];
    items.push(normalizeChecklistItem(row));
    checklistByTask.set(row.task_id, items);
  }
  const commentsByTask = new Map<string, any[]>();
  for (const row of commentsResult.rows) {
    const comments = commentsByTask.get(row.task_id) || [];
    comments.push({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar || '',
      content: row.content,
      createdAt: toIsoString(row.created_at)
    });
    commentsByTask.set(row.task_id, comments);
  }
  const subtasksByParent = new Map<string, any[]>();
  for (const subtask of subtasks) {
    subtask.checklist = checklistByTask.get(subtask.id) || [];
    subtask.comments = commentsByTask.get(subtask.id) || [];
    const siblings = subtasksByParent.get(subtask.parentTaskId) || [];
    siblings.push(subtask);
    subtasksByParent.set(subtask.parentTaskId, siblings);
  }
  return tasks.map(task => ({
    ...task,
    checklist: checklistByTask.get(task.id) || [],
    comments: commentsByTask.get(task.id) || [],
    subtasks: subtasksByParent.get(task.id) || []
  }));
}

export const taskRepository = {
  findAll: async (
    filter: { projectId?: string; clientId?: string; status?: TaskStatus; assigneeId?: string; search?: string; includeCompleted?: boolean; completedOnly?: boolean } = {},
    user?: AuthScope
  ): Promise<any[]> => {
    const where: string[] = [];
    const values: unknown[] = [];
    addRestrictedProjectAccess(where, values, user, 'p');
    where.push('t.parent_task_id IS NULL');
    if (filter.projectId) { values.push(filter.projectId); where.push(`t.project_id = $${values.length}`); }
    if (filter.clientId) { values.push(filter.clientId); where.push(`p.client_id = $${values.length}`); }
    if (filter.status) {
      values.push(filter.status);
      where.push(`t.status = $${values.length}`);
    } else if (filter.completedOnly) {
      where.push('task_status.is_completed = TRUE');
    } else if (!filter.includeCompleted) {
      where.push('task_status.is_completed = FALSE');
    }
    if (filter.assigneeId) {
      addOperationalAssigneeScope(where, values, filter.assigneeId);
    }
    if (filter.search) {
      values.push(`%${filter.search}%`);
      where.push(`(t.title ILIKE $${values.length} OR t.description ILIKE $${values.length})`);
    }
    const result = await getPool().query(
      `${taskSelect()} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.created_at DESC`,
      values
    );
    return enrichTasks(result.rows, filter.assigneeId);
  },

  findById: async (id: string, user?: AuthScope, assigneeId?: string): Promise<any | null> => {
    const where = ['t.id = $1'];
    const values: unknown[] = [id];
    addRestrictedProjectAccess(where, values, user, 'p');
    if (assigneeId) {
      addOperationalAssigneeScope(where, values, assigneeId);
    }
    const result = await getPool().query(`${taskSelect()} WHERE ${where.join(' AND ')}`, values);
    if (!result.rowCount) return null;
    return (await enrichTasks(result.rows, assigneeId))[0];
  },

  create: async (data: Omit<DbTask, 'id' | 'created_at' | 'updated_at'> & { assignee_ids?: string[] }): Promise<any> => {
    const taskId = await withTransaction(async client => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO tasks (
          project_id, parent_task_id, generated_by_rule_id, title, description, responsible_user_id, status, priority,
          start_date, start_time, due_date, due_time, completed_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [data.project_id, data.parent_task_id || null, data.generated_by_rule_id || null, data.title, data.description, data.responsible_user_id, data.status,
         data.priority, data.start_date || null, data.start_time || null, data.due_date, data.due_time || null,
         data.completed_at || null, data.created_by]
      );
      const id = result.rows[0].id;
      await replaceTaskAssignees(client, id, data.assignee_ids || [data.responsible_user_id]);
      return id;
    });
    return taskRepository.findById(taskId);
  },

  update: async (id: string, updates: Partial<Omit<DbTask, 'id' | 'created_at' | 'updated_at'>> & { assignee_ids?: string[] }): Promise<any | null> => {
    const columnMap: Record<string, string> = {
      project_id: 'project_id', parent_task_id: 'parent_task_id', generated_by_rule_id: 'generated_by_rule_id', title: 'title', description: 'description',
      responsible_user_id: 'responsible_user_id', status: 'status', priority: 'priority',
      start_date: 'start_date', start_time: 'start_time', due_date: 'due_date', due_time: 'due_time', completed_at: 'completed_at'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    const updated = await withTransaction(async client => {
      if (entries.length) {
        const values = entries.map(([, value]) => value);
        const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
        values.push(id);
        const result = await client.query(
          `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING id`, values
        );
        if (!result.rowCount) return false;
      }
      if (updates.assignee_ids) await replaceTaskAssignees(client, id, updates.assignee_ids);
      return true;
    });
    return updated ? taskRepository.findById(id) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM tasks WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  }
};

export const taskCommentRepository = {
  create: async (taskId: string, userId: string, content: string): Promise<DbTaskComment> => {
    const result = await getPool().query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, userId, content]
    );
    return { ...result.rows[0], created_at: toIsoString(result.rows[0].created_at) } as DbTaskComment;
  }
};

export const checklistRepository = {
  create: async (taskId: string, data: { title: string; due_date?: string | null; due_time?: string | null; responsible_user_id?: string | null }): Promise<any> => {
    const positionResult = await getPool().query<{ next_position: number }>(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM checklist_items WHERE task_id = $1',
      [taskId]
    );
    const result = await getPool().query(
      `INSERT INTO checklist_items (task_id, title, due_date, due_time, responsible_user_id, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [taskId, data.title, data.due_date || null, data.due_time || null, data.responsible_user_id || null, positionResult.rows[0].next_position]
    );
    return normalizeChecklistItem(result.rows[0]);
  },

  update: async (id: string, updates: { title?: string; is_completed?: boolean; due_date?: string | null; due_time?: string | null; responsible_user_id?: string | null; position?: number }): Promise<any | null> => {
    const columnMap: Record<string, string> = {
      title: 'title', is_completed: 'is_completed', due_date: 'due_date', due_time: 'due_time', responsible_user_id: 'responsible_user_id', position: 'position'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return null;
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE checklist_items SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`, values
    );
    return result.rowCount ? normalizeChecklistItem(result.rows[0]) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM checklist_items WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  },

  findTaskId: async (id: string): Promise<string | null> => {
    const result = await getPool().query<{ task_id: string }>('SELECT task_id FROM checklist_items WHERE id = $1', [id]);
    return result.rowCount ? result.rows[0].task_id : null;
  }
};

export const projectResourceRepository = {
  findAll: async (projectId: string): Promise<any[]> => {
    const result = await getPool().query(
      'SELECT * FROM project_resources WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      kind: row.kind,
      name: row.name,
      url: row.url || undefined,
      storagePath: row.storage_path || undefined,
      mimeType: row.mime_type || undefined,
      sizeBytes: row.size_bytes == null ? undefined : Number(row.size_bytes),
      createdAt: toIsoString(row.created_at)
    }));
  },

  findById: async (id: string): Promise<any | null> => {
    const result = await getPool().query('SELECT * FROM project_resources WHERE id = $1', [id]);
    return result.rowCount ? result.rows[0] : null;
  },

  create: async (data: Omit<DbProjectResource, 'id' | 'created_at'>): Promise<any> => {
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO project_resources (project_id, kind, name, url, storage_path, mime_type, size_bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.project_id, data.kind, data.name, data.url || null, data.storage_path || null,
       data.mime_type || null, data.size_bytes || null, data.created_by]
    );
    return (await projectResourceRepository.findAll(data.project_id)).find(resource => resource.id === result.rows[0].id);
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM project_resources WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  }
};

function normalizeRoutine(row: any): any {
  const assignees = Array.isArray(row.assignees) ? row.assignees : [];
  return {
    id: row.id,
    sourceTaskId: row.source_task_id,
    title: row.title,
    projectId: row.project_id,
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.client_name,
    frequency: row.frequency,
    ruleText: row.rule_text,
    customIntervalDays: row.custom_interval_days || undefined,
    nextOccurrenceDate: toDateString(row.next_occurrence_date),
    occurrenceTime: row.occurrence_time ? String(row.occurrence_time).slice(0, 5) : undefined,
    status: row.rule_status,
    assignees: assignees.map((assignee: any) => ({
      id: assignee.id, name: assignee.name, avatar: assignee.avatar || '', position: assignee.jobTitle || 'Especialista'
    })),
    priority: row.priority,
    description: row.description || '',
    createdById: row.created_by,
    initialStatusId: row.initial_status_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function routineSelect(): string {
  return `SELECT r.*, r.status AS rule_status, source.title, source.description, source.priority,
                 source.project_id, source.created_by, p.client_id, p.name AS project_name, c.name AS client_name,
                 (SELECT initial_status.id FROM product_statuses initial_status
                  WHERE initial_status.product_id = p.product_id AND initial_status.active = TRUE
                  ORDER BY initial_status.position, initial_status.name LIMIT 1) AS initial_status_id,
                 COALESCE((
                   SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'jobTitle', u.job_title) ORDER BY ta.created_at)
                   FROM task_assignees ta INNER JOIN users u ON u.id = ta.user_id
                   WHERE ta.task_id = source.id
                 ), '[]'::json) AS assignees
          FROM recurrence_rules r
          INNER JOIN tasks source ON source.id = r.source_task_id
          INNER JOIN projects p ON p.id = source.project_id
          INNER JOIN clients c ON c.id = p.client_id`;
}

function advanceRoutineDate(dateValue: string, frequency: string, customIntervalDays?: number): string {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (frequency === 'DIARIO') date.setUTCDate(date.getUTCDate() + 1);
  else if (frequency === 'SEMANAL') date.setUTCDate(date.getUTCDate() + 7);
  else if (frequency === 'QUINZENAL') date.setUTCDate(date.getUTCDate() + 15);
  else if (frequency === 'MENSAL') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCDate(date.getUTCDate() + (customIntervalDays || 7));
  return date.toISOString().slice(0, 10);
}

export const routineRepository = {
  findAll: async (user?: AuthScope, assigneeId?: string): Promise<any[]> => {
    const where: string[] = [];
    const values: unknown[] = [];
    addRestrictedProjectAccess(where, values, user, 'p');
    addOperationalAssigneeScope(where, values, assigneeId, 'source');
    const result = await getPool().query(
      `${routineSelect()} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.created_at DESC`,
      values
    );
    return result.rows.map(normalizeRoutine);
  },

  findById: async (id: string, user?: AuthScope): Promise<any | null> => {
    const where = ['r.id = $1'];
    const values: unknown[] = [id];
    addRestrictedProjectAccess(where, values, user, 'p');
    const result = await getPool().query(`${routineSelect()} WHERE ${where.join(' AND ')}`, values);
    return result.rowCount ? normalizeRoutine(result.rows[0]) : null;
  },

  findBySourceTask: async (taskId: string): Promise<any | null> => {
    const result = await getPool().query(`${routineSelect()} WHERE r.source_task_id = $1`, [taskId]);
    return result.rowCount ? normalizeRoutine(result.rows[0]) : null;
  },

  upsert: async (data: {
    source_task_id: string; frequency: string; rule_text: string; custom_interval_days?: number | null;
    next_occurrence_date: string; occurrence_time?: string | null; created_by: string;
  }): Promise<any> => {
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO recurrence_rules (
        source_task_id, frequency, rule_text, custom_interval_days, next_occurrence_date, occurrence_time, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (source_task_id) DO UPDATE SET
         frequency = EXCLUDED.frequency,
         rule_text = EXCLUDED.rule_text,
         custom_interval_days = EXCLUDED.custom_interval_days,
         next_occurrence_date = EXCLUDED.next_occurrence_date,
         occurrence_time = EXCLUDED.occurrence_time,
         status = 'ACTIVE'
       RETURNING id`,
      [data.source_task_id, data.frequency, data.rule_text, data.custom_interval_days || null,
       data.next_occurrence_date, data.occurrence_time || null, data.created_by]
    );
    return routineRepository.findById(result.rows[0].id);
  },

  update: async (id: string, updates: Record<string, unknown>): Promise<any | null> => {
    const columnMap: Record<string, string> = {
      frequency: 'frequency', rule_text: 'rule_text', custom_interval_days: 'custom_interval_days',
      next_occurrence_date: 'next_occurrence_date', occurrence_time: 'occurrence_time', status: 'status'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return routineRepository.findById(id);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE recurrence_rules SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING id`, values
    );
    return result.rowCount ? routineRepository.findById(id) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM recurrence_rules WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  },

  deleteBySourceTask: async (taskId: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM recurrence_rules WHERE source_task_id = $1', [taskId]);
    return Boolean(result.rowCount);
  },

  materializeDueOccurrences: async (user?: AuthScope): Promise<void> => {
    const today = new Date().toISOString().slice(0, 10);
    const routines = (await routineRepository.findAll(user)).filter(routine => routine.status === 'ACTIVE');
    for (const routine of routines) {
      let nextDate = routine.nextOccurrenceDate;
      let guard = 0;
      while (nextDate <= today && guard < 60) {
        guard += 1;
        try {
          await taskRepository.create({
            project_id: routine.projectId,
            parent_task_id: null,
            generated_by_rule_id: routine.id,
            title: `${routine.title} — ${nextDate.split('-').reverse().slice(0, 2).join('/')}`,
            description: routine.description,
            responsible_user_id: routine.assignees[0].id,
            assignee_ids: routine.assignees.map((assignee: any) => assignee.id),
            status: routine.initialStatusId,
            priority: routine.priority,
            start_date: nextDate,
            start_time: routine.occurrenceTime || null,
            due_date: nextDate,
            due_time: routine.occurrenceTime || null,
            completed_at: null,
            created_by: routine.createdById
          });
        } catch (error: any) {
          if (!String(error?.message || '').toLowerCase().includes('unique')) throw error;
        }
        nextDate = advanceRoutineDate(nextDate, routine.frequency, routine.customIntervalDays);
      }
      if (nextDate !== routine.nextOccurrenceDate) {
        await routineRepository.update(routine.id, { next_occurrence_date: nextDate });
      }
    }
  },

  nextDate: advanceRoutineDate
};

async function replaceTaskAssignees(client: PoolClient, taskId: string, userIds: string[]): Promise<void> {
  const uniqueUserIds = Array.from(new Set(userIds));
  await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
  for (const userId of uniqueUserIds) {
    await client.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [taskId, userId]);
  }
}

async function replaceProjectMembers(
  client: PoolClient,
  projectId: string,
  managerId: string,
  teamUserIds: string[]
): Promise<void> {
  const uniqueUserIds = Array.from(new Set([managerId, ...teamUserIds]));
  await client.query('DELETE FROM project_members WHERE project_id = $1', [projectId]);
  for (const userId of uniqueUserIds) {
    await client.query(
      `INSERT INTO project_members (project_id, user_id, member_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET member_role = EXCLUDED.member_role`,
      [projectId, userId, userId === managerId ? 'MANAGER' : 'COLLABORATOR']
    );
  }
}
