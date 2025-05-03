import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidResponseDto } from './dto/bid-response.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('bids')
export class BidsController {
    constructor(private readonly bidsService: BidsService) { }

    @Post(':auctionId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createBid(
        @Param('auctionId') auctionId: string,
        @Body() createBidDto: CreateBidDto,
        @Request() req,
    ): Promise<BidResponseDto> {
        // Ensure auctionId in the DTO matches the one in the URL
        createBidDto.auctionId = auctionId;
        return this.bidsService.createBid(createBidDto, req.user.id);
    }

    @Get('auction/:auctionId')
    async getBidsByAuction(
        @Param('auctionId') auctionId: string,
    ): Promise<BidResponseDto[]> {
        return this.bidsService.getBidsByAuction(auctionId);
    }

    @Get('highest/:auctionId')
    async getHighestBid(
        @Param('auctionId') auctionId: string,
    ): Promise<BidResponseDto | null> {
        const highestBid = await this.bidsService.getHighestBid(auctionId);

        if (!highestBid) {
            return null;
        }

        // Map the Bid entity to BidResponseDto
        return {
            id: highestBid.id,
            auctionId: highestBid.auction.id,
            bidderId: highestBid.bidder.id,
            amount: highestBid.amount,
            createdAt: highestBid.createdAt,
        };
    }
}