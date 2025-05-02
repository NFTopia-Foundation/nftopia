import { Test, TestingModule } from '@nestjs/testing';
<<<<<<< HEAD
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { NFT } from '../nfts/entities/nft.entity';
import { User } from '../users/entities/user.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: Repository<Transaction>;
  let nftRepository: Repository<NFT>;

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockNFTRepository = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(NFT),
          useValue: mockNFTRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    nftRepository = module.get<Repository<NFT>>(getRepositoryToken(NFT));
=======
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionsService],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
>>>>>>> upstream/main
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
<<<<<<< HEAD

  describe('createTransaction', () => {
    it('should create a new transaction and update NFT ownership', async () => {
      const buyer = { id: '1', walletAddress: '0x123' } as User;
      const seller = { id: '2', walletAddress: '0x456' } as User;
      const nft = { id: '1', metadata: {} } as NFT;
      const amount = 1.5;
      const transactionHash = '0xabc';

      mockNFTRepository.save.mockResolvedValue({ ...nft, owner: buyer });
      mockTransactionRepository.create.mockReturnValue({
        buyer,
        seller,
        nft,
        amount,
        transactionHash,
      });
      mockTransactionRepository.save.mockResolvedValue({
        id: '1',
        buyer,
        seller,
        nft,
        amount,
        transactionHash,
      });

      const result = await service.createTransaction(
        buyer,
        seller,
        nft,
        amount,
        transactionHash,
      );

      expect(result).toBeDefined();
      expect(nftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: buyer,
          isListed: false,
        }),
      );
      expect(transactionRepository.create).toHaveBeenCalled();
      expect(transactionRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      const userId = '1';
      const transactions = [
        { id: '1', buyer: { id: userId } },
        { id: '2', seller: { id: userId } },
      ];

      mockTransactionRepository.find.mockResolvedValue(transactions);

      const result = await service.getUserTransactions(userId);

      expect(result).toEqual(transactions);
      expect(transactionRepository.find).toHaveBeenCalledWith({
        where: [
          { buyer: { id: userId } },
          { seller: { id: userId } },
        ],
        relations: ['buyer', 'seller', 'nft'],
        order: { createdAt: 'DESC' },
      });
    });
  });
=======
>>>>>>> upstream/main
});
