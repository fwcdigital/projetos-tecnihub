import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userRepository, UserRole } from './db.js';

const configuredJwtSecret = process.env.JWT_SECRET?.trim();

if (!configuredJwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}

const JWT_SECRET = configuredJwtSecret || 'tecnihub_dev_only_secret_change_me';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function generateToken(payload: { id: string; email: string; role: UserRole; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
      name: string;
    };

    // Validar se o usuário ainda existe e está ativo no banco
    const user = await userRepository.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Usuário inativo ou não autorizado.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sessão expirada ou token inválido.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Seu perfil de usuário não possui permissão para esta operação.' 
      });
    }

    next();
  };
}
