import { z } from 'zod';


export const createNotificationSchema = z.object({
userId: z.string().min(1),
type: z.enum(['mint', 'bid', 'sale', 'auction', 'admin']),
content: z.string().min(1),
channels: z.array(z.enum(['email', 'sms', 'push', 'in-app'])).default(['in-app']).optional(),
metadata: z
.object({ nftId: z.string().optional(), collection: z.string().optional(), txHash: z.string().optional() })
.partial()
.optional()
});


export const updateStatusSchema = z.object({ status: z.enum(['sent', 'failed']) });


export const paginationSchema = z.object({ page: z.string().optional(), limit: z.string().optional() });