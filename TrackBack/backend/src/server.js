import 'dotenv/config';
import app from './app.js';
import connectDatabase from './config/db.js';

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to start the server.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN is required in production.');
  }

  await connectDatabase();
  app.listen(port, () => {
    console.log(`TrackBack API listening on port ${port}.`);
  });
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
