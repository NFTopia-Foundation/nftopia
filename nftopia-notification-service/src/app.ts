import express from 'express';
import routes from './routes';
import config from './config/env';
import emailRoutes from './routes/email.routes';
import smsRoutes from './routes/sms.routes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/sms', smsRoutes);

// Use default export
export default app;
