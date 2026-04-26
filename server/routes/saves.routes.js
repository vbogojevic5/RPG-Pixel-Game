import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listSaves,
  getSave,
  createSave,
  updateSave,
  deleteSave,
} from '../controllers/saves.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listSaves);
router.get('/:id', getSave);
router.post('/', createSave);
router.put('/:id', updateSave);
router.delete('/:id', deleteSave);

export default router;
