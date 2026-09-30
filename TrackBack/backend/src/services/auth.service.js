import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const HASH_ROUNDS = 12;

const toSafeUser = (user) => user.toJSON();

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to issue authentication tokens.');
  }

  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
};

export const registerUser = async ({ name, email, password, identifier, phone }) => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    identifier,
    phone,
    role: 'student',
  });

  return { token: createToken(user), user: toSafeUser(user) };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('This account is not active.');
    error.statusCode = 403;
    throw error;
  }

  return { token: createToken(user), user: toSafeUser(user) };
};

export const getSafeUser = (user) => toSafeUser(user);
