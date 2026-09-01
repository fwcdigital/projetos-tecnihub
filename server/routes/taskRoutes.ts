import { Router, Response } from 'express';
import { taskRepository, UserRole } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';

export const taskRouter = Router();

// Listar todas as tarefas com filtros e controle de acesso
taskRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { projectId, clientId, status, assigneeId, search } = req.query;
    const user = req.user ? { id: req.user.id, role: req.user.role as UserRole } : undefined;

    const tasks = taskRepository.findAll(
      {
        projectId: projectId as string,
        clientId: clientId as string,
        status: status as any,
        assigneeId: assigneeId as string,
        search: search as string
      },
      user
    );

    res.json({
      success: true,
      total: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar tarefas' });
  }
});

// Obter tarefa por ID
taskRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const task = taskRepository.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao buscar detalhes da tarefa' });
  }
});

// Criar nova tarefa
taskRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { title, clientId, projectId, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'O nome da tarefa é obrigatório' });
    }
    if (!clientId) {
      return res.status(400).json({ error: 'O cliente é obrigatório' });
    }
    if (!projectId) {
      return res.status(400).json({ error: 'O projeto é obrigatório' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'O prazo final da tarefa é obrigatório' });
    }

    const user = req.user ? { id: req.user.id, name: req.user.name, role: req.user.role as UserRole } : undefined;
    const newTask = taskRepository.create(req.body, user);

    res.status(201).json({
      success: true,
      message: 'Tarefa criada com sucesso',
      task: newTask
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Atualizar tarefa completa (incluindo subtasks, checklist, status, responsável)
taskRouter.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user ? { id: req.user.id, name: req.user.name, role: req.user.role as UserRole } : undefined;
    const updated = taskRepository.update(req.params.id, req.body, user);

    if (!updated) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json({
      success: true,
      message: 'Tarefa atualizada com sucesso',
      task: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// Excluir tarefa
taskRouter.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const deleted = taskRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Tarefa não encontrada ou sem permissão para exclusão' });
    }

    res.json({
      success: true,
      message: 'Tarefa excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});
