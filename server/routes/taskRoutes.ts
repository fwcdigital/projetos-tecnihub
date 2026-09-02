import { Router, Response } from 'express';
import { projectRepository, taskRepository, userRepository, TaskPriority, TaskStatus } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';

export const taskRouter = Router();

const TASK_STATUSES: TaskStatus[] = ['BACKLOG', 'A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'EM_REVISAO', 'CONCLUIDO', 'BLOQUEADO'];
const TASK_PRIORITIES: TaskPriority[] = ['URGENTE', 'ALTA', 'NORMAL', 'BAIXA'];

async function accessibleProject(projectId: string, req: AuthRequest) {
  if (!isUuid(projectId)) return null;
  return projectRepository.findById(projectId, req.user);
}

async function validateResponsible(project: any, userId: string, req: AuthRequest): Promise<string | null> {
  if (!isUuid(userId)) return 'O responsável selecionado é inválido.';
  const responsible = await userRepository.findById(userId);
  if (!responsible || responsible.status !== 'ACTIVE') return 'O responsável selecionado está inativo ou não existe.';
  const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN';
  const belongsToProject = Array.isArray(project.teamMembers) && project.teamMembers.some((member: any) => member.id === userId);
  if (!isAdmin && !belongsToProject) return 'O responsável precisa fazer parte da equipe deste projeto.';
  return null;
}

taskRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, clientId, status, assigneeId, search } = req.query;
    if (projectId && !isUuid(String(projectId))) return res.status(400).json({ error: 'Projeto inválido.' });
    if (clientId && !isUuid(String(clientId))) return res.status(400).json({ error: 'Cliente inválido.' });
    if (assigneeId && !isUuid(String(assigneeId))) return res.status(400).json({ error: 'Responsável inválido.' });
    if (status && !TASK_STATUSES.includes(status as TaskStatus)) return res.status(400).json({ error: 'Status de tarefa inválido.' });
    const tasks = await taskRepository.findAll({
      projectId: projectId as string, clientId: clientId as string, status: status as TaskStatus,
      assigneeId: assigneeId as string, search: search as string
    }, req.user);
    return res.json({ success: true, total: tasks.length, tasks });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar tarefas.' });
  }
});

taskRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const existing = await taskRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const task = await taskRepository.findById(req.params.id, req.user);
    if (!task) return res.status(403).json({ error: 'Acesso negado a esta tarefa.' });
    return res.json({ success: true, task });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao buscar detalhes da tarefa.' });
  }
});

taskRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.body.projectId || req.body.project_id;
    const responsibleUserId = req.body.assigneeId || req.body.responsible_user_id || req.user?.id;
    const { title, description, status = 'A_FAZER', priority = 'NORMAL' } = req.body;
    const startDate = req.body.startDate ?? req.body.start_date ?? null;
    const dueDate = req.body.dueDate ?? req.body.due_date;
    const dueTime = req.body.dueTime ?? req.body.due_time ?? null;
    if (!title?.trim()) return res.status(400).json({ error: 'O nome da tarefa é obrigatório.' });
    if (!projectId || !isUuid(projectId)) return res.status(400).json({ error: 'O projeto é obrigatório.' });
    if (!dueDate) return res.status(400).json({ error: 'O prazo final da tarefa é obrigatório.' });
    if (!TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'Status de tarefa inválido.' });
    if (!TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioridade de tarefa inválida.' });
    const project = await accessibleProject(projectId, req);
    if (!project) return res.status(403).json({ error: 'Acesso negado ao projeto informado.' });
    const responsibleError = await validateResponsible(project, responsibleUserId, req);
    if (responsibleError) return res.status(400).json({ error: responsibleError });
    const task = await taskRepository.create({
      project_id: projectId, title: title.trim(), description: description?.trim() || '',
      responsible_user_id: responsibleUserId, status, priority, start_date: startDate || null,
      due_date: dueDate, due_time: dueTime || null,
      completed_at: status === 'CONCLUIDO' ? new Date().toISOString() : null,
      created_by: req.user!.id
    });
    return res.status(201).json({ success: true, message: 'Tarefa criada com sucesso.', task });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno ao criar tarefa.' });
  }
});

taskRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const existing = await taskRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    if (!(await taskRepository.findById(req.params.id, req.user))) return res.status(403).json({ error: 'Acesso negado a esta tarefa.' });
    const targetProjectId = req.body.projectId || req.body.project_id || existing.projectId;
    const targetResponsibleId = req.body.assigneeId || req.body.responsible_user_id || existing.assigneeId;
    const project = await accessibleProject(targetProjectId, req);
    if (!project) return res.status(403).json({ error: 'Acesso negado ao projeto informado.' });
    const responsibleError = await validateResponsible(project, targetResponsibleId, req);
    if (responsibleError) return res.status(400).json({ error: responsibleError });
    const status = req.body.status as TaskStatus | undefined;
    const priority = req.body.priority as TaskPriority | undefined;
    if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'Status de tarefa inválido.' });
    if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioridade de tarefa inválida.' });
    const updates: any = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (targetProjectId !== existing.projectId) updates.project_id = targetProjectId;
    if (targetResponsibleId !== existing.assigneeId) updates.responsible_user_id = targetResponsibleId;
    if (status) { updates.status = status; updates.completed_at = status === 'CONCLUIDO' ? (existing.completedAt || new Date().toISOString()) : null; }
    if (priority) updates.priority = priority;
    if (req.body.startDate !== undefined || req.body.start_date !== undefined) updates.start_date = req.body.startDate ?? req.body.start_date ?? null;
    if (req.body.dueDate !== undefined || req.body.due_date !== undefined) updates.due_date = req.body.dueDate ?? req.body.due_date;
    if (req.body.dueTime !== undefined || req.body.due_time !== undefined) updates.due_time = req.body.dueTime ?? req.body.due_time ?? null;
    const task = await taskRepository.update(req.params.id, updates);
    return res.json({ success: true, message: 'Tarefa atualizada com sucesso.', task });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar tarefa.' });
  }
});

taskRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const existing = await taskRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    if (!(await taskRepository.findById(req.params.id, req.user))) return res.status(403).json({ error: 'Acesso negado a esta tarefa.' });
    await taskRepository.delete(req.params.id);
    return res.json({ success: true, message: 'Tarefa excluída com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao excluir tarefa.' });
  }
});
