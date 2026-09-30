import Claim from '../models/Claim.js';
import Item from '../models/Item.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { recordCustodyEvent } from './custody.service.js';
import { createNotification } from './notification.service.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isVerifier = (user) => ['security', 'admin'].includes(user.role);
const isAdmin = (user) => user.role === 'admin';
const isClaimant = (claim, user) => claim.claimant.toString() === user.id;
const notify = (payload) => (mongoose.connection.readyState === 1 ? createNotification(payload) : Promise.resolve(null));

const serializeClaim = (claim, includePrivate = false) => {
  const result = claim.toObject ? claim.toObject() : { ...claim };
  delete result.__v;

  if (!includePrivate) {
    delete result.ownershipProof;
    delete result.verificationNotes;
    delete result.rejectionReason;
    delete result.verifiedBy;
    delete result.verifiedAt;
  }

  return result;
};

const getClaimOrThrow = async (id, includePrivate = false) => {
  let query = Claim.findById(id);
  if (includePrivate) query = query.select('+ownershipProof +verificationNotes +rejectionReason');
  const claim = await query;
  if (!claim) throw createHttpError('Claim not found.', 404);
  return claim;
};

const ensureVerifierCanAccess = (claim, user) => {
  if (isAdmin(user)) return;
  if (user.role === 'security' && claim.status === 'requested') return;
  throw createHttpError('You do not have permission to access this claim.', 403);
};

export const createClaim = async (itemId, ownershipProof, user) => {
  if (user.role !== 'student') {
    throw createHttpError('Only students can submit claims.', 403);
  }

  const item = await Item.findOneAndUpdate(
    { _id: itemId, status: 'approved' },
    { $set: { status: 'claim_requested' } },
    { new: true },
  );

  if (!item) {
    const existingItem = await Item.findById(itemId);
    if (!existingItem) throw createHttpError('Item report not found.', 404);
    throw createHttpError('This item report is not available for a claim.', 409);
  }

  try {
    const claim = await Claim.create({ item: item.id, claimant: user.id, ownershipProof });
    await recordCustodyEvent({ item: item.id, claim: claim.id, eventType: 'claim_requested', performedBy: user.id });
    await notify({ recipient: user.id, type: 'claim_submitted', title: 'Claim submitted', message: 'Your ownership claim is waiting for verification.', item: item.id, claim: claim.id, dedupeKey: `claim-submitted:${claim.id}` });
    if (mongoose.connection.readyState === 1) {
      const reviewers = await User.find({ role: { $in: ['security', 'admin'] }, status: 'active' }).select('_id').lean();
      await Promise.all(reviewers.map((reviewer) => createNotification({ recipient: reviewer._id, type: 'claim_review_required', title: 'New claim to review', message: 'A claim is ready for ownership verification.', item: item.id, claim: claim.id, dedupeKey: `claim-review:${claim.id}:${reviewer._id}` })));
    }
    return serializeClaim(claim);
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError('This item already has an active claim.', 409);
    }
    await Item.updateOne(
      { _id: item.id, status: 'claim_requested' },
      { $set: { status: 'approved' } },
    );
    throw error;
  }
};

export const listClaims = async (user) => {
  let query;
  let includePrivate = false;

  if (user.role === 'student') {
    query = Claim.find({ claimant: user.id });
  } else if (user.role === 'security') {
    query = Claim.find({ status: 'requested' });
    includePrivate = true;
  } else if (user.role === 'admin') {
    query = Claim.find({});
    includePrivate = true;
  } else {
    throw createHttpError('You do not have permission to view claims.', 403);
  }

  if (includePrivate) query = query.select('+ownershipProof +verificationNotes +rejectionReason');
  // Storage is held on Item. This safe summary lets operational screens show
  // the assigned location without exposing claim proof or reviewer notes.
  if (typeof query.populate === 'function') {
    query = query.populate('item', 'title type category location date images status storageLocation');
  }
  const claims = await query.sort({ createdAt: -1 });
  return claims.map((claim) => serializeClaim(claim, includePrivate));
};

export const getClaimById = async (id, user) => {
  const initialClaim = await getClaimOrThrow(id);
  if (isClaimant(initialClaim, user)) return serializeClaim(initialClaim);
  if (!isVerifier(user)) throw createHttpError('You do not have permission to access this claim.', 403);

  ensureVerifierCanAccess(initialClaim, user);
  const claim = await getClaimOrThrow(id, true);
  return serializeClaim(claim, true);
};

const getRequestedClaimForVerification = async (id, user) => {
  const claim = await getClaimOrThrow(id, true);
  if (claim.status !== 'requested') {
    throw createHttpError('Only requested claims can be verified.', 409);
  }
  if (isClaimant(claim, user)) {
    throw createHttpError('You cannot verify your own claim.', 403);
  }
  return claim;
};

export const approveClaim = async (id, verificationNotes, user) => {
  const claim = await getRequestedClaimForVerification(id, user);
  const item = await Item.findOneAndUpdate(
    { _id: claim.item, status: 'claim_requested' },
    { $set: { status: 'claim_approved' } },
    { new: true },
  );
  if (!item) throw createHttpError('Item is not in a claim-requested state.', 409);

  claim.status = 'approved';
  claim.verifiedBy = user.id;
  claim.verifiedAt = new Date();
  if (verificationNotes !== undefined) claim.verificationNotes = verificationNotes;
  await claim.save();
  await recordCustodyEvent({ item: claim.item, claim: claim.id, eventType: 'verified', performedBy: user.id, metadata: { verification: 'ownership_proof' } });
  await notify({ recipient: claim.claimant, type: 'claim_approved', title: 'Claim approved', message: 'Your claim is approved. Arrange pickup when ready.', item: claim.item, claim: claim.id, dedupeKey: `claim-approved:${claim.id}` });
  return serializeClaim(claim, true);
};

export const rejectClaim = async (id, rejectionReason, verificationNotes, user) => {
  const claim = await getRequestedClaimForVerification(id, user);
  const item = await Item.findOneAndUpdate(
    { _id: claim.item, status: 'claim_requested' },
    { $set: { status: 'approved' } },
    { new: true },
  );
  if (!item) throw createHttpError('Item is not in a claim-requested state.', 409);

  claim.status = 'rejected';
  claim.rejectionReason = rejectionReason;
  claim.verifiedBy = user.id;
  claim.verifiedAt = new Date();
  if (verificationNotes !== undefined) claim.verificationNotes = verificationNotes;
  await claim.save();
  await notify({ recipient: claim.claimant, type: 'claim_rejected', title: 'Claim not approved', message: 'Your claim was not approved. The item remains available for recovery.', item: claim.item, claim: claim.id, dedupeKey: `claim-rejected:${claim.id}` });
  return serializeClaim(claim, true);
};
