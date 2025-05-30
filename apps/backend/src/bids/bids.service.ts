import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from './entities/bid.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { User } from '../users/entities/user.entity';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidResponseDto } from './dto/bid-response.dto';

@Injectable()
export class BidsService {
    placeBid: any;
    constructor(
        @InjectRepository(Bid)
        private bidRepository: Repository<Bid>,
        @InjectRepository(Auction)
        private auctionRepository: Repository<Auction>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async createBid(createBidDto: CreateBidDto, userId: string): Promise<BidResponseDto> {
        const { auctionId, amount } = createBidDto;

        // Find the auction
        const auction = await this.auctionRepository.findOne({
            where: { id: auctionId },
            relations: ['seller', 'bids', 'bids.bidder']
        });

        if (!auction) {
            throw new NotFoundException(`Auction with ID ${auctionId} not found`);
        }

        // Check if auction has ended - use endTime instead of endDate
        if (auction.endTime < new Date()) {
            throw new BadRequestException('This auction has already ended');
        }

        // Find the user
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Get highest bid
        const highestBid = await this.getHighestBid(auctionId);
        const startingPrice = 0; // Default starting price since it's not in our entity

        // Check if bid amount is valid
        if (highestBid && amount <= highestBid.amount) {
            throw new BadRequestException(`Bid amount must be greater than the current highest bid of ${highestBid.amount}`);
        } else if (!highestBid && amount < startingPrice) {
            throw new BadRequestException(`Bid amount must be at least the starting price of ${startingPrice}`);
        }

        // Create and save the bid
        const bid = this.bidRepository.create({
            amount,
            auction,
            bidder: user,
        });

        const savedBid = await this.bidRepository.save(bid);

        // Return the response DTO
        return this.mapBidToResponseDto(savedBid);
    }

    async getBidsByAuction(auctionId: string): Promise<BidResponseDto[]> {
        const auction = await this.auctionRepository.findOne({
            where: { id: auctionId }
        });

        if (!auction) {
            throw new NotFoundException(`Auction with ID ${auctionId} not found`);
        }

        const bids = await this.bidRepository.find({
            where: { auction: { id: auctionId } },
            relations: ['bidder', 'auction'],
            order: { amount: 'DESC' }
        });

        return bids.map(bid => this.mapBidToResponseDto(bid));
    }

    async getHighestBid(auctionId: string): Promise<Bid | null> {
        const auction = await this.auctionRepository.findOne({
            where: { id: auctionId }
        });

        if (!auction) {
            throw new NotFoundException(`Auction with ID ${auctionId} not found`);
        }

        const highestBid = await this.bidRepository.findOne({
            where: { auction: { id: auctionId } },
            relations: ['bidder', 'auction'],
            order: { amount: 'DESC' }
        });

        return highestBid || null;
    }

    private mapBidToResponseDto(bid: Bid): BidResponseDto {
        // Add null check to prevent TypeError
        if (!bid) {
            throw new Error('Cannot map undefined bid to response DTO');
        }

        return {
            id: bid.id,
            auctionId: bid.auction?.id,
            bidderId: bid.bidder?.id,
            amount: bid.amount,
            createdAt: bid.createdAt,
        };
    }
}