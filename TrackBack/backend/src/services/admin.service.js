import Claim from '../models/Claim.js';
import Item from '../models/Item.js';

const totals = (rows) => Object.fromEntries(rows.map(({ _id, count }) => [_id, count]));

export const getAnalytics = async () => {
  const [itemStatus, itemTypes, claimStatus, handovers] = await Promise.all([
    Item.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Item.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Claim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Claim.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$handoverAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  return { itemStatus: totals(itemStatus), itemTypes: totals(itemTypes), claimStatus: totals(claimStatus), handoverTrend: handovers.map(({ _id, count }) => ({ month: _id, count })) };
};
