import { IsNotEmpty, IsNotBlank, IsPositive, IsEnum, ValidateNested, IsArray, IsString, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '../enums/transaction-status.enum';

export class StarknetEventLog {
  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  data: Record<string, string>;
}

export class StarknetTransactionEvent {
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsDateString()
  blockTimestamp: string;

  @IsPositive()
  blockNumber: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StarknetEventLog)
  logs: StarknetEventLog[];
}
