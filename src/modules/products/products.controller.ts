import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import {
  DeleteProductResult,
  ProductPhotoFiles,
  ProductsService,
} from './products.service';

const productUploadsDir = join(process.cwd(), 'uploads', 'products');

if (!existsSync(productUploadsDir)) {
  mkdirSync(productUploadsDir, { recursive: true });
}

function editFileName(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const fileExtName = extname(file.originalname);
  const randomName = Array.from({ length: 24 })
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');

  callback(null, `product-${Date.now()}-${randomName}${fileExtName}`);
}

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)$/)) {
    return callback(
      new Error('Seuls les fichiers image JPG, PNG ou WEBP sont autorisés.'),
      false,
    );
  }

  callback(null, true);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get()
  async getProducts(): Promise<ProductEntity[]> {
    return this.productsService.getActiveProducts();
  }

  @Roles(UserRole.PARTNER)
  @Get('me')
  async getMyProducts(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<ProductEntity[]> {
    return this.productsService.getMyProducts(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':productId/toggle-visibility')
  async toggleProductVisibility(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('productId') productId: string,
  ): Promise<ProductEntity> {
    return this.productsService.toggleProductVisibility(
      currentUser.sub,
      productId,
    );
  }

  @Roles(UserRole.PARTNER)
  @Patch(':productId/deactivate')
  async deactivateProduct(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('productId') productId: string,
  ): Promise<ProductEntity> {
    return this.productsService.deactivateProduct(currentUser.sub, productId);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':productId/reactivate')
  async reactivateProduct(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('productId') productId: string,
  ): Promise<ProductEntity> {
    return this.productsService.reactivateProduct(currentUser.sub, productId);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':productId')
  async updateProduct(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductEntity> {
    return this.productsService.updateProduct(currentUser.sub, productId, dto);
  }

  @Roles(UserRole.PARTNER)
  @Delete(':productId')
  async deleteProduct(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('productId') productId: string,
  ): Promise<DeleteProductResult> {
    return this.productsService.deleteProduct(currentUser.sub, productId);
  }

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get(':productId')
  async getProductById(
    @Param('productId') productId: string,
  ): Promise<ProductEntity> {
    return this.productsService.getProductById(productId);
  }

  @Roles(UserRole.PARTNER)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'mainPhoto', maxCount: 1 },
        { name: 'secondaryPhoto', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: productUploadsDir,
          filename: editFileName,
        }),
        fileFilter: imageFileFilter,
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
      },
    ),
  )
  async createProduct(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files?: {
      mainPhoto?: Express.Multer.File[];
      secondaryPhoto?: Express.Multer.File[];
    },
  ): Promise<ProductEntity> {
    const photos: ProductPhotoFiles = {
      mainPhoto: files?.mainPhoto?.[0],
      secondaryPhoto: files?.secondaryPhoto?.[0],
    };

    return this.productsService.createProduct(currentUser.sub, dto, photos);
  }
}
