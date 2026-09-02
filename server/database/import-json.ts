import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { closeDatabase, withTransaction } from './connection.js';

interface LegacyDatabase {
  users?: any[];
  clients?: any[];
  projects?: any[];
  project_members?: any[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableUuid(entity: string, legacyId: string): string {
  if (UUID_PATTERN.test(legacyId)) return legacyId.toLowerCase();
  const bytes = crypto.createHash('sha256').update(`tecnihub:${entity}:${legacyId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requiredId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} ausente no JSON legado.`);
  return value;
}

async function importJson(): Promise<void> {
  const legacyPath = path.resolve(process.env.LEGACY_JSON_PATH?.trim() || path.join('data', 'app_database.json'));
  if (!fs.existsSync(legacyPath)) throw new Error(`Arquivo JSON legado não encontrado: ${legacyPath}`);
  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as LegacyDatabase;
  const users = Array.isArray(legacy.users) ? legacy.users : [];
  const clients = Array.isArray(legacy.clients) ? legacy.clients : [];
  const projects = Array.isArray(legacy.projects) ? legacy.projects : [];
  const members = Array.isArray(legacy.project_members) ? legacy.project_members : [];

  await withTransaction(async client => {
    for (const user of users) {
      const legacyId = requiredId(user.id, 'users.id');
      await client.query(
        `INSERT INTO users (
          id, name, email, password_hash, avatar, role, job_title, status, created_at, updated_at
        ) VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          stableUuid('user', legacyId), user.name, user.email, user.password_hash,
          user.avatar || '', user.role, user.job_title || 'Especialista', user.status || 'ACTIVE',
          user.created_at || new Date().toISOString(), user.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const clientRow of clients) {
      const legacyId = requiredId(clientRow.id, 'clients.id');
      await client.query(
        `INSERT INTO clients (
          id, name, company_name, logo, contact_name, email, phone, status,
          lead_manager_id, notes, monthly_services, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12, $13)
        ON CONFLICT (id) DO NOTHING`,
        [
          stableUuid('client', legacyId), clientRow.name, clientRow.company_name || clientRow.name,
          clientRow.logo || 'CL', clientRow.contact_name || '', clientRow.email || '', clientRow.phone || '',
          clientRow.status || 'ACTIVE', clientRow.lead_manager_id ? stableUuid('user', clientRow.lead_manager_id) : null,
          clientRow.notes || '', Array.isArray(clientRow.monthly_services) ? clientRow.monthly_services : [],
          clientRow.created_at || new Date().toISOString(), clientRow.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const project of projects) {
      const legacyId = requiredId(project.id, 'projects.id');
      await client.query(
        `INSERT INTO projects (
          id, client_id, name, description, project_type, manager_id, status, priority,
          start_date, due_date, progress, is_recurring, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING`,
        [
          stableUuid('project', legacyId), stableUuid('client', requiredId(project.client_id, 'projects.client_id')),
          project.name, project.description || '', project.project_type || 'WEBSITE',
          stableUuid('user', requiredId(project.manager_id, 'projects.manager_id')),
          project.status || 'PLANNING', project.priority || 'NORMAL', project.start_date || null,
          project.due_date || null, Number(project.progress) || 0, Boolean(project.is_recurring),
          project.created_by ? stableUuid('user', project.created_by) : null,
          project.created_at || new Date().toISOString(), project.updated_at || new Date().toISOString()
        ]
      );
    }

    for (const member of members) {
      const legacyId = requiredId(member.id, 'project_members.id');
      await client.query(
        `INSERT INTO project_members (id, project_id, user_id, member_role, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [
          stableUuid('project-member', legacyId),
          stableUuid('project', requiredId(member.project_id, 'project_members.project_id')),
          stableUuid('user', requiredId(member.user_id, 'project_members.user_id')),
          member.member_role || 'COLLABORATOR', member.created_at || new Date().toISOString()
        ]
      );
    }
  });

  console.log(`[DB] Importação concluída: ${users.length} usuários, ${clients.length} clientes, ${projects.length} projetos e ${members.length} vínculos processados.`);
}

importJson()
  .catch(error => {
    console.error('[DB] Falha ao importar JSON legado:', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);

