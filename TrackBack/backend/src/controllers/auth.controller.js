import { getSafeUser, loginUser, registerUser } from '../services/auth.service.js';

export const register = async (request, response, next) => {
  try {
    const result = await registerUser(request.body);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (request, response, next) => {
  try {
    const result = await loginUser(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMe = (request, response) => {
  response.status(200).json({ user: getSafeUser(request.user) });
};
