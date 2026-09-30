import { Router } from 'express';
import { body } from 'express-validator';
import { compare } from '../controllers/matching.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();

router.post(
  '/compare',
  authenticate,
  body('lostItemId').isMongoId().withMessage('lostItemId must be a valid item id.'),
  body('foundItemId').isMongoId().withMessage('foundItemId must be a valid item id.'),
  validateRequest,
  compare,
);

export default router;
