import 'dotenv/config';
import mongoose from 'mongoose';
import connectDatabase from '../backend/src/config/db.js';
import Item from '../backend/src/models/Item.js';
import Claim from '../backend/src/models/Claim.js';
import CustodyEvent from '../backend/src/models/CustodyEvent.js';
import User from '../backend/src/models/User.js';
import Notification from '../backend/src/models/Notification.js';
import Rating from '../backend/src/models/Rating.js';

const createIndexes = async () => {
  await connectDatabase();
  await Promise.all([User.createIndexes(), Item.createIndexes(), Claim.createIndexes(), CustodyEvent.createIndexes(), Notification.createIndexes(), Rating.createIndexes()]);
  console.log('TrackBack MongoDB indexes are ready.');
  await mongoose.disconnect();
};

createIndexes().catch(async (error) => {
  console.error(`Index setup failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
