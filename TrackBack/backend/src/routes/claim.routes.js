import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  approve,
  create,
  getById,
  list,
  reject,
} from '../controllers/claim.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();
const claimIdValidation = param('id').isMongoId().withMessage('Claim id is invalid.');

router.use(authenticate);
router.post(
  '/',
  requireRole('student'),
  body('itemId').isMongoId().withMessage('itemId must be a valid item id.'),
  body('ownershipProof').isObject().withMessage('Ownership proof is required.'),
  body('ownershipProof.description').trim().isLength({ min: 10, max: 1000 }).withMessage('Ownership proof description must be 10 to 1000 characters long.'),
  body('ownershipProof.details').optional().trim().isLength({ max: 2000 }).withMessage('Ownership proof details must be at most 2000 characters long.'),
  validateRequest,
  create,
);
router.get('/', list);
router.get('/:id', claimIdValidation, validateRequest, getById);
router.patch(
  '/:id/approve',
  requireRole('security', 'admin'),
  claimIdValidation,
  body('verificationNotes').optional().trim().isLength({ max: 1000 }).withMessage('Verification notes must be at most 1000 characters long.'),
  validateRequest,
  approve,
);
router.patch(
  '/:id/reject',
  requireRole('security', 'admin'),
  claimIdValidation,
  body('rejectionReason').trim().isLength({ min: 5, max: 500 }).withMessage('Rejection reason must be 5 to 500 characters long.'),
  body('verificationNotes').optional().trim().isLength({ max: 1000 }).withMessage('Verification notes must be at most 1000 characters long.'),
  validateRequest,
  reject,
);

export default router;
