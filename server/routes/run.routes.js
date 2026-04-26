import { Router } from 'express';
import { getRunConfig } from '../controllers/run.controller.js';

const router = Router();

router.get('/config', getRunConfig);

export default router;
