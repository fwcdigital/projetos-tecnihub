import { Router, Response } from 'express';
import { clientRepository, productRepository, projectRepository, userRepository, ClientStatus } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';

export const clientRouter = Router();

function parseProductIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id.trim())) return null;
  const ids = value.map(id => (id as string).trim());
  return new Set(ids).size === ids.length ? ids : null;
}

function encodedStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function removeStoredClientFiles(storagePaths: string[]): Promise<string[]> {
  if (storagePaths.length === 0) return [];
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'project-resources';
  if (!url || !key) return storagePaths;

  const pending: string[] = [];
  for (const storagePath of storagePaths) {
    try {
      const removal = await fetch(`${url}/storage/v1/object/${bucket}/${encodedStoragePath(storagePath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}`, apikey: key }
      });
      if (!removal.ok && removal.status !== 404) pending.push(storagePath);
    } catch {
      pending.push(storagePath);
    }
  }
  return pending;
}

// GET /api/clients - Listar todos os clientes
clientRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    const requestedStatus = typeof status === 'string' ? status.toUpperCase() : undefined;
    if (requestedStatus && requestedStatus !== 'ALL' && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'Filtro de status de cliente inválido.' });
    }
    const clients = await clientRepository.findAll(req.user, {
      status: requestedStatus && requestedStatus !== 'ALL' ? requestedStatus as ClientStatus : undefined,
      search: search as string
    });

    // Calcular contagens reais de projetos para cada cliente
    const allProjects = await projectRepository.findAll(req.user);
    const enrichedClients = clients.map(client => {
      const clientProjects = allProjects.filter(p => p.client_id === client.id);
      const activeProjectsCount = clientProjects.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length;
      const completedProjectsCount = clientProjects.filter(p => p.status === 'COMPLETED').length;

      return {
        ...client,
        activeProjectsCount,
        completedProjectsCount,
        totalProjectsCount: clientProjects.length
      };
    });

    return res.json({ clients: enrichedClients });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// GET /api/clients/:id - Detalhes do cliente e projetos vinculados
clientRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const client = await clientRepository.findById(req.params.id, req.user);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const projects = await projectRepository.findAll(req.user, { clientId: client.id });
    const activeProjectsCount = projects.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length;
    const completedProjectsCount = projects.filter(p => p.status === 'COMPLETED').length;

    return res.json({
      client: {
        ...client,
        activeProjectsCount,
        completedProjectsCount,
        projects
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados do cliente.' });
  }
});

// POST /api/clients - Cadastrar novo cliente
clientRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, company_name, contact_name, email, phone, status, lead_manager_id, notes, product_ids, logo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }
    const productIds = parseProductIds(product_ids ?? []);
    if (!productIds) {
      return res.status(400).json({ error: 'Os serviços contratados contêm Produtos inválidos ou repetidos.' });
    }
    const products = await productRepository.findAll(true);
    if (productIds.some(id => !products.some(product => product.id === id && product.active))) {
      return res.status(400).json({ error: 'Selecione somente Produtos ativos e existentes.' });
    }

    const chosenLeadManagerId = lead_manager_id || req.user?.id;
    if (!isUuid(chosenLeadManagerId)) {
      return res.status(400).json({ error: 'O gestor da conta é inválido.' });
    }
    const leadManager = chosenLeadManagerId ? await userRepository.findById(chosenLeadManagerId) : null;
    if (!leadManager || leadManager.status !== 'ACTIVE' || leadManager.role === 'COLLABORATOR') {
      return res.status(400).json({ error: 'O gestor da conta é inválido ou está inativo.' });
    }

    const initials = name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() || 'CL';

    const newClient = await clientRepository.create({
      name: name.trim(),
      company_name: company_name ? company_name.trim() : name.trim(),
      logo: logo || initials,
      contact_name: contact_name ? contact_name.trim() : '',
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      status: (status as ClientStatus) || 'ACTIVE',
      lead_manager_id: chosenLeadManagerId,
      notes: notes || '',
      monthly_services: []
    }, productIds);

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso.',
      client: newClient
    });
  } catch (error) {
    console.error('Erro ao cadastrar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar cliente.' });
  }
});

// PUT /api/clients/:id - Editar cliente
clientRouter.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, company_name, contact_name, email, phone, lead_manager_id, notes, product_ids, logo } = req.body;
    const clientId = req.params.id;

    if (!isUuid(clientId)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const existing = await clientRepository.findById(clientId, req.user);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const productIds = product_ids === undefined ? undefined : parseProductIds(product_ids);
    if (product_ids !== undefined && !productIds) {
      return res.status(400).json({ error: 'Os serviços contratados contêm Produtos inválidos ou repetidos.' });
    }
    if (productIds) {
      const products = await productRepository.findAll(true);
      const previouslyLinked = new Set(existing.products.map(product => product.id));
      if (productIds.some(id => !products.some(product => product.id === id && (product.active || previouslyLinked.has(id))))) {
        return res.status(400).json({ error: 'Um dos Produtos selecionados não existe ou está inativo.' });
      }
    }

    if (lead_manager_id) {
      if (!isUuid(lead_manager_id)) {
        return res.status(400).json({ error: 'O gestor da conta é inválido.' });
      }
      const leadManager = await userRepository.findById(lead_manager_id);
      if (!leadManager || leadManager.status !== 'ACTIVE' || leadManager.role === 'COLLABORATOR') {
        return res.status(400).json({ error: 'O gestor da conta é inválido ou está inativo.' });
      }
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (company_name !== undefined) updates.company_name = company_name.trim();
    if (contact_name !== undefined) updates.contact_name = contact_name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (lead_manager_id !== undefined) updates.lead_manager_id = lead_manager_id;
    if (notes !== undefined) updates.notes = notes;
    if (logo !== undefined) updates.logo = logo;

    const updated = await clientRepository.update(clientId, updates, productIds);

    return res.json({
      message: 'Cliente atualizado com sucesso.',
      client: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// PATCH /api/clients/:id/status - Inativar ou reativar sem remover dados relacionados
clientRouter.patch('/:id/status', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const status = String(req.body?.status || '').toUpperCase();
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Status deve ser ACTIVE ou INACTIVE.' });
    }
    const updated = await clientRepository.setStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Cliente não encontrado.' });
    return res.json({
      message: status === 'ACTIVE' ? 'Cliente reativado com sucesso.' : 'Cliente inativado com sucesso.',
      client: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar o status do cliente.' });
  }
});

// DELETE /api/clients/:id/permanent - Excluir cliente e toda a cadeia de dados pertencente a ele
clientRouter.delete('/:id/permanent', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const existing = await clientRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const confirmationName = String(req.body?.confirmationName || '').trim();
    if (confirmationName !== existing.name) {
      return res.status(400).json({ error: 'Digite o nome exato do cliente para confirmar a exclusão definitiva.' });
    }

    const result = await clientRepository.deletePermanent(req.params.id, req.user!.id);
    if (!result.deleted) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const pendingStorageCleanup = await removeStoredClientFiles(result.storagePaths);
    if (pendingStorageCleanup.length > 0) {
      console.warn(`[Clientes] ${pendingStorageCleanup.length} arquivo(s) aguardam limpeza externa após a exclusão de ${req.params.id}.`);
    }
    return res.json({
      message: 'Cliente e todos os dados relacionados foram excluídos definitivamente.',
      deleted: true,
      snapshotId: result.snapshotId,
      deletedRelations: result.dependencies,
      pendingStorageCleanup: pendingStorageCleanup.length
    });
  } catch (error) {
    console.error('Erro na exclusão definitiva do cliente:', error);
    return res.status(500).json({ error: 'Erro ao excluir definitivamente o cliente.' });
  }
});

// DELETE /api/clients/:id - Compatibilidade: inativar cliente (soft delete)
clientRouter.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const archived = await clientRepository.archive(req.params.id);
    if (!archived) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    return res.json({ message: 'Cliente inativado com sucesso.', client: archived });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao arquivar cliente.' });
  }
});
