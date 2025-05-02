// bid/dto/create-bid.dto.ts
import { IsUUID, IsNumber } from 'class-validator';

export class CreateBidDto {
  @IsUUID()
  auctionId: string;

  @IsNumber()
  amount: number;
}


// bid/dto/bid-response.dto.ts
export class BidResponseDto {
    id: string;
    auctionId: string;
    bidderId: string;
    amount: number;
    createdAt: string;
  }
  