import { Test, TestingModule } from '@nestjs/testing';
import { StarknetService } from '../starknet.service';

describe('StarknetService', () => {
  let service: StarknetService;

  //   Please Remove this line when you have the required data for your starknet connection
  beforeAll(() => {
    process.env.STARKNET_MOCK_MODE = 'true'; // force mock mode for tests
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StarknetService],
    }).compile();

    service = module.get<StarknetService>(StarknetService);
  });

  it('should mint NFT and return tx hash', async () => {
    const result = await service.mint('0x123', '1');
    expect(result).toHaveProperty('transaction_hash');
  });

  it('should get owner of a token', async () => {
    const owner = await service.getOwnerOf('1');
    expect(owner).toBeDefined();
  });
});
