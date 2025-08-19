import { AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { BadRequest } from '../utils/httpErrors';


export const validateBody = (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
const result = schema.safeParse(req.body);
if (!result.success) return next(BadRequest(result.error.errors.map(e => e.message).join(', ')));
req.body = result.data;
next();
};