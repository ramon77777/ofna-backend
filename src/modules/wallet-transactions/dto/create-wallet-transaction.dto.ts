import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { WalletTransactionSource } from '../../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../../common/enums/wallet-transaction-type.enum';

export class CreateWalletTransactionDto {
  @IsUUID()
  walletId!: string;

  @IsEnum(WalletTransactionType)
  transactionType!: WalletTransactionType;

  @IsEnum(WalletTransactionSource)
  sourceType!: WalletTransactionSource;

  @IsNumberString()
  amount!: string;

  @IsNumberString()
  balanceBefore!: string;

  @IsNumberString()
  balanceAfter!: string;

  @IsOptional()
  @IsUUID()
  missionId?: string;

  @IsString()
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
