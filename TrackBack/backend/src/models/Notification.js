import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, trim: true, maxlength: 60 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
  read: { type: Boolean, default: false },
  dedupeKey: { type: String, trim: true, select: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.model('Notification', notificationSchema);
