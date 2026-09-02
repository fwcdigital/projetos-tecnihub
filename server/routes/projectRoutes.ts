import { Router, Response } from 'express';
import { projectRepository, clientRepository, userRepository, ProjectStatus, ProjectType, Priority } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';

export const projectRouter = Router();

const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'WAITING_TO_START', 'IN_PROGRESS', 'WAITING_CLIENT', 'IN_REVIEW', 'PAUSED', 'COMPLETED', 'CANCELLED'];
const PROJECT_TYPES: ProjectType[] = ['WEBSITE', 'LANDING_PAGE', 'ECOMMERCE', 'GOOGLE_ADS', 'META_ADS', 'SEO', 'SOCIAL_MEDIA', 'MAINTENANCE', 'INTERNAL', 'OTHER'];
const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];

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
    const { status, clientId, type, search } = req.query;

    const projects = await projectRepository.findAll(req.user, {
      status: status as ProjectStatus,
      clientId: clientId as string,
      type: type as ProjectType,
      search: search as string
    });

    return res.json({ projects });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar projetos.' });
  }
});

// GET /api/projects/:id - Detalhes do projeto
projectRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para acessá-lo.' });
    }
    const project = await projectRepository.findById(req.params.id, req.user);
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
      project_type,
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

    if (project_type && !PROJECT_TYPES.includes(project_type)) {
      return res.status(400).json({ error: 'Tipo de projeto inválido.' });
    }
    if (status && !PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status de projeto inválido.' });
    }
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
      project_type: (project_type as ProjectType) || 'WEBSITE',
      manager_id: chosenManagerId,
      status: (status as ProjectStatus) || 'PLANNING',
      priority: (priority as Priority) || 'NORMAL',
      start_date: start_date || new Date().toISOString().split('T')[0],
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
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const isProjectManager = req.user?.role === 'PROJECT_MANAGER';
    if (!isSuperOrAdmin && !isProjectManager) {
      return res.status(403).json({ error: 'Você não possui controles administrativos deste projeto.' });
    }

    const {
      name,
      description,
      client_id,
      project_type,
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

    if (!isSuperOrAdmin && (client_id !== undefined || manager_id !== undefined || team_user_ids !== undefined)) {
      return res.status(403).json({ error: 'Somente administradores podem trocar cliente, gestor ou colaboradores.' });
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

    if (project_type && !PROJECT_TYPES.includes(project_type)) {
      return res.status(400).json({ error: 'Tipo de projeto inválido.' });
    }
    if (status && !PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status de projeto inválido.' });
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
    if (project_type) updates.project_type = project_type;
    if (manager_id) updates.manager_id = manager_id;
    if (status) updates.status = status;
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
    return res.status(500).json({ error: 'Erro ao atualizar projeto.' });
  }
});
