import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { OrderStatus } from '../../../common/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  orderStatus!: OrderStatus;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}
