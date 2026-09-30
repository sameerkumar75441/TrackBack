import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'items');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (_request, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only JPEG, PNG, and WebP image files are allowed.');
    error.statusCode = 400;
    return callback(error);
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

export const uploadItemImages = upload.array('images', 5);

const isImageSignature = (buffer) => {
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  return isJpeg || isPng || isWebp;
};

export const removeUploadedFiles = (files = []) => {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
};

export const validateUploadedImages = (request, _response, next) => {
  try {
    for (const file of request.files || []) {
      const signature = fs.readFileSync(file.path).subarray(0, 12);
      if (!isImageSignature(signature)) {
        removeUploadedFiles(request.files);
        const error = new Error('Uploaded file content is not a supported image.');
        error.statusCode = 400;
        return next(error);
      }
    }
    return next();
  } catch (error) {
    removeUploadedFiles(request.files);
    return next(error);
  }
};
