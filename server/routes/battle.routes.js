import { Router } from 'express';
import { getMonsterMove } from '../controllers/battle.controller.js';
import { validateBattleState } from '../middleware/validateBattleState.js';

const router = Router();

router.get('/monster-move', validateBattleState, getMonsterMove);

export default router;
