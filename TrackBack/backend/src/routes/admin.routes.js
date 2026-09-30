import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { analytics, exportCsv } from '../controllers/admin.controller.js';
const router = Router();
router.use(authenticate, requireRole('admin'));
router.get('/analytics', analytics);
router.get('/export.csv', exportCsv);
export default router;
