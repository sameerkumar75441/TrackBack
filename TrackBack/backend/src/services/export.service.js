import Claim from '../models/Claim.js';
import Item from '../models/Item.js';

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""').replaceAll('\n', ' ')}"`;
const line = (values) => `${values.map(escapeCsv).join(',')}\n`;

export const createAdminCsv = async () => {
  const [items, claims] = await Promise.all([
    Item.find({}).select('title type category location date status createdAt').lean(),
    Claim.find({}).select('item status pickupDate pickupSlot handoverAt createdAt').lean(),
  ]);
  let csv = line(['Record Type', 'Reference', 'Title / Item', 'Status', 'Category / Pickup Slot', 'Location / Date', 'Created At', 'Completed At']);
  items.forEach((item) => { csv += line(['Item', item._id, item.title, item.status, item.category, item.location, item.createdAt.toISOString(), '']); });
  claims.forEach((claim) => { csv += line(['Claim', claim._id, claim.item, claim.status, claim.pickupSlot, claim.pickupDate?.toISOString() || '', claim.createdAt.toISOString(), claim.handoverAt?.toISOString() || '']); });
  return csv;
};
