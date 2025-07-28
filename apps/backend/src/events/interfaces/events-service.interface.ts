
export interface IEventsService {
  create(eventData: {
    contractName: string;
    eventName: string;
    eventData: any;
    blockNumber: number;
    transactionHash: string;
    timestamp: Date;
  }): Promise<any>;

  findAll(filter?: any): Promise<any[]>;
  findOne(id: string): Promise<any>;
  update(id: string, updateData: any): Promise<any>;
  remove(id: string): Promise<void>;
}

export const EVENTS_SERVICE = 'EVENTS_SERVICE';

// Mock implementation for testing
export class MockEventsService implements IEventsService {
  async create(eventData: any): Promise<any> {
    return { id: 'event-123', ...eventData };
  }

  async findAll(filter?: any): Promise<any[]> {
    return [];
  }

  async findOne(id: string): Promise<any> {
    return { id, contractName: 'test' };
  }

  async update(id: string, updateData: any): Promise<any> {
    return { id, ...updateData };
  }

  async remove(id: string): Promise<void> {
    return;
  }
}
