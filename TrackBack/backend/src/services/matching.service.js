import path from 'path';
import Item from '../models/Item.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const canViewForMatching = (item, user) => (
  user.role === 'admin'
  || item.status === 'approved'
  || item.reportedBy.toString() === user.id
);

const toMatchingItem = (item) => ({
  title: item.title,
  description: item.description,
  type: item.type,
  category: item.category,
  colour: item.colour,
  brand: item.brand,
  location: item.location,
  date: new Date(item.date).toISOString(),
  images: (item.images || [])
    .filter((image) => typeof image === 'string' && image.startsWith('/uploads/items/'))
    .map((image) => path.resolve(process.cwd(), 'uploads', 'items', path.basename(image))),
});

const validateMatchingResponse = (result) => {
  const numberFields = ['ruleScore', 'ruleScoreNormalized', 'textScore', 'finalScore'];
  const validNumbers = numberFields.every((field) => Number.isFinite(result?.[field]) && result[field] >= 0 && result[field] <= (field === 'ruleScore' ? 100 : 1));
  const validImage = typeof result?.imageAvailable === 'boolean'
    && (result.imageAvailable ? Number.isFinite(result.imageScore) && result.imageScore >= 0 && result.imageScore <= 1 : result.imageScore === null);

  if (!validNumbers || !validImage) {
    throw createHttpError('Matching service returned an invalid response.', 503);
  }
};

const requestMatch = async (lostItem, foundItem) => {
  const baseUrl = process.env.MATCHING_SERVICE_URL;
  if (!baseUrl) {
    throw createHttpError('Matching service is not configured.', 503);
  }

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lostItem, foundItem }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw createHttpError('Matching service is unavailable.', 503);
  }

  if (!response.ok) {
    throw createHttpError('Matching service could not process this comparison.', 503);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw createHttpError('Matching service returned an invalid response.', 503);
  }

  validateMatchingResponse(result);
  return result;
};

export const compareItemReports = async (lostItemId, foundItemId, user) => {
  const [firstItem, secondItem] = await Promise.all([
    Item.findById(lostItemId),
    Item.findById(foundItemId),
  ]);

  if (!firstItem || !secondItem) {
    throw createHttpError('One or both item reports were not found.', 404);
  }

  if (!canViewForMatching(firstItem, user) || !canViewForMatching(secondItem, user)) {
    throw createHttpError('You do not have permission to compare these item reports.', 403);
  }

  if (firstItem.type === secondItem.type) {
    throw createHttpError('A comparison requires one lost report and one found report.', 400);
  }

  const lostItem = firstItem.type === 'lost' ? firstItem : secondItem;
  const foundItem = firstItem.type === 'found' ? firstItem : secondItem;
  return requestMatch(toMatchingItem(lostItem), toMatchingItem(foundItem));
};
