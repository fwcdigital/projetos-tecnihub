import 'dotenv/config';
import { PoolClient } from 'pg';
import { getPool, withTransaction } from './database/connection.js';
import { listMigrationFiles } from './database/migration-files.js';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PROJECT_MANAGER' | 'COLLABORATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProjectStatus =
  | 'PLANNING'
  | 'WAITING_TO_START'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'IN_REVIEW'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';
export type ProjectType =
  | 'WEBSITE'
  | 'LANDING_PAGE'
  | 'ECOMMERCE'
  | 'GOOGLE_ADS'
  | 'META_ADS'
  | 'SEO'
  | 'SOCIAL_MEDIA'
  | 'MAINTENANCE'
  | 'INTERNAL'
  | 'OTHER';
export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type TaskStatus = 'BACKLOG' | 'A_FAZER' | 'EM_ANDAMENTO' | 'AGUARDANDO_CLIENTE' | 'EM_REVISAO' | 'CONCLUIDO' | 'BLOQUEADO';
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

export interface DbProject {
  id: string;
  name: string;
  description: string;
  briefing?: Record<string, string>;
  client_id: string;
  project_type: ProjectType;
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

export interface DbTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  responsible_user_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string | null;
  due_date: string;
  due_time?: string | null;
  completed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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

  return rows.map(row => {
    const { client_name, client_company, manager_name, manager_avatar, ...projectRow } = row;
    return {
      ...normalizeProject(projectRow),
      clientName: client_name || 'Cliente Desconhecido',
      clientCompany: client_company || '',
      managerName: manager_name || 'Gestor Não Atribuído',
      managerAvatar: manager_avatar || '',
      teamMembers: membersByProject.get(row.id) || []
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
      `SELECT c.* FROM clients c
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
    const result = await getPool().query(`SELECT c.* FROM clients c WHERE ${where.join(' AND ')}`, values);
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
    return result.rowCount ? normalizeClient(result.rows[0]) : null;
  },

  archive: async (id: string): Promise<DbClient | null> => clientRepository.update(id, { status: 'ARCHIVED' })
};

export const projectRepository = {
  findAll: async (
    user?: AuthScope,
    filter?: { status?: ProjectStatus; clientId?: string; type?: ProjectType; search?: string }
  ): Promise<any[]> => {
    const where: string[] = [];
    const values: unknown[] = [];
    addRestrictedProjectAccess(where, values, user);

    if (filter?.status) {
      values.push(filter.status);
      where.push(`p.status = $${values.length}`);
    }
    if (filter?.clientId) {
      values.push(filter.clientId);
      where.push(`p.client_id = $${values.length}`);
    }
    if (filter?.type) {
      values.push(filter.type);
      where.push(`p.project_type = $${values.length}`);
    }
    if (filter?.search) {
      values.push(`%${filter.search}%`);
      where.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
    }

    const result = await getPool().query(
      `SELECT p.*, c.name AS client_name, c.company_name AS client_company,
              manager.name AS manager_name, manager.avatar AS manager_avatar
       FROM projects p
       INNER JOIN clients c ON c.id = p.client_id
       INNER JOIN users manager ON manager.id = p.manager_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC`,
      values
    );
    return enrichProjects(result.rows);
  },

  findById: async (id: string, user?: AuthScope): Promise<any | null> => {
    const where = ['p.id = $1'];
    const values: unknown[] = [id];
    addRestrictedProjectAccess(where, values, user);
    const result = await getPool().query(
      `SELECT p.*, c.name AS client_name, c.company_name AS client_company,
              manager.name AS manager_name, manager.avatar AS manager_avatar
       FROM projects p
       INNER JOIN clients c ON c.id = p.client_id
       INNER JOIN users manager ON manager.id = p.manager_id
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
      const projectResult = await client.query<{ id: string }>(
        `INSERT INTO projects (
          name, description, client_id, project_type, manager_id, status, priority,
          start_date, due_date, progress, is_recurring, created_by, briefing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          data.name, data.description, data.client_id, data.project_type, data.manager_id,
          data.status, data.priority, data.start_date || null, data.due_date || null,
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
      const currentResult = await client.query<{ manager_id: string }>(
        'SELECT manager_id FROM projects WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!currentResult.rowCount) return false;

      const previousManagerId = currentResult.rows[0].manager_id;
      const columnMap: Record<string, string> = {
        name: 'name', description: 'description', client_id: 'client_id', project_type: 'project_type',
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
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    clientId: row.client_id,
    clientName: row.client_name || 'Cliente',
    projectId: row.project_id,
    projectName: row.project_name || 'Projeto',
    assigneeId: row.responsible_user_id,
    assigneeName: row.responsible_name || 'Não atribuído',
    assigneeAvatar: row.responsible_avatar || '',
    participantIds: [row.responsible_user_id],
    priority: row.priority,
    status: row.status,
    startDate: row.start_date ? toDateString(row.start_date) : undefined,
    dueDate: toDateString(row.due_date),
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : undefined,
    completedAt: row.completed_at ? toIsoString(row.completed_at) : undefined,
    isRecurring: false,
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
                 responsible.name AS responsible_name, responsible.avatar AS responsible_avatar,
                 creator.name AS created_by_name
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          INNER JOIN clients c ON c.id = p.client_id
          INNER JOIN users responsible ON responsible.id = t.responsible_user_id
          INNER JOIN users creator ON creator.id = t.created_by`;
}

export const taskRepository = {
  findAll: async (
    filter: { projectId?: string; clientId?: string; status?: TaskStatus; assigneeId?: string; search?: string; includeCompleted?: boolean } = {},
    user?: AuthScope
  ): Promise<any[]> => {
    const where: string[] = [];
    const values: unknown[] = [];
    addRestrictedProjectAccess(where, values, user, 'p');
    if (filter.projectId) { values.push(filter.projectId); where.push(`t.project_id = $${values.length}`); }
    if (filter.clientId) { values.push(filter.clientId); where.push(`p.client_id = $${values.length}`); }
    if (filter.status) {
      values.push(filter.status);
      where.push(`t.status = $${values.length}`);
    } else if (!filter.includeCompleted) {
      where.push(`t.status <> 'CONCLUIDO'`);
    }
    if (filter.assigneeId) { values.push(filter.assigneeId); where.push(`t.responsible_user_id = $${values.length}`); }
    if (filter.search) {
      values.push(`%${filter.search}%`);
      where.push(`(t.title ILIKE $${values.length} OR t.description ILIKE $${values.length})`);
    }
    const result = await getPool().query(
      `${taskSelect()} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.created_at DESC`,
      values
    );
    return result.rows.map(normalizeTask);
  },

  findById: async (id: string, user?: AuthScope): Promise<any | null> => {
    const where = ['t.id = $1'];
    const values: unknown[] = [id];
    addRestrictedProjectAccess(where, values, user, 'p');
    const result = await getPool().query(`${taskSelect()} WHERE ${where.join(' AND ')}`, values);
    return result.rowCount ? normalizeTask(result.rows[0]) : null;
  },

  create: async (data: Omit<DbTask, 'id' | 'created_at' | 'updated_at'>): Promise<any> => {
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO tasks (
        project_id, title, description, responsible_user_id, status, priority,
        start_date, due_date, due_time, completed_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [data.project_id, data.title, data.description, data.responsible_user_id, data.status,
       data.priority, data.start_date || null, data.due_date, data.due_time || null,
       data.completed_at || null, data.created_by]
    );
    return taskRepository.findById(result.rows[0].id);
  },

  update: async (id: string, updates: Partial<Omit<DbTask, 'id' | 'created_at' | 'updated_at'>>): Promise<any | null> => {
    const columnMap: Record<string, string> = {
      project_id: 'project_id', title: 'title', description: 'description',
      responsible_user_id: 'responsible_user_id', status: 'status', priority: 'priority',
      start_date: 'start_date', due_date: 'due_date', due_time: 'due_time', completed_at: 'completed_at'
    };
    const entries = Object.entries(updates).filter(([key, value]) => key in columnMap && value !== undefined);
    if (!entries.length) return taskRepository.findById(id);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 1}`);
    values.push(id);
    const result = await getPool().query(
      `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING id`, values
    );
    return result.rowCount ? taskRepository.findById(id) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await getPool().query('DELETE FROM tasks WHERE id = $1', [id]);
    return Boolean(result.rowCount);
  }
};

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
