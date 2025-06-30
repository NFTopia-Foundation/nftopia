import express from 'express';
import routes from './routes';
import config from './config/env';
import { connectWithRetry, setupGracefulShutdown, checkDatabaseHealth } from './config/database';

const app = express();

// Setup graceful shutdown
setupGracefulShutdown();

// Middleware
app.use(express.json());

// Base routes
app.use('/api', routes);

// Conditionally load email routes if SendGrid is configured
try {
  const emailRoutes = require('./routes/email.routes').default;
  app.use('/api/v1/email', emailRoutes);
  console.log('Email routes loaded successfully');
} catch (error) {
  console.log('Email routes not loaded - SendGrid not configured');
}

// Conditionally load SMS routes if Twilio is configured
try {
  const smsRoutes = require('./routes/sms.routes').default;
  app.use('/api/v1/sms', smsRoutes);
  console.log('SMS routes loaded successfully');
} catch (error) {
  console.log('SMS routes not loaded - Twilio not configured');
}

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = checkDatabaseHealth() ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'nftopia-notification-service',
    environment: config.NODE_ENV,
    database: dbStatus,
    features: {
      email: process.env.SENDGRID_API_KEY ? 'enabled' : 'disabled',
      sms: process.env.TWILIO_ACCOUNT_SID ? 'enabled' : 'disabled',
      notifications: 'ready'
    }
  });
});

// Notification schema test endpoint
app.get('/api/notifications/test', (req, res) => {
  res.status(200).json({
    message: 'Notification schema is ready',
    schema: {
      requiredFields: ['userId', 'type', 'content', 'channels'],
      types: ['mint', 'bid', 'sale', 'auction', 'admin'],
      channels: ['email', 'sms', 'push', 'in-app'],
      statuses: ['pending', 'sent', 'failed', 'read']
    },
    database: checkDatabaseHealth() ? 'connected' : 'disconnected'
  });
});

// Use default export
export default app;
