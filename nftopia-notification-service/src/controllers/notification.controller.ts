import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';


const svc = new NotificationService();


export class NotificationController {

    constructor() {}
static async create(req: Request, res: Response, next: NextFunction) {
try {
const result = await svc.create(req.body, (req as any).actorId || null);
res.status(201).json(result);
} catch (e) { next(e); }
}


static async getById(req: Request, res: Response, next: NextFunction): Promise<any> {
try {
const result = await svc.findById(req.params.id);
if (!result) return res.status(404).json({ error: { message: 'Not Found', status: 404 } });
res.json(result);
} catch (e) { next(e); }
}


static async listByUser(req: Request, res: Response, next: NextFunction) {
try {
const { page, limit } = req.query as any;
const out = await svc.findByUserId(req.params.userId, {
page: page ? Number(page) : undefined,
limit: limit ? Number(limit) : undefined
});
res.json(out);
} catch (e) { next(e); }
}


static async listByNFT(req: Request, res: Response, next: NextFunction) {
try {
const out = await svc.findByNFT(req.params.nftId);
res.json(out);
} catch (e) { next(e); }
}


static async markAsRead(req: Request, res: Response, next: NextFunction) {
try {
const result = await svc.markAsRead(req.params.id, (req as any).actorId || null);
res.json(result);
} catch (e) { next(e); }
}


static async updateStatus(req: Request, res: Response, next: NextFunction) {
try {
const result = await svc.updateStatus(req.params.id, req.body.status, (req as any).actorId || null);
res.json(result);
} catch (e) { next(e); }
}


static async softDelete(req: Request, res: Response, next: NextFunction) {
try {
const result = await svc.softDelete(req.params.id, (req as any).actorId || null);
res.json(result);
} catch (e) { next(e); }
}


static async hardDelete(req: Request, res: Response, next: NextFunction) {
try {
await svc.hardDelete(req.params.id, (req as any).actorId || null);
res.status(204).send();
} catch (e) { next(e); }
}
}