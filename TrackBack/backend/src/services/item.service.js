import Item from '../models/Item.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toImagePaths = (files = []) => files.map((file) => `/uploads/items/${file.filename}`);

const isAdmin = (user) => user.role === 'admin';
const isOwner = (item, user) => item.reportedBy.toString() === user.id;

const redactItem = (item, user) => {
  const result = item.toObject();

  if (!isAdmin(user)) {
    delete result.approvedBy;
    delete result.approvedAt;

    if (!isOwner(item, user)) {
      delete result.rejectionReason;
    }
  }

  return result;
};

export const createItem = async (data, files, user) => {
  const item = await Item.create({
    ...data,
    images: toImagePaths(files),
    status: 'pending',
    reportedBy: user.id,
  });

  return redactItem(item, user);
};

export const listItems = async (filters, user) => {
  const page = Math.max(Number.parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(filters.limit, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const query = {};

  for (const field of ['type', 'category', 'status']) {
    if (filters[field]) query[field] = filters[field];
  }

  for (const field of ['location', 'colour', 'brand']) {
    if (filters[field]) query[field] = { $regex: filters[field], $options: 'i' };
  }

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  const visibilityQuery = isAdmin(user)
    ? query
    : { $and: [query, { $or: [{ status: 'approved' }, { reportedBy: user.id }] }] };

  let itemQuery = Item.find(visibilityQuery).sort({ createdAt: -1 });
  if (filters.search) {
    itemQuery = Item.find({
      $and: [
        visibilityQuery,
        { $text: { $search: filters.search } },
      ],
    })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
  }

  const [items, total] = await Promise.all([
    itemQuery.skip((page - 1) * limit).limit(limit),
    Item.countDocuments(filters.search ? { $and: [visibilityQuery, { $text: { $search: filters.search } }] } : visibilityQuery),
  ]);

  return {
    items: items.map((item) => redactItem(item, user)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getItemById = async (id, user) => {
  const item = await Item.findById(id);
  if (!item) throw createHttpError('Item report not found.', 404);

  if (!isAdmin(user) && item.status !== 'approved' && !isOwner(item, user)) {
    throw createHttpError('You do not have permission to view this item report.', 403);
  }

  return redactItem(item, user);
};

export const updateItem = async (id, data, files, user) => {
  const item = await Item.findById(id);
  if (!item) throw createHttpError('Item report not found.', 404);

  if (!isAdmin(user) && (!isOwner(item, user) || item.status !== 'pending')) {
    throw createHttpError('You can only update your own pending reports.', 403);
  }

  const permittedFields = ['title', 'description', 'type', 'category', 'colour', 'brand', 'location', 'date'];
  for (const field of permittedFields) {
    if (data[field] !== undefined) item[field] = data[field];
  }
  if (files?.length) item.images.push(...toImagePaths(files));

  await item.save();
  return redactItem(item, user);
};

const getPendingItem = async (id) => {
  const item = await Item.findById(id);
  if (!item) throw createHttpError('Item report not found.', 404);
  if (item.status !== 'pending') {
    throw createHttpError('Only pending reports can be moderated.', 409);
  }
  return item;
};

export const approveItem = async (id, user) => {
  const item = await getPendingItem(id);
  item.status = 'approved';
  item.approvedBy = user.id;
  item.approvedAt = new Date();
  item.rejectionReason = undefined;
  await item.save();
  return redactItem(item, user);
};

export const rejectItem = async (id, rejectionReason, user) => {
  const item = await getPendingItem(id);
  item.status = 'rejected';
  item.rejectionReason = rejectionReason;
  await item.save();
  return redactItem(item, user);
};

export const archiveItem = async (id, user) => {
  const item = await Item.findById(id);
  if (!item) throw createHttpError('Item report not found.', 404);
  if (item.status === 'archived') throw createHttpError('Item report is already archived.', 409);
  if (item.status === 'unclaimed') throw createHttpError('Unclaimed reports cannot be archived in Phase 2.', 409);

  item.status = 'archived';
  await item.save();
  return redactItem(item, user);
};
