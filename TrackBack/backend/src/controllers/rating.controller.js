import { createRating, listMyRatings } from '../services/rating.service.js';
export const create = async (req, res, next) => { try { res.status(201).json({ rating: await createRating(req.body.claimId, req.body.rating, req.body.feedback, req.user) }); } catch (error) { next(error); } };
export const list = async (req, res, next) => { try { res.json({ ratings: await listMyRatings(req.user) }); } catch (error) { next(error); } };
