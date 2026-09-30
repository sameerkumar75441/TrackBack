import { validationResult } from 'express-validator';

export const validateRequest = (request, _response, next) => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    return _response.status(400).json({
      message: 'Validation failed.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  return next();
};
