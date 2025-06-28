import express from 'express';
import routes from './routes';
import config from './config/env';
import emailRoutes from './routes/email.routes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes);
app.use('/api/v1/email', emailRoutes);

// Use default export
export default app;
