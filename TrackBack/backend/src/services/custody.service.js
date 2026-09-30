import CustodyEvent from '../models/CustodyEvent.js';

export const recordCustodyEvent = (data) => CustodyEvent.create(data);

export const getCustodyHistory = async (itemId) => CustodyEvent.find({ item: itemId })
  .sort({ timestamp: 1 })
  .select('item claim eventType performedBy metadata timestamp');
