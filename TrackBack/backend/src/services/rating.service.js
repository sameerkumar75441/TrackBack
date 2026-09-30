import Claim from '../models/Claim.js';
import Rating from '../models/Rating.js';

const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });
export const createRating = async (claimId, rating, feedback, user) => {
  if (user.role !== 'student') throw error('Only students can submit handover feedback.', 403);
  const claim = await Claim.findOne({ _id: claimId, claimant: user.id, status: 'completed' });
  if (!claim) throw error('A completed claim belonging to you is required before rating.', 409);
  try { return await Rating.create({ user: user.id, item: claim.item, claim: claim.id, rating, feedback }); }
  catch (cause) { if (cause.code === 11000) throw error('You have already rated this completed handover.', 409); throw cause; }
};
export const listMyRatings = async (user) => Rating.find({ user: user.id }).sort({ createdAt: -1 }).lean();
