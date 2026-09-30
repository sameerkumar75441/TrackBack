import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

ratingSchema.index({ user: 1, claim: 1 }, { unique: true });
ratingSchema.index({ item: 1, createdAt: -1 });

export default mongoose.model('Rating', ratingSchema);
