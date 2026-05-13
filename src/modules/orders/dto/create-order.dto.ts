import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { PaymentMode } from '../../../common/enums/payment-mode.enum';

export class CreateOrderDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;
}
