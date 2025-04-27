import { IsNotEmpty, IsString } from 'class-validator';

export class WalletLoginDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  signature: string;
}

export class NonceRequestDto {
  @IsNotEmpty()
  @IsString()
  address: string;
}