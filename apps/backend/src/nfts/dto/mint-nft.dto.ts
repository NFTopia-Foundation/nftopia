import { IsString, IsNumber, IsOptional } from 'class-validator';

export class MintNftDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
