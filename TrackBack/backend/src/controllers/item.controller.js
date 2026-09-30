import {
  approveItem,
  archiveItem,
  createItem,
  getItemById,
  listItems,
  rejectItem,
  updateItem,
} from '../services/item.service.js';

export const create = async (request, response, next) => {
  try {
    const item = await createItem(request.body, request.files, request.user);
    response.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

export const list = async (request, response, next) => {
  try {
    response.status(200).json(await listItems(request.query, request.user));
  } catch (error) {
    next(error);
  }
};

export const getById = async (request, response, next) => {
  try {
    const item = await getItemById(request.params.id, request.user);
    response.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

export const update = async (request, response, next) => {
  try {
    const item = await updateItem(request.params.id, request.body, request.files, request.user);
    response.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

export const approve = async (request, response, next) => {
  try {
    const item = await approveItem(request.params.id, request.user);
    response.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

export const reject = async (request, response, next) => {
  try {
    const item = await rejectItem(request.params.id, request.body.rejectionReason, request.user);
    response.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

export const archive = async (request, response, next) => {
  try {
    const item = await archiveItem(request.params.id, request.user);
    response.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};
