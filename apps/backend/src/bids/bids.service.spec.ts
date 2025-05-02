import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from './bids.service';

describe('BidsService', () => {
  let service: BidsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BidsService],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
