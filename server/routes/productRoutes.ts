import { randomUUID } from 'node:crypto';
import { Router, Response } from 'express';
import { productRepository, productStatusRepository } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { canAdministerProducts } from '../permissions.js';

export const productRouter = Router();

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function denyUnlessAdministrator(req: AuthRequest, res: Response): boolean {
  if (canAdministerProducts(req.user)) return false;
  res.status(403).json({ error: 'Acesso negado para administrar produtos.' });
  return true;
}

function productUpdates(body: any): { name?: string; color?: string; active?: boolean; is_completed?: boolean } | string {
  const updates: { name?: string; color?: string; active?: boolean; is_completed?: boolean } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return 'O nome é obrigatório.';
    if (name.length > 96) return 'O nome deve possuir no máximo 96 caracteres.';
    updates.name = name;
  }
  if (body.color !== undefined) {
    const color = String(body.color).trim().toUpperCase();
    if (!COLOR_PATTERN.test(color)) return 'Informe uma cor hexadecimal válida.';
    updates.color = color;
  }
  if (body.active !== undefined) updates.active = Boolean(body.active);
  if (body.isCompleted !== undefined || body.is_completed !== undefined) {
    updates.is_completed = Boolean(body.isCompleted ?? body.is_completed);
  }
  return updates;
}

function databaseError(res: Response, error: any, fallback: string) {
  if (error?.code === '23505') return res.status(409).json({ error: 'Já existe um registro com esse nome neste contexto.' });
  return res.status(500).json({ error: fallback });
}

productRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && canAdministerProducts(req.user);
    return res.json({ products: await productRepository.findAll(includeInactive) });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
});

productRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const updates = productUpdates(req.body);
    if (typeof updates === 'string') return res.status(400).json({ error: updates });
    if (!updates.name) return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    if (!updates.color) return res.status(400).json({ error: 'Informe uma cor hexadecimal válida.' });
    const product = await productRepository.create({ id: randomUUID(), name: updates.name, color: updates.color, active: true });
    return res.status(201).json({ product });
  } catch (error: any) {
    return databaseError(res, error, 'Erro ao criar produto.');
  }
});

productRouter.put('/reorder', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const existing = await productRepository.findAll(true);
    if (ids.length !== existing.length || new Set(ids).size !== ids.length || existing.some(product => !ids.includes(product.id))) {
      return res.status(400).json({ error: 'A ordenação deve conter todos os produtos exatamente uma vez.' });
    }
    await productRepository.reorder(ids);
    return res.json({ products: await productRepository.findAll(true) });
  } catch {
    return res.status(500).json({ error: 'Erro ao ordenar produtos.' });
  }
});

productRouter.get('/:productId/statuses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const product = await productRepository.findById(req.params.productId);
    if (!product || (!product.active && !canAdministerProducts(req.user))) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    const includeInactive = req.query.includeInactive === 'true' && canAdministerProducts(req.user);
    return res.json({ statuses: await productStatusRepository.findAll(product.id, includeInactive) });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar status do produto.' });
  }
});

productRouter.post('/:productId/statuses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const product = await productRepository.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    const updates = productUpdates(req.body);
    if (typeof updates === 'string') return res.status(400).json({ error: updates });
    if (!updates.name) return res.status(400).json({ error: 'O nome do status é obrigatório.' });
    if (!updates.color) return res.status(400).json({ error: 'Informe uma cor hexadecimal válida.' });
    const status = await productStatusRepository.create({
      id: randomUUID(), product_id: product.id, name: updates.name, color: updates.color, active: true
    });
    return res.status(201).json({ status });
  } catch (error: any) {
    return databaseError(res, error, 'Erro ao criar status do produto.');
  }
});

productRouter.put('/:productId/statuses/reorder', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const product = await productRepository.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const existing = await productStatusRepository.findAll(product.id, true);
    if (ids.length !== existing.length || new Set(ids).size !== ids.length || existing.some(status => !ids.includes(status.id))) {
      return res.status(400).json({ error: 'A ordenação deve conter todos os status do produto exatamente uma vez.' });
    }
    await productStatusRepository.reorder(product.id, ids);
    return res.json({ statuses: await productStatusRepository.findAll(product.id, true) });
  } catch {
    return res.status(500).json({ error: 'Erro ao ordenar status do produto.' });
  }
});

productRouter.put('/:productId/statuses/:statusId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await productStatusRepository.findById(req.params.productId, req.params.statusId);
    if (!existing) return res.status(404).json({ error: 'Status do produto não encontrado.' });
    const updates = productUpdates(req.body);
    if (typeof updates === 'string') return res.status(400).json({ error: updates });
    const status = await productStatusRepository.update(existing.product_id, existing.id, updates);
    return res.json({ status });
  } catch (error: any) {
    return databaseError(res, error, 'Erro ao atualizar status do produto.');
  }
});

productRouter.delete('/:productId/statuses/:statusId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await productStatusRepository.findById(req.params.productId, req.params.statusId);
    if (!existing) return res.status(404).json({ error: 'Status do produto não encontrado.' });
    if (existing.projectsCount > 0 || existing.tasksCount > 0) {
      const status = await productStatusRepository.update(existing.product_id, existing.id, { active: false });
      return res.json({ removed: false, deactivated: true, status });
    }
    await productStatusRepository.delete(existing.product_id, existing.id);
    return res.json({ removed: true, deactivated: false });
  } catch {
    return res.status(500).json({ error: 'Erro ao remover status do produto.' });
  }
});

productRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await productRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado.' });
    const updates = productUpdates(req.body);
    if (typeof updates === 'string') return res.status(400).json({ error: updates });
    const product = await productRepository.update(existing.id, updates);
    return res.json({ product });
  } catch (error: any) {
    return databaseError(res, error, 'Erro ao atualizar produto.');
  }
});

productRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (denyUnlessAdministrator(req, res)) return;
    const existing = await productRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado.' });
    if (existing.projectsCount > 0 || existing.statusesCount > 0) {
      const product = await productRepository.update(existing.id, { active: false });
      return res.json({ removed: false, deactivated: true, product });
    }
    await productRepository.delete(existing.id);
    return res.json({ removed: true, deactivated: false });
  } catch {
    return res.status(500).json({ error: 'Erro ao remover produto.' });
  }
});
