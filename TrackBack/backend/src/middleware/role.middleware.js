const requireRole = (...allowedRoles) => (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({ message: 'Authentication is required.' });
  }

  if (!allowedRoles.includes(request.user.role)) {
    return response.status(403).json({ message: 'You do not have permission for this action.' });
  }

  return next();
};

export default requireRole;
