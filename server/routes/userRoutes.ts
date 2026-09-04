import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userRepository, UserRole } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';
import { canManageUsers } from '../permissions.js';

export const userRouter = Router();
const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'COLLABORATOR'];

// GET /api/users - Listar usuários
userRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search, includeInactive } = req.query;
    if (includeInactive && includeInactive !== 'true' && includeInactive !== 'false') {
      return res.status(400).json({ error: 'O filtro includeInactive deve ser true ou false.' });
    }
    if (includeInactive === 'true' && !canManageUsers(req.user)) {
      return res.status(403).json({ error: 'Você não tem permissão para listar usuários inativos.' });
    }
    const users = await userRepository.findAll({
      role: role as any,
      status: (includeInactive === 'true' ? status : (status || 'ACTIVE')) as any,
      search: search as string
    });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// DELETE /api/users/:id - Exclusão lógica para preservar vínculos e histórico
userRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    if (!isUuid(targetId)) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir usuários.' });
    }
    if (req.user?.id === targetId) {
      return res.status(403).json({ error: 'Você não pode excluir a própria conta.' });
    }

    const targetUser = await userRepository.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (targetUser.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Administradores não podem excluir contas SUPER_ADMIN.' });
    }

    if (targetUser.status !== 'INACTIVE') {
      await userRepository.update(targetId, { status: 'INACTIVE' });
    }
    return res.json({ removed: true, deactivated: true });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

// GET /api/users/:id - Detalhes do usuário
userRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const user = await userRepository.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// POST /api/users - Cadastrar novo usuário (Apenas SUPER_ADMIN e ADMIN)
userRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, job_title, avatar, status = 'ACTIVE' } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nome, e-mail, senha e nível de permissão são obrigatórios.' });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Perfil de acesso inválido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres.' });
    }
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Situação de usuário inválida.' });
    }

    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Apenas o Administrador Principal pode criar outro SUPER_ADMIN.' });
    }

    const existingUser = await userRepository.findByEmail(email.trim());
    if (existingUser) {
      return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUser = await userRepository.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
      role: role as UserRole,
      job_title: job_title || 'Especialista',
      status
    });

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      user: newUser
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' });
  }
});

// PUT /api/users/:id - Atualizar usuário
userRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    if (!isUuid(targetId)) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const isSelf = req.user?.id === targetId;
    const isAdmin = canManageUsers(req.user);
    const targetUser = await userRepository.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (!isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão para administrar usuários.' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Administradores não podem alterar contas SUPER_ADMIN.' });
    }

    const { name, email, password, role, job_title, avatar, status } = req.body;
    const updates: any = {};

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
      updates.name = String(name).trim();
    }
    if (email !== undefined) {
      if (!String(email).trim()) return res.status(400).json({ error: 'E-mail é obrigatório.' });
      updates.email = String(email).trim().toLowerCase();
    }
    if (avatar !== undefined) updates.avatar = String(avatar).trim();
    if (job_title !== undefined) updates.job_title = String(job_title).trim();

    if (role !== undefined) {
      if (isSelf) return res.status(403).json({ error: 'Um usuário não pode alterar o próprio perfil de acesso.' });
      if (!USER_ROLES.includes(role)) return res.status(400).json({ error: 'Perfil de acesso inválido.' });
      if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Apenas o Administrador Principal pode atribuir a permissão SUPER_ADMIN.' });
      }
      updates.role = role;
    }
    if (status !== undefined) {
      if (status !== 'ACTIVE' && status !== 'INACTIVE') return res.status(400).json({ error: 'Situação de usuário inválida.' });
      updates.status = status;
    }

    if (password && password.trim().length < 6) return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres.' });
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      updates.password_hash = bcrypt.hashSync(password, salt);
    }

    if (email) {
      const sameEmailUser = await userRepository.findByEmail(email.trim());
      if (sameEmailUser && sameEmailUser.id !== targetId) {
        return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
      }
    }

    const updatedUser = await userRepository.update(targetId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      message: 'Usuário atualizado com sucesso.',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});
