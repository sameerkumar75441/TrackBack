import { removeUploadedFiles } from './upload.middleware.js';

export const notFound = (request, _response, next) => {
  const error = new Error(
    `Route not found: ${request.method} ${request.originalUrl}`,
  );
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, _request, response, _next) => {
  removeUploadedFiles(_request.files);
  const statusCode =
    error.statusCode ||
    error.status ||
    (error.name === "MulterError" ? 400 : undefined) ||
    (error.code === 11000 ? 409 : undefined) ||
    (error.name === "ValidationError" ? 400 : 500);
  const message =
    error.name === "MulterError"
      ? error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller."
        : "Image upload is invalid."
      : error.code === 11000
      ? "An account with this email already exists."
      : statusCode >= 500
        ? "An unexpected server error occurred."
        : error.message;

  response.status(statusCode).json({ message });
};

