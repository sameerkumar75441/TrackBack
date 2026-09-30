import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  approve,
  archive,
  create,
  getById,
  list,
  reject,
  update,
} from '../controllers/item.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { uploadItemImages, validateUploadedImages } from '../middleware/upload.middleware.js';
import { ITEM_CATEGORIES, ITEM_STATUSES } from '../models/Item.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();

const itemFieldsValidation = [
  body('title').optional().trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3 to 120 characters long.'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10 to 2000 characters long.'),
  body('type').optional().isIn(['lost', 'found']).withMessage('Type must be lost or found.'),
  body('category').optional().isIn(ITEM_CATEGORIES).withMessage('Category is invalid.'),
  body('colour').optional().trim().isLength({ max: 50 }).withMessage('Colour must be at most 50 characters long.'),
  body('brand').optional().trim().isLength({ max: 80 }).withMessage('Brand must be at most 80 characters long.'),
  body('location').optional().trim().isLength({ min: 2, max: 160 }).withMessage('Location must be 2 to 160 characters long.'),
  body('date').optional().isISO8601().toDate().withMessage('Date must be a valid ISO-8601 date.'),
];

const requiredItemFieldsValidation = [
  body('title').exists().withMessage('Title is required.'),
  body('description').exists().withMessage('Description is required.'),
  body('type').exists().withMessage('Type is required.'),
  body('category').exists().withMessage('Category is required.'),
  body('location').exists().withMessage('Location is required.'),
  body('date').exists().withMessage('Date is required.'),
];

const itemIdValidation = [param('id').isMongoId().withMessage('Item id is invalid.')];

const listingValidation = [
  query('type').optional().isIn(['lost', 'found']).withMessage('Type must be lost or found.'),
  query('category').optional().isIn(ITEM_CATEGORIES).withMessage('Category is invalid.'),
  query('status').optional().isIn(ITEM_STATUSES).withMessage('Status is invalid.'),
  query('location').optional().trim().isLength({ max: 160 }).withMessage('Location filter is too long.'),
  query('colour').optional().trim().isLength({ max: 50 }).withMessage('Colour filter is too long.'),
  query('brand').optional().trim().isLength({ max: 80 }).withMessage('Brand filter is too long.'),
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Search must be 1 to 100 characters long.'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO-8601 date.'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO-8601 date.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
];

router.use(authenticate);
router.get('/', listingValidation, validateRequest, list);
router.post('/', uploadItemImages, validateUploadedImages, requiredItemFieldsValidation, itemFieldsValidation, validateRequest, create);
router.get('/:id', itemIdValidation, validateRequest, getById);
router.put('/:id', uploadItemImages, validateUploadedImages, itemIdValidation, itemFieldsValidation, validateRequest, update);
router.patch('/:id/approve', requireRole('admin'), itemIdValidation, validateRequest, approve);
router.patch('/:id/reject', requireRole('admin'), itemIdValidation, body('rejectionReason').trim().isLength({ min: 5, max: 500 }).withMessage('Rejection reason must be 5 to 500 characters long.'), validateRequest, reject);
router.patch('/:id/archive', requireRole('admin'), itemIdValidation, validateRequest, archive);

export default router;
