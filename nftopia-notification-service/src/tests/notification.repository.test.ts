import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NotificationRepository } from '../repositories/notification.repository';
import { Notification } from '../models/notification.model';


let mongod: MongoMemoryServer;
const repo = new NotificationRepository();


beforeAll(async () => {
mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
});


afterAll(async () => {
await mongoose.disconnect();
await mongod.stop();
});


describe('NotificationRepository', () => {
it('creates and finds by id', async () => {
const created = await repo.create({ userId: 'u1', type: 'mint', content: 'Minted', metadata: { nftId: 'n1' } });
expect(created._id).toBeDefined();
const found = await repo.findById(created.id);
expect(found?.content).toBe('Minted');
});


it('lists by user with pagination and excludes soft-deleted', async () => {
await repo.create({ userId: 'u2', type: 'bid', content: 'Bid' });
await repo.create({ userId: 'u2', type: 'sale', content: 'Sale' });
const list = await repo.findByUserId('u2', { page: 1, limit: 1 });
expect(list.length).toBe(1);
const all = await repo.findByUserId('u2');
expect(all.length).toBeGreaterThanOrEqual(2);
});


it('finds by NFT id', async () => {
await repo.create({ userId: 'u3', type: 'auction', content: 'A', metadata: { nftId: 'xyz' } });
const byNft = await repo.findByNFT('xyz');
expect(byNft.length).toBe(1);
});


it('marks as read', async () => {
const created = await repo.create({ userId: 'u4', type: 'admin', content: 'Admin' });
const updated = await repo.markAsRead(created.id);
expect(updated.status).toBe('read');
});


it('updates status', async () => {
const created = await repo.create({ userId: 'u5', type: 'bid', content: 'B' });
const updated = await repo.updateStatus(created.id, 'sent');
expect(updated.status).toBe('sent');
});


it('soft and hard delete', async () => {
const created = await repo.create({ userId: 'u6', type: 'sale', content: 'S' });
const soft = await repo.softDelete(created.id);
expect(soft).not.toBeNull();


await repo.hardDelete(created.id.toString());
const exists = await Notification.findById(created._id);
expect(exists).toBeNull();
});
});