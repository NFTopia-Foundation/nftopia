import mongoose from 'mongoose';
import { retryOptions } from '../config/database';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function connectWithRetry(): Promise<void> {
  let attempt = 0;
  let delayTime = retryOptions.initialDelay;

  while (attempt < retryOptions.maxRetries) {
    attempt++;
    console.log(` MongoDB connection attempt ${attempt} of ${retryOptions.maxRetries}`);

    try {
      await mongoose.connect(process.env.MONGO_URI! ,  {
  serverSelectionTimeoutMS: 2000, 
});

      console.log(' MongoDB connected successfully');
      return;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.code || 'NO_CODE';

      console.error(` Connection attempt ${attempt} failed [${errorCode}]: ${errorMessage}`);

      if (attempt >= retryOptions.maxRetries) {
        console.error(' Retry limit reached. MongoDB connection failed. Exiting...');
        process.exit(1);
      }

      console.log(` Retrying in ${delayTime} ms...`);
      await delay(delayTime);
      delayTime = Math.min(delayTime * 2, retryOptions.maxDelay);
    }
  }
}
