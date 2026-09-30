import mongoose from 'mongoose';

export const ITEM_CATEGORIES = [
  'electronics',
  'accessories',
  'documents',
  'clothing',
  'keys',
  'bags',
  'jewellery',
  'other',
];

export const ITEM_STATUSES = [
  'pending',
  'approved',
  'claim_requested',
  'claim_approved',
  'claimed',
  'rejected',
  'archived',
  'unclaimed',
];

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    type: { type: String, required: true, enum: ['lost', 'found'] },
    category: { type: String, required: true, enum: ITEM_CATEGORIES },
    colour: { type: String, trim: true, maxlength: 50 },
    brand: { type: String, trim: true, maxlength: 80 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    date: { type: Date, required: true },
    images: { type: [String], default: [] },
    status: { type: String, enum: ITEM_STATUSES, default: 'pending' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    storageLocation: { type: String, trim: true, maxlength: 160 },
  },
  { timestamps: true },
);

itemSchema.index({ type: 1, status: 1, createdAt: -1 });
itemSchema.index({ category: 1, status: 1, createdAt: -1 });
itemSchema.index({ location: 1, status: 1 });
itemSchema.index({ reportedBy: 1, createdAt: -1 });
itemSchema.index({ title: 'text', description: 'text', category: 'text', brand: 'text', colour: 'text', location: 'text' });

const Item = mongoose.model('Item', itemSchema);

export default Item;
