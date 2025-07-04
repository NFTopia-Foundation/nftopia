import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import config from './config/env';
import { connectWithRetry } from './config/database';



connectWithRetry(config.MONGO_URI).then(() => {
  app.listen(config.PORT, () => {
    console.log(`Notification service running on port ${config.PORT}`);
  });
});

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectWithRetry(config.MONGO_URI, {
      retryAttempts: 5,
      retryDelay: 3000
    });
    
    // Start the server
    app.listen(config.PORT, () => {
      console.log(`Notification service running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Database: ${config.MONGO_URI}`);
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
};

startServer();
