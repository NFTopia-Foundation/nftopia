import express from 'express';
import routes from './routes';
import config from './config/env';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes);

// Use default export
export default app;
