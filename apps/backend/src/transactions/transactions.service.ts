import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NFTStorage } from 'nft.storage';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { NFT } from '../nfts/entities/nft.entity';

@Injectable()
export class TransactionsService {
  private nftStorage: NFTStorage;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
  ) {
    this.nftStorage = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
  }

  async createTransaction(
    buyer: User,
    seller: User,
    nft: NFT,
    amount: number,
    transactionHash?: string,
  ) {
    // Update NFT ownership
    nft.owner = buyer;
    nft.isListed = false;
    await this.nftRepository.save(nft);

    // Update metadata on IPFS
    const updatedMetadata = {
      ...nft.metadata,
      owner: buyer.walletAddress,
      salePrice: amount,
      soldAt: new Date().toISOString(),
    };

    const metadataBlob = new Blob([JSON.stringify(updatedMetadata)], {
      type: 'application/json',
    });
    const ipfsResult = await this.nftStorage.storeBlob(metadataBlob);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      buyer,
      seller,
      nft,
      amount,
      ipfsMetadataHash: ipfsResult,
      transactionHash,
    });

    return this.transactionRepository.save(transaction);
  }

  async getUserTransactions(userId: string) {
    return this.transactionRepository.find({
      where: [{ buyer: { id: userId } }, { seller: { id: userId } }],
      relations: ['buyer', 'seller', 'nft'],
      order: { createdAt: 'DESC' },
    });
  }
}
