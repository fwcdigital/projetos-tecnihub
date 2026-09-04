import express, { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { userRepository, UserRole } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';
import { isUuid } from '../validation.js';
import { canManageUsers } from '../permissions.js';

export const userRouter = Router();
const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'COLLABORATOR'];
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const avatarBodyParser = express.raw({ type: () => true, limit: AVATAR_MAX_BYTES });

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_AVATAR_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'project-resources';
  return url && key ? { url, key, bucket } : null;
}

function encodedStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function localAvatarPath(userId: string): string {
  const storageRoot = process.env.LOCAL_STORAGE_DIR?.trim()
    ? path.resolve(process.env.LOCAL_STORAGE_DIR.trim())
    : path.resolve(process.cwd(), 'storage');
  return path.join(storageRoot, 'avatars', userId);
}

function isAvatarPayload(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function mayChangeAvatar(req: AuthRequest, target: Awaited<ReturnType<typeof userRepository.findById>>): boolean {
  if (!req.user || !target) return false;
  if (req.user.id === target.id) return true;
  if (!canManageUsers(req.user)) return false;
  return target.role !== 'SUPER_ADMIN' || req.user.role === 'SUPER_ADMIN';
}

function parseAvatarBody(req: AuthRequest, res: Response, next: (error?: unknown) => void) {
  avatarBodyParser(req, res, error => {
    if ((error as any)?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'A imagem deve possuir no máximo 5 MB.' });
    }
    return next(error);
  });
}

// GET /api/users/:id/avatar - Proxy estável para o bucket privado de avatares
userRouter.get('/:id/avatar', async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).end();
    const config = storageConfig();
    let bytes: Buffer;
    let contentType: string;
    if (config) {
      const storagePath = `avatars/${req.params.id}`;
      const download = await fetch(`${config.url}/storage/v1/object/authenticated/${config.bucket}/${encodedStoragePath(storagePath)}`, {
        headers: { Authorization: `Bearer ${config.key}`, apikey: config.key }
      });
      if (!download.ok) return res.status(download.status === 404 ? 404 : 502).end();
      bytes = Buffer.from(await download.arrayBuffer());
      contentType = download.headers.get('content-type') || 'application/octet-stream';
    } else {
      try {
        bytes = await fs.readFile(localAvatarPath(req.params.id));
      } catch (error: any) {
        if (error?.code === 'ENOENT') return res.status(404).end();
        throw error;
      }
      contentType = AVATAR_TYPES.find(type => isAvatarPayload(bytes, type)) || 'application/octet-stream';
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(bytes);
  } catch {
    return res.status(502).end();
  }
});

// PUT /api/users/:id/avatar - Próprio usuário ou administradores autorizados
userRouter.put('/:id/avatar', authenticateToken, parseAvatarBody, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const target = await userRepository.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (!mayChangeAvatar(req, target)) return res.status(403).json({ error: 'Você não tem permissão para alterar esta foto.' });

    const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (!AVATAR_TYPES.includes(mimeType)) return res.status(415).json({ error: 'Envie uma imagem JPG, PNG ou WEBP.' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || !isAvatarPayload(req.body, mimeType)) {
      return res.status(415).json({ error: 'O conteúdo enviado não corresponde a uma imagem válida.' });
    }

    const config = storageConfig();
    if (config) {
      const storagePath = `avatars/${target.id}`;
      const upload = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${encodedStoragePath(storagePath)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.key}`,
          apikey: config.key,
          'Content-Type': mimeType,
          'x-upsert': 'true'
        },
        body: req.body
      });
      if (!upload.ok) return res.status(502).json({ error: 'Não foi possível enviar a imagem para o armazenamento.' });
    } else {
      const destination = localAvatarPath(target.id);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, req.body);
    }

    const avatar = `/api/users/${target.id}/avatar?v=${randomUUID()}`;
    const updated = await userRepository.update(target.id, { avatar });
    return res.json({ message: 'Foto atualizada com sucesso.', user: updated });
  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    return res.status(500).json({ error: 'Erro ao atualizar a foto do usuário.' });
  }
});

// DELETE /api/users/:id/avatar - Remover foto e voltar às iniciais
userRouter.delete('/:id/avatar', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const target = await userRepository.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (!mayChangeAvatar(req, target)) return res.status(403).json({ error: 'Você não tem permissão para remover esta foto.' });

    if (target.avatar.startsWith(`/api/users/${target.id}/avatar`)) {
      const config = storageConfig();
      if (config) {
        const storagePath = `avatars/${target.id}`;
        const removal = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${encodedStoragePath(storagePath)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${config.key}`, apikey: config.key }
        });
        if (!removal.ok && removal.status !== 404) {
          return res.status(502).json({ error: 'Não foi possível remover a imagem do armazenamento.' });
        }
      } else {
        await fs.rm(localAvatarPath(target.id), { force: true });
      }
    }

    const updated = await userRepository.update(target.id, { avatar: '' });
    return res.json({ message: 'Foto removida. O avatar padrão foi restaurado.', user: updated });
  } catch (error) {
    console.error('Erro ao remover avatar:', error);
    return res.status(500).json({ error: 'Erro ao remover a foto do usuário.' });
  }
});

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
      avatar: avatar || '',
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
