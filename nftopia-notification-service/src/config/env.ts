import dotenv from 'dotenv';
dotenv.config();


export default {
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/nftopia-notifications',
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'nftopia-notifications',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@nftopia.com'
};
