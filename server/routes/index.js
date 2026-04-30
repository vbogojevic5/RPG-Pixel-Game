import { Router } from 'express';
import runRoutes from './run.routes.js';
import battleRoutes from './battle.routes.js';
import authRoutes from './auth.routes.js';
import savesRoutes from './saves.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/run', runRoutes);
router.use('/battle', battleRoutes);
router.use('/auth', authRoutes);
router.use('/saves', savesRoutes);
router.use('/admin', adminRoutes);

export default router;
