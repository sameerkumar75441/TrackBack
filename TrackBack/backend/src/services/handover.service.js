import fs from 'fs';
import mongoose from 'mongoose';
import Claim from '../models/Claim.js';
import Item from '../models/Item.js';
import { recordCustodyEvent, getCustodyHistory } from './custody.service.js';
import { createReceipt } from './pdf.service.js';
import { createHandoverToken, hashHandoverToken } from './qr.service.js';
import { createNotification } from './notification.service.js';

const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const verifier = (user) => ['security', 'admin'].includes(user.role);
const claimant = (claim, user) => claim.claimant.toString() === user.id;
const notify = (payload) => (mongoose.connection.readyState === 1 ? createNotification(payload) : Promise.resolve(null));

export const assignStorage = async (itemId, storageLocation, user) => {
  const item = await Item.findOneAndUpdate(
    { _id: itemId, status: { $in: ['approved', 'claim_requested', 'claim_approved'] } },
    { $set: { storageLocation } }, { new: true },
  );
  if (!item) throw error('Item is not available for storage assignment.', 409);
  await recordCustodyEvent({ item: item.id, eventType: 'stored', performedBy: user.id, metadata: { storageLocation } });
  return item;
};

const approvedClaim = async (claimId) => {
  const claim = await Claim.findById(claimId);
  if (!claim) throw error('Claim not found.', 404);
  if (claim.status !== 'approved') throw error('Claim is not approved for handover.', 409);
  return claim;
};

export const schedulePickup = async (claimId, pickupDate, pickupSlot, user) => {
  const claim = await approvedClaim(claimId);
  if (!claimant(claim, user)) throw error('You do not have permission to schedule this pickup.', 403);
  if (new Date(pickupDate) < new Date(new Date().toDateString())) throw error('Pickup date cannot be in the past.', 400);
  claim.pickupDate = pickupDate;
  claim.pickupSlot = pickupSlot;
  await claim.save();
  await notify({ recipient: claim.claimant, type: 'pickup_scheduled', title: 'Pickup scheduled', message: `Your ${pickupSlot} pickup appointment has been saved.`, item: claim.item, claim: claim.id, dedupeKey: `pickup:${claim.id}:${new Date(claim.pickupDate).toISOString()}:${pickupSlot}` });
  return claim;
};

export const generateQr = async (claimId, user) => {
  const claim = await approvedClaim(claimId);
  if (!claimant(claim, user) && !verifier(user)) throw error('You do not have permission to create this QR code.', 403);
  const item = await Item.findById(claim.item);
  if (!item?.storageLocation) throw error('A storage location must be assigned before QR generation.', 409);
  if (!claim.pickupDate || !claim.pickupSlot) throw error('A pickup appointment is required before QR generation.', 409);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { token, tokenHash, qrDataUrl } = await createHandoverToken(frontendUrl);
  const ttl = Math.min(Math.max(Number(process.env.HANDOVER_QR_TTL_MINUTES) || 10, 1), 60);
  claim.handoverTokenHash = tokenHash;
  claim.handoverTokenExpiresAt = new Date(Date.now() + ttl * 60_000);
  claim.handoverTokenUsed = false;
  claim.handoverTokenUsedAt = undefined;
  await claim.save();
  return { qrDataUrl, expiresAt: claim.handoverTokenExpiresAt };
};

export const completeHandover = async (token, collegeIdVerified, user) => {
  if (!verifier(user)) throw error('You do not have permission to complete handover.', 403);
  if (collegeIdVerified !== true) throw error('College ID verification is required.', 400);
  const now = new Date();
  const claim = await Claim.findOneAndUpdate(
    { handoverTokenHash: hashHandoverToken(token), handoverTokenUsed: false, handoverTokenExpiresAt: { $gt: now }, status: 'approved' },
    { $set: { handoverTokenUsed: true, handoverTokenUsedAt: now, handoverBy: user.id, handoverAt: now, status: 'completed' } },
    { new: true },
  );
  if (!claim) throw error('QR token is invalid, expired, used, or not eligible for handover.', 409);
  const item = await Item.findOneAndUpdate({ _id: claim.item, status: 'claim_approved', storageLocation: { $exists: true, $ne: '' } }, { $set: { status: 'claimed' } }, { new: true });
  if (!item) throw error('Item is not eligible for handover.', 409);
  await recordCustodyEvent({ item: item.id, claim: claim.id, eventType: 'verified', performedBy: user.id, metadata: { collegeIdVerified: true } });
  await recordCustodyEvent({ item: item.id, claim: claim.id, eventType: 'handover_completed', performedBy: user.id, metadata: { pickupDate: claim.pickupDate, pickupSlot: claim.pickupSlot, storageLocation: item.storageLocation } });
  const claimantUser = await claim.populate('claimant');
  const receiptPath = await createReceipt({ claim, item, claimant: claimantUser.claimant, verifier: user });
  claim.receiptPath = receiptPath;
  await claim.save();
  await notify({ recipient: claim.claimant, type: 'handover_completed', title: 'Handover completed', message: 'Your item has been handed over successfully. Your receipt is available.', item: item.id, claim: claim.id, dedupeKey: `handover:${claim.id}` });
  return claim;
};

export const getReceipt = async (claimId, user) => {
  const claim = await Claim.findById(claimId).select('+receiptPath');
  if (!claim) throw error('Claim not found.', 404);
  if (!claimant(claim, user) && !verifier(user)) throw error('You do not have permission to access this receipt.', 403);
  if (claim.status !== 'completed' || !claim.receiptPath || !fs.existsSync(claim.receiptPath)) throw error('Receipt is not available before handover completion.', 409);
  return claim.receiptPath;
};

export const custodyHistory = async (itemId, user) => {
  const item = await Item.findById(itemId);
  if (!item) throw error('Item not found.', 404);
  if (!verifier(user) && item.reportedBy.toString() !== user.id) throw error('You do not have permission to access custody history.', 403);
  return getCustodyHistory(itemId);
};
