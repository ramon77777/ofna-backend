import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { ProductAvailability } from '../../../common/enums/product-availability.enum';
import { ProductCategory } from '../../../common/enums/product-category.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @IsNumberString()
  price!: string;

  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;
}
