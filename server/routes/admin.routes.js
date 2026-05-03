import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createHero,
  createMonster,
  createMove,
  deleteUser,
  getBattleRun,
  getConfig,
  getUser,
  listAuditLogs,
  listBattleRuns,
  listSaves,
  listUsers,
  overview,
  updateConstant,
  updateHeroConfig,
  updateMonster,
  updateMove,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAdmin);

router.get('/overview', overview);
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.delete('/users/:id', deleteUser);
router.get('/saves', listSaves);
router.get('/config', getConfig);
router.post('/monsters', createMonster);
router.put('/monsters/:id', updateMonster);
router.post('/moves', createMove);
router.put('/moves/:id', updateMove);
router.post('/heroes', createHero);
router.put('/constants/:key', updateConstant);
router.put('/hero', updateHeroConfig);
router.put('/heroes/:id', updateHeroConfig);
router.get('/battle-runs', listBattleRuns);
router.get('/battle-runs/:id', getBattleRun);
router.get('/audit-logs', listAuditLogs);

export default router;
