import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { TransactionStatus } from '../../../common/enums/transaction-status.enum';

export class UpdateWalletRechargeStatusDto {
  @IsEnum(TransactionStatus)
  transactionStatus!: TransactionStatus;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  transactionReference?: string;
}