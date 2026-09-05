import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../auth.js';
import { notificationRepository } from '../db.js';

export const notificationRouter = Router();

notificationRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const filter = String(req.query.filter || 'all');
    if (!['all', 'unread', 'mentions'].includes(filter)) return res.status(400).json({ error: 'Filtro de notificações inválido.' });
    const limit = Number(req.query.limit || 100);
    const notifications = await notificationRepository.findForUser(req.user!, filter as 'all' | 'unread' | 'mentions', Number.isFinite(limit) ? limit : 100);
    return res.json({ success: true, notifications });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao buscar notificações.' });
  }
});

notificationRouter.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await notificationRepository.markAllRead(req.user!.id);
    return res.json({ success: true, updated });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar notificações.' });
  }
});

notificationRouter.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await notificationRepository.markRead(req.params.id, req.user!.id);
    if (!notification) return res.status(404).json({ error: 'Notificação não encontrada.' });
    return res.json({ success: true, notification });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar a notificação.' });
  }
});
