import { Router, Response } from 'express';
import { checklistRepository, productStatusRepository, projectRepository, routineRepository, taskCommentRepository, taskRepository, userRepository, TaskPriority, TaskStatus } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';
import { canManageTaskAssignments, isAdministrator } from '../permissions.js';

export const taskRouter = Router();

const TASK_PRIORITIES: TaskPriority[] = ['URGENTE', 'ALTA', 'NORMAL', 'BAIXA'];

function sameIds(left: string[], right: string[]): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every(id => rightSet.has(id));
}

async function accessibleProject(projectId: string, req: AuthRequest) {
  if (!isUuid(projectId)) return null;
  return projectRepository.findById(projectId, req.user);
}

async function validateResponsible(project: any, userId: string, req: AuthRequest): Promise<string | null> {
  if (!isUuid(userId)) return 'O responsável selecionado é inválido.';
  const responsible = await userRepository.findById(userId);
  if (!responsible || responsible.status !== 'ACTIVE') return 'O responsável selecionado está inativo ou não existe.';
  const belongsToProject = Array.isArray(project.teamMembers) && project.teamMembers.some((member: any) => member.id === userId);
  if (!belongsToProject) return 'O responsável precisa fazer parte da equipe deste projeto.';
  return null;
}

async function validateAssignees(project: any, userIds: unknown, req: AuthRequest): Promise<string | null> {
  if (!Array.isArray(userIds) || userIds.length === 0) return 'Selecione pelo menos um responsável.';
  for (const userId of Array.from(new Set(userIds.map(String)))) {
    const error = await validateResponsible(project, userId, req);
    if (error) return error;
  }
  return null;
}

taskRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await routineRepository.materializeDueOccurrences(req.user);
    const { projectId, clientId, status, assigneeId, search, includeCompleted, completedOnly, operationalView } = req.query;
    if (projectId && !isUuid(String(projectId))) return res.status(400).json({ error: 'Projeto inválido.' });
    if (clientId && !isUuid(String(clientId))) return res.status(400).json({ error: 'Cliente inválido.' });
    if (assigneeId && !isUuid(String(assigneeId))) return res.status(400).json({ error: 'Responsável inválido.' });
    if (status && !(await productStatusRepository.findByStatusId(String(status)))) return res.status(400).json({ error: 'Status de tarefa inválido.' });
    if (includeCompleted && !['true', 'false'].includes(String(includeCompleted))) {
      return res.status(400).json({ error: 'O filtro includeCompleted deve ser true ou false.' });
    }
    if (completedOnly && !['true', 'false'].includes(String(completedOnly))) {
      return res.status(400).json({ error: 'O filtro completedOnly deve ser true ou false.' });
    }
    if (operationalView && !['admin', 'operator'].includes(String(operationalView))) {
      return res.status(400).json({ error: 'Contexto operacional inválido.' });
    }
    if (operationalView && !isAdministrator(req.user)) {
      return res.status(403).json({ error: 'O contexto operacional é exclusivo para administradores.' });
    }
    const operationalAssigneeId = operationalView === 'operator' ? req.user!.id : undefined;
    const tasks = await taskRepository.findAll({
      projectId: projectId as string, clientId: clientId as string, status: status as TaskStatus,
      assigneeId: operationalAssigneeId || assigneeId as string, search: search as string,
      includeCompleted: String(includeCompleted) === 'true', completedOnly: String(completedOnly) === 'true'
    }, req.user);
    return res.json({ success: true, total: tasks.length, tasks });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar tarefas.' });
  }
});

taskRouter.put('/:id/recurrence', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const task = isUuid(req.params.id) ? await taskRepository.findById(req.params.id, req.user) : null;
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const frequency = String(req.body.frequency || '');
    if (!['DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADO'].includes(frequency)) {
      return res.status(400).json({ error: 'Frequência inválida.' });
    }
    const customIntervalDays = req.body.customIntervalDays ? Number(req.body.customIntervalDays) : undefined;
    if (frequency === 'PERSONALIZADO' && (!Number.isInteger(customIntervalDays) || customIntervalDays! < 1)) {
      return res.status(400).json({ error: 'Informe um intervalo válido para a recorrência personalizada.' });
    }
    const nextOccurrenceDate = req.body.nextOccurrenceDate || routineRepository.nextDate(task.dueDate, frequency, customIntervalDays);
    const routine = await routineRepository.upsert({
      source_task_id: task.id,
      frequency,
      rule_text: String(req.body.ruleText || frequency).trim(),
      custom_interval_days: customIntervalDays,
      next_occurrence_date: nextOccurrenceDate,
      occurrence_time: req.body.occurrenceTime !== undefined ? (req.body.occurrenceTime || null) : (task.dueTime ?? null),
      created_by: req.user!.id
    });
    return res.json({ success: true, routine, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    console.error('Erro ao configurar recorrência:', error);
    return res.status(500).json({ error: 'Erro interno ao configurar recorrência.' });
  }
});

taskRouter.delete('/:id/recurrence', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const task = isUuid(req.params.id) ? await taskRepository.findById(req.params.id, req.user) : null;
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    await routineRepository.deleteBySourceTask(task.id);
    return res.json({ success: true, task: await taskRepository.findById(task.id, req.user) });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao remover recorrência.' });
  }
});

taskRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const operationalView = req.query.operationalView;
    if (operationalView && !['admin', 'operator'].includes(String(operationalView))) return res.status(400).json({ error: 'Contexto operacional inválido.' });
    if (operationalView && !isAdministrator(req.user)) return res.status(403).json({ error: 'O contexto operacional é exclusivo para administradores.' });
    const existing = await taskRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const task = await taskRepository.findById(req.params.id, req.user, operationalView === 'operator' ? req.user!.id : undefined);
    if (!task) return res.status(403).json({ error: 'Acesso negado a esta tarefa.' });
    return res.json({ success: true, task });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao buscar detalhes da tarefa.' });
  }
});

taskRouter.get('/:id/mentionable-users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const task = isUuid(req.params.id) ? await taskRepository.findById(req.params.id, req.user) : null;
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const users = await taskCommentRepository.findMentionableUsers(task.id);
    return res.json({ success: true, users });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao buscar usuários disponíveis para menção.' });
  }
});

taskRouter.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const task = isUuid(req.params.id) ? await taskRepository.findById(req.params.id, req.user) : null;
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const content = String(req.body.content || '').trim();
    const mentionUserIds: string[] = Array.isArray(req.body.mentionUserIds) ? Array.from(new Set<string>(req.body.mentionUserIds.map(String))) : [];
    const parentCommentId = req.body.parentCommentId ? String(req.body.parentCommentId) : null;
    if (!content) return res.status(400).json({ error: 'O comentário não pode ficar vazio.' });
    if (content.length > 5000) return res.status(400).json({ error: 'O comentário excede o limite de 5.000 caracteres.' });
    if (mentionUserIds.some(id => !isUuid(id))) return res.status(400).json({ error: 'Menção inválida.' });
    if (parentCommentId && !isUuid(parentCommentId)) return res.status(400).json({ error: 'Comentário de origem inválido.' });
    await taskCommentRepository.createWithNotifications(task.id, req.user!.id, content, mentionUserIds, parentCommentId);
    return res.status(201).json({ success: true, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_MENTION') return res.status(400).json({ error: 'Uma ou mais menções não são válidas para esta tarefa.' });
    if (error instanceof Error && error.message === 'INVALID_PARENT_COMMENT') return res.status(400).json({ error: 'Não é possível responder a este comentário.' });
    return res.status(500).json({ error: 'Erro interno ao adicionar comentário.' });
  }
});

taskRouter.put('/:id/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.commentId)) return res.status(404).json({ error: 'Comentário não encontrado.' });
    const task = await taskRepository.findById(req.params.id, req.user);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const content = String(req.body.content || '').trim();
    const mentionUserIds: string[] = Array.isArray(req.body.mentionUserIds) ? Array.from(new Set<string>(req.body.mentionUserIds.map(String))) : [];
    if (!content) return res.status(400).json({ error: 'O comentário não pode ficar vazio.' });
    if (content.length > 5000) return res.status(400).json({ error: 'O comentário excede o limite de 5.000 caracteres.' });
    if (mentionUserIds.some(id => !isUuid(id))) return res.status(400).json({ error: 'Menção inválida.' });
    await taskCommentRepository.updateWithMentions(task.id, req.params.commentId, req.user!, content, mentionUserIds);
    return res.json({ success: true, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    if (error instanceof Error && error.message === 'COMMENT_NOT_FOUND') return res.status(404).json({ error: 'Comentário não encontrado.' });
    if (error instanceof Error && error.message === 'INVALID_MENTION') return res.status(400).json({ error: 'Uma ou mais menções não são válidas para esta tarefa.' });
    if (error instanceof Error && error.message === 'COMMENT_EDIT_FORBIDDEN') return res.status(403).json({ error: 'Você só pode editar seus próprios comentários.' });
    if (error instanceof Error && ['COMMENT_DELETED', 'COMMENT_EDIT_WINDOW_EXPIRED'].includes(error.message)) return res.status(403).json({ error: 'Este comentário não pode mais ser editado.' });
    return res.status(500).json({ error: 'Erro interno ao editar comentário.' });
  }
});

taskRouter.delete('/:id/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.commentId)) return res.status(404).json({ error: 'Comentário não encontrado.' });
    const task = await taskRepository.findById(req.params.id, req.user);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    await taskCommentRepository.softDelete(task.id, req.params.commentId, req.user!);
    return res.json({ success: true, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    if (error instanceof Error && error.message === 'COMMENT_NOT_FOUND') return res.status(404).json({ error: 'Comentário não encontrado.' });
    if (error instanceof Error && error.message === 'COMMENT_DELETE_FORBIDDEN') return res.status(403).json({ error: 'Você só pode excluir seus próprios comentários.' });
    if (error instanceof Error && error.message === 'COMMENT_DELETE_WINDOW_EXPIRED') return res.status(403).json({ error: 'Este comentário não pode mais ser excluído.' });
    return res.status(500).json({ error: 'Erro interno ao excluir comentário.' });
  }
});

taskRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const parentTaskId = req.body.parentTaskId || req.body.parent_task_id || null;
    let projectId = req.body.projectId || req.body.project_id;
    let parentTask: any = null;
    if (parentTaskId) {
      if (!isUuid(parentTaskId)) return res.status(400).json({ error: 'Tarefa pai inválida.' });
      parentTask = await taskRepository.findById(parentTaskId, req.user);
      if (!parentTask) return res.status(403).json({ error: 'Acesso negado à tarefa pai.' });
      if (parentTask.parentTaskId) return res.status(400).json({ error: 'Subtarefas não podem possuir outras subtarefas.' });
      projectId = parentTask.projectId;
    }
    const requestedAssignees = req.body.assigneeIds || req.body.participantIds;
    const assigneeIds = Array.isArray(requestedAssignees) && requestedAssignees.length
      ? Array.from(new Set(requestedAssignees.map(String)))
      : [req.body.assigneeId || req.body.responsible_user_id || req.user?.id];
    const responsibleUserId = assigneeIds[0];
    const { title, description, status, priority = 'NORMAL' } = req.body;
    const startDate = req.body.startDate ?? req.body.start_date ?? null;
    const startTime = req.body.startTime ?? req.body.start_time ?? null;
    const dueDate = req.body.dueDate ?? req.body.due_date ?? parentTask?.dueDate;
    const dueTime = req.body.dueTime ?? req.body.due_time ?? null;
    if (!title?.trim()) return res.status(400).json({ error: 'O nome da tarefa é obrigatório.' });
    if (!projectId || !isUuid(projectId)) return res.status(400).json({ error: 'O projeto é obrigatório.' });
    if (!dueDate) return res.status(400).json({ error: 'O prazo final da tarefa é obrigatório.' });
    if (startDate && dueDate < startDate) return res.status(400).json({ error: 'O prazo final não pode ser anterior à data inicial.' });
    if (!TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioridade de tarefa inválida.' });
    const project = await accessibleProject(projectId, req);
    if (!project) return res.status(403).json({ error: 'Acesso negado ao projeto informado.' });
    const selectedStatus = status
      ? await productStatusRepository.findById(project.productId, String(status))
      : await productStatusRepository.findFirstActive(project.productId);
    if (!selectedStatus || !selectedStatus.active) {
      return res.status(400).json({ error: 'Status incompatível ou inativo para o Tipo do projeto.' });
    }
    if (!canManageTaskAssignments(req.user) && !sameIds(assigneeIds, [req.user!.id])) {
      return res.status(403).json({ error: 'Sem permissão para atribuir outras pessoas à tarefa.' });
    }
    const responsibleError = await validateAssignees(project, assigneeIds, req);
    if (responsibleError) return res.status(400).json({ error: responsibleError });
    const recurrence = req.body.recurrence;
    let recurrenceData: { frequency: string; ruleText: string; customIntervalDays?: number } | null = null;
    if (recurrence && recurrence.frequency && recurrence.frequency !== 'NAO_REPETIR') {
      const frequency = String(recurrence.frequency);
      if (!['DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADO'].includes(frequency)) {
        return res.status(400).json({ error: 'Frequência inválida.' });
      }
      const customIntervalDays = recurrence.customIntervalDays ? Number(recurrence.customIntervalDays) : undefined;
      if (frequency === 'PERSONALIZADO' && (!Number.isInteger(customIntervalDays) || customIntervalDays! < 1)) {
        return res.status(400).json({ error: 'Informe um intervalo válido para a recorrência personalizada.' });
      }
      recurrenceData = {
        frequency,
        ruleText: String(recurrence.ruleText || frequency).trim(),
        customIntervalDays
      };
    }
    let task = await taskRepository.create({
      project_id: projectId, parent_task_id: parentTaskId, title: title.trim(), description: description?.trim() || '',
      responsible_user_id: responsibleUserId, status: selectedStatus.id, priority, start_date: startDate || null, start_time: startTime || null,
      due_date: dueDate, due_time: dueTime || null,
      completed_at: selectedStatus.is_completed ? new Date().toISOString() : null,
      created_by: req.user!.id, assignee_ids: assigneeIds
    });
    if (recurrenceData) {
      await routineRepository.upsert({
        source_task_id: task.id, frequency: recurrenceData.frequency, rule_text: recurrenceData.ruleText,
        custom_interval_days: recurrenceData.customIntervalDays,
        next_occurrence_date: routineRepository.nextDate(task.dueDate, recurrenceData.frequency, recurrenceData.customIntervalDays),
        occurrence_time: task.dueTime || null, created_by: req.user!.id
      });
      task = await taskRepository.findById(task.id, req.user);
    }
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
    if (targetProjectId !== existing.projectId && (existing.parentTaskId || existing.subtasks.length > 0)) {
      return res.status(400).json({ error: 'Tarefas com vínculo de subtarefa não podem ser movidas isoladamente entre projetos.' });
    }
    const requestedAssignees = req.body.assigneeIds || req.body.participantIds;
    const legacyAssigneeId = req.body.assigneeId || req.body.responsible_user_id;
    const targetAssigneeIds = Array.isArray(requestedAssignees) && requestedAssignees.length
      ? Array.from(new Set(requestedAssignees.map(String)))
      : legacyAssigneeId ? [String(legacyAssigneeId)] : existing.participantIds;
    const targetResponsibleId = targetAssigneeIds[0] || existing.assigneeId;
    if (targetProjectId !== existing.projectId && !canManageTaskAssignments(req.user)) {
      return res.status(403).json({ error: 'Sem permissão para mover a tarefa entre projetos.' });
    }
    if (!sameIds(targetAssigneeIds, existing.participantIds) && !canManageTaskAssignments(req.user)) {
      return res.status(403).json({ error: 'Sem permissão para alterar responsáveis da tarefa.' });
    }
    const project = await accessibleProject(targetProjectId, req);
    if (!project) return res.status(403).json({ error: 'Acesso negado ao projeto informado.' });
    const responsibleError = await validateAssignees(project, targetAssigneeIds, req);
    if (responsibleError) return res.status(400).json({ error: responsibleError });
    const status = req.body.status as TaskStatus | undefined;
    const priority = req.body.priority as TaskPriority | undefined;
    const selectedStatus = status ? await productStatusRepository.findById(project.productId, status) : null;
    if (status && (!selectedStatus || (!selectedStatus.active && status !== existing.status))) {
      return res.status(400).json({ error: 'Status incompatível ou inativo para o Tipo do projeto.' });
    }
    if (targetProjectId !== existing.projectId && !status) {
      const existingStatusInTarget = await productStatusRepository.findById(project.productId, existing.status);
      if (!existingStatusInTarget) return res.status(400).json({ error: 'Mover a tarefa exige um Status compatível com o novo Tipo.' });
    }
    if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Prioridade de tarefa inválida.' });
    const updates: any = {};
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ error: 'O nome da tarefa é obrigatório.' });
      updates.title = title;
    }
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (targetProjectId !== existing.projectId) updates.project_id = targetProjectId;
    if (targetResponsibleId !== existing.assigneeId) updates.responsible_user_id = targetResponsibleId;
    if (Array.isArray(requestedAssignees) || legacyAssigneeId) updates.assignee_ids = targetAssigneeIds;
    if (status && selectedStatus) {
      updates.status = status;
      updates.completed_at = selectedStatus.is_completed ? (existing.completedAt || new Date().toISOString()) : null;
    }
    if (priority) updates.priority = priority;
    if (req.body.startDate !== undefined || req.body.start_date !== undefined) updates.start_date = req.body.startDate ?? req.body.start_date ?? null;
    if (req.body.startTime !== undefined || req.body.start_time !== undefined) updates.start_time = req.body.startTime ?? req.body.start_time ?? null;
    if (req.body.dueDate !== undefined || req.body.due_date !== undefined) updates.due_date = req.body.dueDate ?? req.body.due_date;
    if (req.body.dueTime !== undefined || req.body.due_time !== undefined) updates.due_time = req.body.dueTime ?? req.body.due_time ?? null;
    const nextStartDate = updates.start_date !== undefined ? updates.start_date : existing.startDate;
    const nextDueDate = updates.due_date !== undefined ? updates.due_date : existing.dueDate;
    if (!nextDueDate) return res.status(400).json({ error: 'O prazo final da tarefa é obrigatório.' });
    if (nextStartDate && nextDueDate < nextStartDate) return res.status(400).json({ error: 'O prazo final não pode ser anterior à data inicial.' });
    const task = await taskRepository.update(req.params.id, updates);
    return res.json({ success: true, message: 'Tarefa atualizada com sucesso.', task });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar tarefa.' });
  }
});

taskRouter.post('/:id/checklist', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const task = isUuid(req.params.id) ? await taskRepository.findById(req.params.id, req.user) : null;
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'O título do item é obrigatório.' });
    const assigneeId = req.body.assigneeId || req.body.responsible_user_id || null;
    if (assigneeId && !canManageTaskAssignments(req.user)) {
      return res.status(403).json({ error: 'Sem permissão para atribuir responsáveis ao checklist.' });
    }
    if (assigneeId) {
      const project = await accessibleProject(task.projectId, req);
      const responsibleError = project ? await validateResponsible(project, assigneeId, req) : 'Projeto não encontrado.';
      if (responsibleError) return res.status(400).json({ error: responsibleError });
    }
    const item = await checklistRepository.create(task.id, {
      title,
      due_date: req.body.dueDate ?? req.body.due_date ?? null,
      due_time: req.body.dueTime ?? req.body.due_time ?? null,
      responsible_user_id: assigneeId
    });
    return res.status(201).json({ success: true, item, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    console.error('Erro ao criar item de checklist:', error);
    return res.status(500).json({ error: 'Erro interno ao criar item de checklist.' });
  }
});

taskRouter.put('/:taskId/checklist/:itemId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.taskId) || !isUuid(req.params.itemId)) return res.status(404).json({ error: 'Item não encontrado.' });
    const task = await taskRepository.findById(req.params.taskId, req.user);
    const ownerTaskId = await checklistRepository.findTaskId(req.params.itemId);
    if (!task || ownerTaskId !== task.id) return res.status(404).json({ error: 'Item não encontrado.' });
    const updates: any = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.completed !== undefined || req.body.is_completed !== undefined) updates.is_completed = Boolean(req.body.completed ?? req.body.is_completed);
    if (req.body.position !== undefined) updates.position = Number(req.body.position);
    if (req.body.dueDate !== undefined || req.body.due_date !== undefined) updates.due_date = req.body.dueDate ?? req.body.due_date ?? null;
    if (req.body.dueTime !== undefined || req.body.due_time !== undefined) updates.due_time = req.body.dueTime ?? req.body.due_time ?? null;
    if (req.body.assigneeId !== undefined || req.body.responsible_user_id !== undefined) {
      if (!canManageTaskAssignments(req.user)) {
        return res.status(403).json({ error: 'Sem permissão para alterar responsáveis do checklist.' });
      }
      const assigneeId = req.body.assigneeId ?? req.body.responsible_user_id ?? null;
      if (assigneeId) {
        const project = await accessibleProject(task.projectId, req);
        const responsibleError = project ? await validateResponsible(project, assigneeId, req) : 'Projeto não encontrado.';
        if (responsibleError) return res.status(400).json({ error: responsibleError });
      }
      updates.responsible_user_id = assigneeId;
    }
    const item = await checklistRepository.update(req.params.itemId, updates);
    return res.json({ success: true, item, task: await taskRepository.findById(task.id, req.user) });
  } catch (error) {
    console.error('Erro ao atualizar item de checklist:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar item de checklist.' });
  }
});

taskRouter.delete('/:taskId/checklist/:itemId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.taskId) || !isUuid(req.params.itemId)) return res.status(404).json({ error: 'Item não encontrado.' });
    const task = await taskRepository.findById(req.params.taskId, req.user);
    const ownerTaskId = await checklistRepository.findTaskId(req.params.itemId);
    if (!task || ownerTaskId !== task.id) return res.status(404).json({ error: 'Item não encontrado.' });
    await checklistRepository.delete(req.params.itemId);
    return res.json({ success: true, task: await taskRepository.findById(task.id, req.user) });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao excluir item de checklist.' });
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
