import dotenv from 'dotenv';
dotenv.config();

export default {
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development',
  emailRetry: {
    maxAttempts: parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS || '3', 10),
    delays: [
      parseInt(process.env.EMAIL_RETRY_DELAY_1 || '300000', 10),    // 5 minutes
      parseInt(process.env.EMAIL_RETRY_DELAY_2 || '1800000', 10),   // 30 minutes
      parseInt(process.env.EMAIL_RETRY_DELAY_3 || '3600000', 10)    // 1 hour
    ],
    suppressionDuration: parseInt(process.env.EMAIL_SUPPRESSION_DURATION || '86400000', 10) // 24 hours
  }
};