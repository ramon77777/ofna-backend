import { IsNumber, Max, Min } from 'class-validator';

export class UpdateOrderDeliveryFeeDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Les frais de livraison doivent être un nombre valide.' },
  )
  @Min(0, { message: 'Les frais de livraison ne peuvent pas être négatifs.' })
  @Max(500000, {
    message: 'Les frais de livraison semblent trop élevés.',
  })
  deliveryFee!: number;
}
