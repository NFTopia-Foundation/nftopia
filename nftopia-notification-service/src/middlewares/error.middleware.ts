import { ErrorRequestHandler } from 'express';


export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
const status = (err.status || err.statusCode || 500) as number;
const message = err.message || 'Internal Server Error';
res.status(status).json({ error: { message, status } });
};