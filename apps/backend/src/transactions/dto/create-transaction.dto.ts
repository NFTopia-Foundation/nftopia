import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { NFT } from '../../nfts/entities/nft.entity';

export class CreateTransactionDto {
  @IsNotEmpty()
  nft: NFT;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  transactionHash?: string;
}
