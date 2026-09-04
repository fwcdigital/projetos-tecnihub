import express, { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { projectRepository, projectResourceRepository, productRepository, productStatusRepository, clientRepository, userRepository, ProjectStatus, ProjectType, Priority } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';
import { canEditProjectDates, canManageProjectOperations, canManageProjectTeam, isAdministrator } from '../permissions.js';

export const projectRouter = Router();

const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
const FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'project-resources';
  return url && key ? { url, key, bucket } : null;
}

function canManageProject(req: AuthRequest): boolean {
  return canManageProjectOperations(req.user);
}

function legacyTypeForProduct(productId: string): ProjectType {
  const mapping: Record<string, ProjectType> = {
    SITE: 'WEBSITE', LANDING_PAGE: 'LANDING_PAGE', ECOMMERCE: 'ECOMMERCE',
    PAID_TRAFFIC: 'GOOGLE_ADS', SEO: 'SEO', MAINTENANCE: 'MAINTENANCE', INTERNAL: 'INTERNAL', OTHER: 'OTHER'
  };
  return mapping[productId] || 'OTHER';
}

function encodedStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function getInvalidTeamMemberId(teamUserIds: unknown): Promise<string | null> {
  if (teamUserIds === undefined) return null;
  if (!Array.isArray(teamUserIds)) return 'formato-invalido';

  for (const userId of teamUserIds) {
    if (!isUuid(userId)) return String(userId);
    const user = await userRepository.findById(userId);
    if (!user || user.status !== 'ACTIVE') return userId;
  }

  return null;
}

// GET /api/projects - Listar projetos respeitando RBAC
projectRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, clientId, type, search, operationalView } = req.query;
    if (operationalView && !['admin', 'operator'].includes(String(operationalView))) return res.status(400).json({ error: 'Contexto operacional inválido.' });
    if (operationalView && !isAdministrator(req.user)) return res.status(403).json({ error: 'O contexto operacional é exclusivo para administradores.' });

    const projects = await projectRepository.findAll(req.user, {
      status: status as ProjectStatus,
      clientId: clientId as string,
      type: type as ProjectType,
      search: search as string,
      assigneeId: operationalView === 'operator' ? req.user!.id : undefined
    });

    return res.json({ projects });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar projetos.' });
  }
});

projectRouter.post('/:id/resources/drive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const project = isUuid(req.params.id) ? await projectRepository.findById(req.params.id, req.user) : null;
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (!canManageProject(req)) return res.status(403).json({ error: 'Sem permissão para alterar materiais do projeto.' });
    const name = String(req.body.name || '').trim();
    const value = String(req.body.url || '').trim();
    let parsed: URL;
    try { parsed = new URL(value); } catch { return res.status(400).json({ error: 'Informe um link válido do Google Drive.' }); }
    if (parsed.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(parsed.hostname)) {
      return res.status(400).json({ error: 'Informe um link válido do Google Drive.' });
    }
    const resource = await projectResourceRepository.create({
      project_id: project.id, kind: 'GOOGLE_DRIVE', name: name || 'Material no Google Drive',
      url: parsed.toString(), storage_path: null, mime_type: null, size_bytes: null, created_by: req.user!.id
    });
    return res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error('Erro ao adicionar link do Drive:', error);
    return res.status(500).json({ error: 'Erro ao adicionar material.' });
  }
});

projectRouter.post(
  '/:id/resources/upload',
  authenticateToken,
  express.raw({ type: FILE_TYPES, limit: '20mb' }),
  async (req: AuthRequest, res: Response) => {
    try {
      const project = isUuid(req.params.id) ? await projectRepository.findById(req.params.id, req.user) : null;
      if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
      if (!canManageProject(req)) return res.status(403).json({ error: 'Sem permissão para alterar materiais do projeto.' });
      const mimeType = String(req.headers['content-type'] || '').split(';')[0];
      if (!FILE_TYPES.includes(mimeType)) return res.status(415).json({ error: 'Envie um arquivo PDF ou DOCX.' });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Arquivo vazio.' });
      const config = storageConfig();
      if (!config) return res.status(503).json({ error: 'Supabase Storage ainda não foi configurado no servidor.' });
      const originalName = decodeURIComponent(String(req.query.filename || 'material')).replace(/[\\/]/g, '-').slice(0, 180);
      const storagePath = `${project.id}/${randomUUID()}-${originalName}`;
      const upload = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${encodedStoragePath(storagePath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, 'Content-Type': mimeType, 'x-upsert': 'false' },
        body: req.body
      });
      if (!upload.ok) throw new Error(`Supabase Storage respondeu ${upload.status}`);
      const resource = await projectResourceRepository.create({
        project_id: project.id, kind: 'FILE', name: originalName, url: null, storage_path: storagePath,
        mime_type: mimeType, size_bytes: req.body.length, created_by: req.user!.id
      });
      return res.status(201).json({ success: true, resource });
    } catch (error) {
      console.error('Erro ao enviar material:', error);
      return res.status(500).json({ error: 'Erro ao enviar material para o Storage.' });
    }
  }
);

projectRouter.get('/:projectId/resources/:resourceId/open', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const resource = isUuid(req.params.resourceId) ? await projectResourceRepository.findById(req.params.resourceId) : null;
    if (!resource || resource.project_id !== req.params.projectId) return res.status(404).json({ error: 'Material não encontrado.' });
    const project = await projectRepository.findById(resource.project_id, req.user);
    if (!project) return res.status(403).json({ error: 'Acesso negado.' });
    if (resource.kind === 'GOOGLE_DRIVE') return res.redirect(resource.url);
    const config = storageConfig();
    if (!config) return res.status(503).json({ error: 'Supabase Storage ainda não foi configurado no servidor.' });
    const download = await fetch(`${config.url}/storage/v1/object/authenticated/${config.bucket}/${encodedStoragePath(resource.storage_path)}`, {
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key }
    });
    if (!download.ok) return res.status(404).json({ error: 'Arquivo não encontrado no Storage.' });
    res.setHeader('Content-Type', resource.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(resource.name)}`);
    return res.send(Buffer.from(await download.arrayBuffer()));
  } catch {
    return res.status(500).json({ error: 'Erro ao abrir material.' });
  }
});

projectRouter.delete('/:projectId/resources/:resourceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const resource = isUuid(req.params.resourceId) ? await projectResourceRepository.findById(req.params.resourceId) : null;
    if (!resource || resource.project_id !== req.params.projectId) return res.status(404).json({ error: 'Material não encontrado.' });
    const project = await projectRepository.findById(resource.project_id, req.user);
    if (!project) return res.status(403).json({ error: 'Acesso negado.' });
    if (!canManageProject(req)) return res.status(403).json({ error: 'Sem permissão para remover materiais.' });
    if (resource.storage_path) {
      const config = storageConfig();
      if (!config) return res.status(503).json({ error: 'Supabase Storage ainda não foi configurado no servidor.' });
      const removal = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${encodedStoragePath(resource.storage_path)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${config.key}`, apikey: config.key }
      });
      if (!removal.ok && removal.status !== 404) throw new Error(`Supabase Storage respondeu ${removal.status}`);
    }
    await projectResourceRepository.delete(resource.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover material:', error);
    return res.status(500).json({ error: 'Erro ao remover material.' });
  }
});

// GET /api/projects/:id - Detalhes do projeto
projectRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para acessá-lo.' });
    }
    const operationalView = req.query.operationalView;
    if (operationalView && !['admin', 'operator'].includes(String(operationalView))) return res.status(400).json({ error: 'Contexto operacional inválido.' });
    if (operationalView && !isAdministrator(req.user)) return res.status(403).json({ error: 'O contexto operacional é exclusivo para administradores.' });
    const project = await projectRepository.findById(req.params.id, req.user, operationalView === 'operator' ? req.user!.id : undefined);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para acessá-lo.' });
    }
    return res.json({ project });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar projeto.' });
  }
});

// POST /api/projects - Criar novo projeto
projectRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      client_id,
      product_id,
      product_status_id,
      manager_id,
      status,
      priority,
      start_date,
      due_date,
      progress,
      is_recurring,
      briefing,
      team_user_ids
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do projeto é obrigatório.' });
    }

    if (!client_id || !isUuid(client_id)) {
      return res.status(400).json({ error: 'É obrigatório selecionar um cliente para o projeto.' });
    }

    const client = await clientRepository.findById(client_id, req.user);
    if (!client) {
      return res.status(404).json({ error: 'O cliente selecionado não foi encontrado.' });
    }

    const chosenManagerId = manager_id || req.user?.id;
    if (!isUuid(chosenManagerId)) {
      return res.status(400).json({ error: 'O gestor selecionado é inválido.' });
    }
    const manager = await userRepository.findById(chosenManagerId);
    if (!manager || manager.status !== 'ACTIVE' || manager.role === 'COLLABORATOR') {
      return res.status(404).json({ error: 'O gestor selecionado não foi encontrado.' });
    }

    if (req.user?.role === 'PROJECT_MANAGER' && chosenManagerId !== req.user.id) {
      return res.status(403).json({ error: 'Gestores de projeto só podem criar projetos sob sua própria gestão.' });
    }
    if (!canEditProjectDates(req.user) && (start_date !== undefined || due_date !== undefined)) {
      return res.status(403).json({ error: 'Somente administradores podem definir as datas estruturais do projeto.' });
    }

    const selectedProduct = product_id ? await productRepository.findById(String(product_id)) : null;
    if (!selectedProduct || !selectedProduct.active) return res.status(400).json({ error: 'Tipo de projeto inválido ou inativo.' });
    const requestedStatusId = product_status_id || status;
    const selectedStatus = requestedStatusId
      ? await productStatusRepository.findById(selectedProduct.id, String(requestedStatusId))
      : await productStatusRepository.findFirstActive(selectedProduct.id);
    if (!selectedStatus || !selectedStatus.active) return res.status(400).json({ error: 'Status incompatível ou inativo para o Tipo selecionado.' });
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Prioridade de projeto inválida.' });
    }

    const invalidTeamMemberId = await getInvalidTeamMemberId(team_user_ids);
    if (invalidTeamMemberId) {
      return res.status(400).json({ error: 'A equipe contém um usuário inválido ou inativo.' });
    }

    const newProject = await projectRepository.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      client_id,
      project_type: legacyTypeForProduct(selectedProduct.id),
      product_id: selectedProduct.id,
      product_status_id: selectedStatus.id,
      manager_id: chosenManagerId,
      status: 'PLANNING' as ProjectStatus,
      priority: (priority as Priority) || 'NORMAL',
      start_date: start_date || null,
      due_date: due_date || undefined,
      progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0,
      is_recurring: Boolean(is_recurring),
      briefing: briefing && typeof briefing === 'object' ? briefing : {},
      created_by: req.user?.id
    }, Array.isArray(team_user_ids) ? team_user_ids : []);

    return res.status(201).json({
      message: 'Projeto criado com sucesso.',
      project: newProject
    });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return res.status(500).json({ error: 'Erro interno ao criar projeto.' });
  }
});

// PUT /api/projects/:id - Atualizar projeto
projectRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    if (!isUuid(projectId)) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para editá-lo.' });
    }
    const existing = await projectRepository.findById(projectId, req.user);

    if (!existing) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para editá-lo.' });
    }

    // Administradores editam tudo; gestores com acesso editam apenas campos operacionais.
    const isSuperOrAdmin = isAdministrator(req.user);
    if (!canManageProjectOperations(req.user)) {
      return res.status(403).json({ error: 'Você não possui controles administrativos deste projeto.' });
    }

    const {
      name,
      description,
      client_id,
      product_id,
      product_status_id,
      manager_id,
      status,
      priority,
      start_date,
      due_date,
      progress,
      is_recurring,
      briefing,
      team_user_ids
    } = req.body;

    if (!isSuperOrAdmin && manager_id !== undefined) {
      return res.status(403).json({ error: 'Somente administradores podem trocar o responsável principal do projeto.' });
    }
    if (!canEditProjectDates(req.user) && (start_date !== undefined || due_date !== undefined)) {
      return res.status(403).json({ error: 'Somente administradores podem alterar as datas estruturais do projeto.' });
    }
    if (!canManageProjectTeam(req.user) && team_user_ids !== undefined) {
      return res.status(403).json({ error: 'Sem permissão para alterar a equipe do projeto.' });
    }

    if (req.user?.role === 'PROJECT_MANAGER' && manager_id && manager_id !== req.user.id) {
      return res.status(403).json({ error: 'O gestor do projeto não pode transferir a própria gestão.' });
    }

    if (client_id && (!isUuid(client_id) || !(await clientRepository.findById(client_id, req.user)))) {
      return res.status(404).json({ error: 'O cliente selecionado não foi encontrado ou não está acessível.' });
    }

    if (manager_id) {
      if (!isUuid(manager_id)) {
        return res.status(400).json({ error: 'O gestor selecionado é inválido.' });
      }
      const manager = await userRepository.findById(manager_id);
      if (!manager || manager.status !== 'ACTIVE' || manager.role === 'COLLABORATOR') {
        return res.status(400).json({ error: 'O gestor selecionado é inválido ou está inativo.' });
      }
    }

    const targetProductId = String(product_id || existing.productId);
    const selectedProduct = await productRepository.findById(targetProductId);
    if (!selectedProduct || (!selectedProduct.active && targetProductId !== existing.productId)) {
      return res.status(400).json({ error: 'Tipo de projeto inválido ou inativo.' });
    }
    const requestedStatusId = product_status_id || status;
    if (product_id && targetProductId !== existing.productId && !requestedStatusId) {
      return res.status(400).json({ error: 'A troca de Tipo exige um novo Status compatível.' });
    }
    const targetStatusId = String(requestedStatusId || existing.projectStatusId);
    const selectedStatus = await productStatusRepository.findById(targetProductId, targetStatusId);
    if (!selectedStatus || (!selectedStatus.active && targetStatusId !== existing.projectStatusId)) {
      return res.status(400).json({ error: 'Status incompatível ou inativo para o Tipo selecionado.' });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Prioridade de projeto inválida.' });
    }

    const invalidTeamMemberId = await getInvalidTeamMemberId(team_user_ids);
    if (invalidTeamMemberId) {
      return res.status(400).json({ error: 'A equipe contém um usuário inválido ou inativo.' });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (client_id) updates.client_id = client_id;
    if (product_id) {
      updates.product_id = targetProductId;
      updates.project_type = legacyTypeForProduct(targetProductId);
    }
    if (manager_id) updates.manager_id = manager_id;
    if (requestedStatusId) updates.product_status_id = targetStatusId;
    if (priority) updates.priority = priority;
    if (start_date !== undefined) updates.start_date = start_date;
    if (due_date !== undefined) updates.due_date = due_date;
    if (typeof progress === 'number') updates.progress = Math.max(0, Math.min(100, progress));
    if (is_recurring !== undefined) updates.is_recurring = Boolean(is_recurring);
    if (briefing !== undefined && briefing && typeof briefing === 'object') updates.briefing = briefing;

    const updated = await projectRepository.update(
      projectId, 
      updates, 
      Array.isArray(team_user_ids) ? team_user_ids : undefined
    );

    return res.json({
      message: 'Projeto atualizado com sucesso.',
      project: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return res.status(500).json({ error: 'Erro ao atualizar projeto.' });
  }
});
