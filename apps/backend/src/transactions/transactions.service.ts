import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { NFT } from '../nfts/entities/nft.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
  ) {}

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    const { buyerId, sellerId, nftId, auctionId, amount } = createTransactionDto;

    const [buyer, seller, nft, auction] = await Promise.all([
      this.userRepository.findOne({ where: { id: buyerId } }),
      this.userRepository.findOne({ where: { id: sellerId } }),
      this.nftRepository.findOne({ where: { id: nftId } }),
      this.auctionRepository.findOne({ where: { id: auctionId } }),
    ]);

    if (!buyer || !seller || !nft || !auction) {
      throw new NotFoundException('One or more required entities not found');
    }

    // Update NFT ownership
    nft.owner = buyer;
    nft.isListed = false;
    await this.nftRepository.save(nft);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      buyer,
      seller,
      nft,
      auction,
      amount,
      status: 'pending',
    });

    return this.transactionRepository.save(transaction);
  }

  async getUserTransactions(userId: string) {
    return this.transactionRepository.find({
      where: [{ buyer: { id: userId } }, { seller: { id: userId } }],
      relations: ['buyer', 'seller', 'nft', 'auction'],
      order: { timestamp: 'DESC' },
    });
  }

  async updateTransactionStatus(id: string, status: 'completed' | 'failed', transactionHash?: string) {
    const transaction = await this.transactionRepository.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = status;
    if (transactionHash) {
      transaction.transactionHash = transactionHash;
    }

    return this.transactionRepository.save(transaction);
  }
}
