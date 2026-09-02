import { Router, Response } from 'express';
import { clientRepository, projectRepository, userRepository, ClientStatus } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';

export const clientRouter = Router();

// GET /api/clients - Listar todos os clientes
clientRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    const clients = await clientRepository.findAll(req.user, {
      status: status as ClientStatus,
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
    const { name, company_name, contact_name, email, phone, status, lead_manager_id, notes, monthly_services, logo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
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
      monthly_services: Array.isArray(monthly_services) ? monthly_services : []
    });

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
clientRouter.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, company_name, contact_name, email, phone, status, lead_manager_id, notes, monthly_services, logo } = req.body;
    const clientId = req.params.id;

    if (!isUuid(clientId)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const existing = await clientRepository.findById(clientId, req.user);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
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
    if (status) updates.status = status;
    if (lead_manager_id !== undefined) updates.lead_manager_id = lead_manager_id;
    if (notes !== undefined) updates.notes = notes;
    if (monthly_services !== undefined) updates.monthly_services = monthly_services;
    if (logo !== undefined) updates.logo = logo;

    const updated = await clientRepository.update(clientId, updates);

    return res.json({
      message: 'Cliente atualizado com sucesso.',
      client: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// DELETE /api/clients/:id - Arquivar cliente (Soft Delete)
clientRouter.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const archived = await clientRepository.archive(req.params.id);
    if (!archived) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    return res.json({ message: 'Cliente arquivado com sucesso.', client: archived });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao arquivar cliente.' });
  }
});
