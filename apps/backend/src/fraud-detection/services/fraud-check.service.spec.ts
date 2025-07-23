import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FraudCheckService } from './fraud-check.service';
import { FraudRulesEngine } from './fraud-rules-engine.service';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { FraudCheck } from '../entities/fraud-check.entity';
import { FraudRiskLevel } from '../dto/fraud-check-result.dto';

describe('FraudCheckService', () => {
  let service: FraudCheckService;
  let mockTransactionRepo: any;
  let mockFraudCheckRepo: any;
  let mockRulesEngine: any;

  beforeEach(async () => {
    mockTransactionRepo = {
      find: jest.fn(),
      count: jest.fn(),
    };

    mockFraudCheckRepo = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    mockRulesEngine = {
      applyRules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudCheckService,
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepo },
        { provide: getRepositoryToken(FraudCheck), useValue: mockFraudCheckRepo },
        { provide: FraudRulesEngine, useValue: mockRulesEngine },
      ],
    }).compile();

    service = module.get<FraudCheckService>(FraudCheckService);
  });

  it('should evaluate transaction and return fraud result', async () => {
    const mockTransaction = {
      id: 'tx-123',
      buyer: { id: 'user-123' },
      amount: 100,
    } as Transaction;

    const mockContext = {
      deviceInfo: {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      },
    };

    const mockResult = {
      isSuspicious: true,
      riskLevel: FraudRiskLevel.HIGH,
      triggeredRules: ['velocity_check'],
      recommendation: 'REVIEW' as const,
      confidence: 0.7,
    };

    mockRulesEngine.applyRules.mockResolvedValue(mockResult);
    mockFraudCheckRepo.create.mockReturnValue({});
    mockFraudCheckRepo.save.mockResolvedValue({});

    const result = await service.evaluateTransaction(mockTransaction, mockContext);

    expect(result).toEqual(mockResult);
    expect(mockRulesEngine.applyRules).toHaveBeenCalledWith(mockTransaction, mockContext);
    expect(mockFraudCheckRepo.save).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockTransaction = { id: 'tx-123' } as Transaction;
    const mockContext = { deviceInfo: { userAgent: 'test', ipAddress: '127.0.0.1' } };

    mockRulesEngine.applyRules.mockRejectedValue(new Error('Test error'));

    const result = await service.evaluateTransaction(mockTransaction, mockContext);

    expect(result.recommendation).toBe('ALLOW');
    expect(result.isSuspicious).toBe(false);
  });
});