import { Router } from 'express';
import { body, param } from 'express-validator';
import { assign } from '../controllers/storage.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { validateRequest } from '../utils/validators.js';
const router = Router();
router.patch('/:id/storage', authenticate, requireRole('security', 'admin'), param('id').isMongoId(), body('storageLocation').trim().isLength({ min: 3, max: 160 }), validateRequest, assign);
export default router;
