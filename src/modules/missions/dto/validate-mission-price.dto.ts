import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { PaymentMode } from '../../../common/enums/payment-mode.enum';

export class ValidateMissionPriceDto {
  @IsNumberString()
  validatedAmount!: string;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  comment?: string;
}