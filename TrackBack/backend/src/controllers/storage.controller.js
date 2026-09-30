import { assignStorage } from '../services/handover.service.js';
export const assign = async (req, res, next) => { try { res.status(200).json({ item: await assignStorage(req.params.id, req.body.storageLocation, req.user) }); } catch (e) { next(e); } };
