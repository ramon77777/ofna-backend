import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { RechargeMode } from '../../../common/enums/recharge-mode.enum';

export class CreateWalletRechargeDto {
  @IsNumberString()
  amount!: string;

  @IsEnum(RechargeMode)
  rechargeMode!: RechargeMode;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  transactionReference?: string;
}
