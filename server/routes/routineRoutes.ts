import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../auth.js';
import { routineRepository } from '../db.js';
import { isUuid } from '../validation.js';

export const routineRouter = Router();

routineRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const routines = await routineRepository.findAll(req.user);
    return res.json({ success: true, routines });
  } catch (error) {
    console.error('Erro ao listar rotinas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar rotinas.' });
  }
});

routineRouter.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Rotina não encontrada.' });
    const existing = await routineRepository.findById(req.params.id, req.user);
    if (!existing) return res.status(404).json({ error: 'Rotina não encontrada.' });
    const updates: Record<string, unknown> = {};
    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'PAUSED', 'ENDED'].includes(req.body.status)) return res.status(400).json({ error: 'Status de rotina inválido.' });
      updates.status = req.body.status;
    }
    if (req.body.frequency !== undefined) {
      if (!['DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADO'].includes(req.body.frequency)) return res.status(400).json({ error: 'Frequência inválida.' });
      updates.frequency = req.body.frequency;
    }
    if (req.body.ruleText !== undefined) updates.rule_text = String(req.body.ruleText).trim();
    if (req.body.customIntervalDays !== undefined) {
      const customIntervalDays = Number(req.body.customIntervalDays);
      if (!Number.isInteger(customIntervalDays) || customIntervalDays < 1) {
        return res.status(400).json({ error: 'Informe um intervalo válido para a recorrência personalizada.' });
      }
      updates.custom_interval_days = customIntervalDays;
    }
    const targetFrequency = String(updates.frequency || existing.frequency);
    const targetCustomInterval = updates.custom_interval_days ?? existing.customIntervalDays;
    if (targetFrequency === 'PERSONALIZADO' && (!Number.isInteger(targetCustomInterval) || Number(targetCustomInterval) < 1)) {
      return res.status(400).json({ error: 'Informe um intervalo válido para a recorrência personalizada.' });
    }
    if (req.body.nextOccurrenceDate !== undefined) updates.next_occurrence_date = req.body.nextOccurrenceDate;
    if (req.body.occurrenceTime !== undefined) updates.occurrence_time = req.body.occurrenceTime || null;
    const routine = await routineRepository.update(existing.id, updates);
    return res.json({ success: true, routine });
  } catch (error) {
    console.error('Erro ao atualizar rotina:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar rotina.' });
  }
});

routineRouter.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Rotina não encontrada.' });
    const existing = await routineRepository.findById(req.params.id, req.user);
    if (!existing) return res.status(404).json({ error: 'Rotina não encontrada.' });
    await routineRepository.delete(existing.id);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao remover recorrência.' });
  }
});
