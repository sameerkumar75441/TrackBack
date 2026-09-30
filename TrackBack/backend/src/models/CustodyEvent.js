import mongoose from 'mongoose';

const custodyEventSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
  eventType: { type: String, enum: ['found', 'stored', 'claim_requested', 'verified', 'handover_completed'], required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

custodyEventSchema.index({ item: 1, timestamp: -1 });
custodyEventSchema.index({ claim: 1, timestamp: -1 });

const CustodyEvent = mongoose.model('CustodyEvent', custodyEventSchema);
export default CustodyEvent;
