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
