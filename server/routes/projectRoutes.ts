import { Router, Response } from 'express';
import { projectRepository, clientRepository, userRepository, ProjectStatus, ProjectType, Priority } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

export const projectRouter = Router();

// GET /api/projects - Listar projetos respeitando RBAC
projectRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { status, clientId, type, search } = req.query;

    const projects = projectRepository.findAll(req.user, {
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
projectRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const project = projectRepository.findById(req.params.id, req.user);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para acessá-lo.' });
    }
    return res.json({ project });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar projeto.' });
  }
});

// POST /api/projects - Criar novo projeto
projectRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']), (req: AuthRequest, res: Response) => {
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
      team_user_ids
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do projeto é obrigatório.' });
    }

    if (!client_id) {
      return res.status(400).json({ error: 'É obrigatório selecionar um cliente para o projeto.' });
    }

    const client = clientRepository.findById(client_id);
    if (!client) {
      return res.status(404).json({ error: 'O cliente selecionado não foi encontrado.' });
    }

    const chosenManagerId = manager_id || req.user?.id;
    const manager = userRepository.findById(chosenManagerId);
    if (!manager) {
      return res.status(404).json({ error: 'O gestor selecionado não foi encontrado.' });
    }

    const newProject = projectRepository.create({
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
projectRouter.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const existing = projectRepository.findById(projectId, req.user);

    if (!existing) {
      return res.status(404).json({ error: 'Projeto não encontrado ou você não tem permissão para editá-lo.' });
    }

    // Apenas SUPER_ADMIN, ADMIN ou o Gestor do projeto podem editar
    const isSuperOrAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
    const isManagerOfProject = existing.manager_id === req.user?.id;

    if (!isSuperOrAdmin && !isManagerOfProject) {
      return res.status(403).json({ error: 'Apenas os administradores ou o gestor responsável podem editar este projeto.' });
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
      team_user_ids
    } = req.body;

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

    const updated = projectRepository.update(
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
