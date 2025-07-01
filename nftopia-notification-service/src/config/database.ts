import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
export const dbConfig = {
  uri: process.env.MONGO_URI || 'mongodb://localhost:27017/nftopia-notifications',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

// Retry configuration
export const retryOptions = {
  maxRetries: 5,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
};

// Connect to MongoDB with retry logic
export const connectWithRetry = async (): Promise<void> => {
  // In development mode, try to connect but don't fail if MongoDB is not available
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Development mode: Attempting MongoDB connection...');
  }

  let attempt = 1;
  
  while (attempt <= retryOptions.maxRetries) {
    try {
      console.log(`MongoDB connection attempt ${attempt} of ${retryOptions.maxRetries}`);
      
      await mongoose.connect(dbConfig.uri, dbConfig.options);
      
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (error: any) {
      const errorCode = error.code || 'UNKNOWN';
      const errorMessage = error.message || 'Unknown error';
      
      console.error(`Connection attempt ${attempt} failed [${errorCode}]: ${errorMessage}`);
      
      if (attempt === retryOptions.maxRetries) {
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️  Development mode: MongoDB connection failed');
          console.error('   The notification schema is ready but database operations will fail.');
          console.error('   To enable database features:');
          console.error('   1. Start MongoDB: docker run -d --name mongodb-nftopia -p 27017:27017 mongo:latest');
          console.error('   2. Or use MongoDB Atlas (cloud database)');
          return;
        } else {
          console.error('Retry limit reached. MongoDB connection failed. Exiting...');
          process.exit(1);
        }
      }
      
      // Calculate delay with exponential backoff
      const delay = retryOptions.retryDelay * Math.pow(retryOptions.backoffMultiplier, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

// Disconnect from MongoDB
export const disconnect = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected successfully');
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

// Health check function
export const checkDatabaseHealth = (): boolean => {
  const state = mongoose.connection.readyState;
  return state === 1; // 1 = connected
};

// Graceful shutdown handler
export const setupGracefulShutdown = (): void => {
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Closing database connection...');
    await disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Closing database connection...');
    await disconnect();
    process.exit(0);
  });
}; 