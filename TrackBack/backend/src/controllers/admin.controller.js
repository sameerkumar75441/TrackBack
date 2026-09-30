import { getAnalytics } from '../services/admin.service.js';
import { createAdminCsv } from '../services/export.service.js';
export const analytics = async (_req, res, next) => { try { res.json({ analytics: await getAnalytics() }); } catch (error) { next(error); } };
export const exportCsv = async (_req, res, next) => { try { res.type('text/csv').attachment('trackback-admin-export.csv').send(await createAdminCsv()); } catch (error) { next(error); } };
