import { Router, Response } from 'express';
import { projectRepository, clientRepository, userRepository } from '../db.js';
import { authenticateToken, AuthRequest } from '../auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard/stats - Métricas e dados reais do banco
dashboardRouter.get('/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const clients = clientRepository.findAll({ status: 'ACTIVE' });
    const userProjects = projectRepository.findAll(user);

    const activeProjects = userProjects.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED');
    const inProgressProjects = userProjects.filter(p => p.status === 'IN_PROGRESS');
    const planningProjects = userProjects.filter(p => p.status === 'PLANNING');
    const completedProjects = userProjects.filter(p => p.status === 'COMPLETED');

    const totalActiveClients = clients.length;
    const totalProjects = userProjects.length;

    // Resumo de usuários para administradores e gestores
    const allUsers = userRepository.findAll();
    const activeUsersCount = allUsers.filter(u => u.status === 'ACTIVE').length;

    return res.json({
      metrics: {
        totalActiveClients,
        totalProjects,
        activeProjectsCount: activeProjects.length,
        inProgressProjectsCount: inProgressProjects.length,
        planningProjectsCount: planningProjects.length,
        completedProjectsCount: completedProjects.length,
        activeUsersCount
      },
      recentProjects: userProjects.slice(0, 6),
      recentClients: clients.slice(0, 6)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao calcular métricas do dashboard.' });
  }
});
