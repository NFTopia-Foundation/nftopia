import { Request, Response, NextFunction } from 'express';


export const actorMiddleware = (req: Request, _res: Response, next: NextFunction) => {
const headerName = process.env.ACTOR_HEADER || 'X-User-Id';
// For internal calls from other microservices, propagate user id / service id here
(req as any).actorId = (req.headers[headerName.toLowerCase()] as string) || null;
next();
};