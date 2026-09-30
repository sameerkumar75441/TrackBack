import mongoose from 'mongoose';

export const CLAIM_STATUSES = ['requested', 'approved', 'rejected', 'cancelled', 'completed'];

const ownershipProofSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    details: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: CLAIM_STATUSES, default: 'requested' },
    ownershipProof: { type: ownershipProofSchema, required: true, select: false },
    verificationNotes: { type: String, trim: true, maxlength: 1000, select: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500, select: false },
    pickupDate: { type: Date },
    pickupSlot: { type: String, enum: ['morning', 'afternoon', 'evening'] },
    handoverTokenHash: { type: String, select: false },
    handoverTokenExpiresAt: { type: Date },
    handoverTokenUsed: { type: Boolean, default: false },
    handoverTokenUsedAt: { type: Date },
    handoverBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handoverAt: { type: Date },
    receiptPath: { type: String, select: false },
  },
  { timestamps: true },
);

claimSchema.index(
  { item: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['requested', 'approved'] } } },
);
claimSchema.index({ claimant: 1, createdAt: -1 });
claimSchema.index({ status: 1, createdAt: -1 });
claimSchema.index({ handoverTokenHash: 1 }, { sparse: true });

const Claim = mongoose.model('Claim', claimSchema);

export default Claim;
