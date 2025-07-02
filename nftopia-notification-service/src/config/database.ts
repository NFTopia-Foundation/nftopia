import mongoose from 'mongoose';

const retryOptions = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 10000,
};

export const connectWithRetry = async (
  uri: string,
  options: mongoose.ConnectOptions = {}
) => {
  let attempts = 1;

  const connect = async () => {
    try {
      console.log(`\n Attempt ${attempts } to connect to MongoDB \n`);
      await mongoose.connect(uri, options);
    } catch (error: any) {
      const errorType = error.name || '';

      if (errorType === 'MongooseServerSelectionError' && attempts < retryOptions.maxRetries) {
        const delay = Math.min(
          retryOptions.initialDelay * Math.pow(2, attempts),
          retryOptions.maxDelay
        );
        console.warn(
          `MongoDB connection failed (${errorType}). Retrying in ${delay}ms... [Attempt ${attempts + 1}/${retryOptions.maxRetries}]`
        );
        attempts++;
        await new Promise((res) => setTimeout(res, delay));
        return connect();
      } else {
        console.error(`MongoDB connection failed permanently after ${attempts} retries:`, error);
        process.exit(1);
      }
    }
  };

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection event: connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection event: error', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection event: disconnected');
  });

  await connect();
};
