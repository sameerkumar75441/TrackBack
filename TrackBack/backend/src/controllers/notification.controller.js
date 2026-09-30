import { listNotifications, markAllRead, markRead } from '../services/notification.service.js';
export const list = async (req, res, next) => { try { res.json(await listNotifications(req.user)); } catch (error) { next(error); } };
export const read = async (req, res, next) => { try { res.json({ notification: await markRead(req.params.id, req.user) }); } catch (error) { next(error); } };
export const readAll = async (req, res, next) => { try { await markAllRead(req.user); res.status(204).end(); } catch (error) { next(error); } };
