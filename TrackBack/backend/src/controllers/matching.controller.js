import { compareItemReports } from '../services/matching.service.js';

export const compare = async (request, response, next) => {
  try {
    const result = await compareItemReports(
      request.body.lostItemId,
      request.body.foundItemId,
      request.user,
    );
    response.status(200).json({ match: result });
  } catch (error) {
    next(error);
  }
};
