import { Request, Response } from 'express';


export const openapiJson = (_req: Request, res: Response) => {
const doc = {
openapi: '3.0.3',
info: { title: 'NFTOPIA Notification Service', version: '1.0.0' },
paths: {
'/api/notifications': {
post: {
summary: 'Create notification',
requestBody: {
required: true,
content: {
'application/json': {
schema: {
type: 'object',
properties: {
userId: { type: 'string' },
type: { type: 'string', enum: ['mint', 'bid', 'sale', 'auction', 'admin'] },
content: { type: 'string' },
channels: { type: 'array', items: { type: 'string', enum: ['email', 'sms', 'push', 'in-app'] } },
metadata: {
type: 'object',
properties: { nftId: { type: 'string' }, collection: { type: 'string' }, txHash: { type: 'string' } }
}
},
required: ['userId', 'type', 'content']
}
}
}
},
responses: { '201': { description: 'Created' } }
}
},
'/api/notifications/{id}': {
get: { summary: 'Get by id', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } } },
delete: { summary: 'Soft delete', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } } }
},
'/api/notifications/{id}/hard': {
delete: { summary: 'Hard delete', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'No Content' }, '404': { description: 'Not Found' } } }
},
'/api/notifications/{id}/read': {
patch: { summary: 'Mark as read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }
},
'/api/notifications/{id}/status': {
patch: {
summary: 'Update status',
parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['sent', 'failed'] } }, required: ['status'] } } } },
responses: { '200': { description: 'OK' } }
}
},
'/api/notifications/user/{userId}': {
get: { summary: 'List by user', parameters: [
{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }
], responses: { '200': { description: 'OK' } } }
},
'/api/notifications/nft/{nftId}': {
get: { summary: 'List by NFT id', parameters: [{ name: 'nftId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }
}
}
};


res.json(doc);
};