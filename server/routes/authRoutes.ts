import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userRepository } from '../db.js';
import { generateToken, authenticateToken, AuthRequest } from '../auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await userRepository.findByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Esta conta de usuário está inativa. Contate o administrador.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    const { password_hash, ...safeUser } = user;

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: safeUser
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao processar autenticação.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao obter dados da sessão.' });
  }
});

// POST /api/auth/change-password - Alterar a própria senha
authRouter.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (String(new_password).trim().length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir pelo menos 6 caracteres.' });
    }

    const user = await userRepository.findByEmail(req.user!.email);
    if (!user || !bcrypt.compareSync(String(current_password), user.password_hash)) {
      return res.status(400).json({ error: 'A senha atual está incorreta.' });
    }

    const password_hash = bcrypt.hashSync(String(new_password), bcrypt.genSaltSync(10));
    await userRepository.update(req.user!.id, { password_hash });
    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  return res.json({ message: 'Sessão encerrada com sucesso.' });
});
