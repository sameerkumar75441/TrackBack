import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authenticate = async (request, _response, next) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return _response.status(401).json({ message: 'Authentication token is required.' });
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error('JWT_SECRET is required to verify authentication tokens.'));
    }

    const token = authorization.slice(7);
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(userId);

    if (!user || user.status !== 'active') {
      return _response.status(401).json({ message: 'Authentication is no longer valid.' });
    }

    request.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return _response.status(401).json({ message: 'Authentication token has expired.' });
    }

    if (error.name === 'JsonWebTokenError') {
      return _response.status(401).json({ message: 'Authentication token is invalid.' });
    }

    return next(error);
  }
};

export default authenticate;
