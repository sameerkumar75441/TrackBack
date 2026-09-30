import {
  approveClaim,
  createClaim,
  getClaimById,
  listClaims,
  rejectClaim,
} from '../services/claim.service.js';

export const create = async (request, response, next) => {
  try {
    const claim = await createClaim(request.body.itemId, request.body.ownershipProof, request.user);
    response.status(201).json({ claim });
  } catch (error) {
    next(error);
  }
};

export const list = async (request, response, next) => {
  try {
    response.status(200).json({ claims: await listClaims(request.user) });
  } catch (error) {
    next(error);
  }
};

export const getById = async (request, response, next) => {
  try {
    response.status(200).json({ claim: await getClaimById(request.params.id, request.user) });
  } catch (error) {
    next(error);
  }
};

export const approve = async (request, response, next) => {
  try {
    const claim = await approveClaim(request.params.id, request.body.verificationNotes, request.user);
    response.status(200).json({ claim });
  } catch (error) {
    next(error);
  }
};

export const reject = async (request, response, next) => {
  try {
    const claim = await rejectClaim(
      request.params.id,
      request.body.rejectionReason,
      request.body.verificationNotes,
      request.user,
    );
    response.status(200).json({ claim });
  } catch (error) {
    next(error);
  }
};
