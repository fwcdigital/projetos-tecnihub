import { randomUUID } from 'node:crypto';
import { Router, Response } from 'express';
import { projectStatusRepository } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { canAdministerProjectStatuses } from '../permissions.js';

export const projectStatusRouter = Router();

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function denyUnlessAdministrator(req: AuthRequest, res: Response): boolean {
  if (canAdministerProjectStatuses(req.user)) return false;
  res.status(403).json({ error: 'Acesso negado para administrar status de projeto.' });
  return true;
}

projectStatusRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && canAdministerProjectStatuses(req.user);
    return res.json({ statuses: await projectStatusRepository.findAll(includeInactive) });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar status de projeto.' });
  }
});

projectStatusRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const name = String(req.body.name || '').trim();
    const color = String(req.body.color || '').trim().toUpperCase();
    if (!name) return res.status(400).json({ error: 'O nome do status é obrigatório.' });
    if (!COLOR_PATTERN.test(color)) return res.status(400).json({ error: 'Informe uma cor hexadecimal válida.' });
    const status = await projectStatusRepository.create({ id: randomUUID(), name, color, active: true });
    return res.status(201).json({ status });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Já existe um status com esse nome.' });
    return res.status(500).json({ error: 'Erro ao criar status de projeto.' });
  }
});

projectStatusRouter.put('/reorder', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const existing = await projectStatusRepository.findAll(true);
    if (ids.length !== existing.length || new Set(ids).size !== ids.length || existing.some(status => !ids.includes(status.id))) {
      return res.status(400).json({ error: 'A ordenação deve conter todos os status exatamente uma vez.' });
    }
    await projectStatusRepository.reorder(ids);
    return res.json({ statuses: await projectStatusRepository.findAll(true) });
  } catch {
    return res.status(500).json({ error: 'Erro ao ordenar status de projeto.' });
  }
});

projectStatusRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await projectStatusRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Status de projeto não encontrado.' });
    const updates: { name?: string; color?: string; active?: boolean } = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'O nome do status é obrigatório.' });
      updates.name = name;
    }
    if (req.body.color !== undefined) {
      const color = String(req.body.color).trim().toUpperCase();
      if (!COLOR_PATTERN.test(color)) return res.status(400).json({ error: 'Informe uma cor hexadecimal válida.' });
      updates.color = color;
    }
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    const status = await projectStatusRepository.update(existing.id, updates);
    return res.json({ status });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Já existe um status com esse nome.' });
    return res.status(500).json({ error: 'Erro ao atualizar status de projeto.' });
  }
});

projectStatusRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await projectStatusRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Status de projeto não encontrado.' });
    if (existing.projectsCount > 0) {
      const status = await projectStatusRepository.update(existing.id, { active: false });
      return res.json({ removed: false, deactivated: true, status });
    }
    await projectStatusRepository.delete(existing.id);
    return res.json({ removed: true, deactivated: false });
  } catch {
    return res.status(500).json({ error: 'Erro ao remover status de projeto.' });
  }
});
