import mongoose from 'mongoose';

const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required to start the server.');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected.');
  } catch {
    throw new Error('Unable to connect to MongoDB. Check MONGODB_URI and network access.');
  }
};

export default connectDatabase;
