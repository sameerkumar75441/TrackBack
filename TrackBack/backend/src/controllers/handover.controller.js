import { completeHandover, custodyHistory, generateQr, getReceipt, schedulePickup } from '../services/handover.service.js';

export const pickup = async (req, res, next) => { try { res.status(200).json({ claim: await schedulePickup(req.params.claimId, req.body.pickupDate, req.body.pickupSlot, req.user) }); } catch (e) { next(e); } };
export const qr = async (req, res, next) => { try { res.status(200).json(await generateQr(req.params.claimId, req.user)); } catch (e) { next(e); } };
export const verify = async (req, res, next) => { try { res.status(200).json({ claim: await completeHandover(req.body.token, req.body.collegeIdVerified, req.user) }); } catch (e) { next(e); } };
export const receipt = async (req, res, next) => { try { res.download(await getReceipt(req.params.claimId, req.user)); } catch (e) { next(e); } };
export const custody = async (req, res, next) => { try { res.status(200).json({ events: await custodyHistory(req.params.itemId, req.user) }); } catch (e) { next(e); } };
