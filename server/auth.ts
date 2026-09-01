import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userRepository, UserRole } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tecnihub_production_secret_key_2026_x87v';

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

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
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
    const user = userRepository.findById(decoded.id);
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
