import { Router } from 'express';
import { getMonsterMove, recordBattleResult } from '../controllers/battle.controller.js';
import { validateBattleState } from '../middleware/validateBattleState.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/monster-move', validateBattleState, getMonsterMove);
router.post('/results', requireAuth, recordBattleResult);

export default router;
