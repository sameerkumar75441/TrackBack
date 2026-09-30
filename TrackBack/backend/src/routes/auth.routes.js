import { Router } from 'express';
import { body } from 'express-validator';
import { getMe, login, register } from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();

const registrationValidation = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters long.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8 to 128 characters long.'),
  body('identifier').optional().trim().isLength({ max: 50 }).withMessage('Identifier must be at most 50 characters long.'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone must be at most 30 characters long.'),
  body('role').optional().equals('student').withMessage('Public registration only creates student accounts.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
];

router.post('/register', registrationValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me', authenticate, getMe);

export default router;
