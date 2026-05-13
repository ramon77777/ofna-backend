import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductAvailability } from '../../common/enums/product-availability.enum';
import { OrderEntity } from '../orders/entities/order.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';

export interface ProductPhotoFiles {
  mainPhoto?: Express.Multer.File;
  secondaryPhoto?: Express.Multer.File;
}

export interface DeleteProductResult {
  message: string;
  productId: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
  ) {}

  async createProduct(
    partnerUserId: string,
    dto: CreateProductDto,
    photos?: ProductPhotoFiles,
  ): Promise<ProductEntity> {
    const partnerProfile = await this.getPartnerProfileByUserId(partnerUserId);

    const price = Number(dto.price);

    if (Number.isNaN(price) || price <= 0) {
      throw new BadRequestException('Prix produit invalide.');
    }

    const mainPhotoUrl = photos?.mainPhoto
      ? `/uploads/products/${photos.mainPhoto.filename}`
      : null;

    const secondaryPhotoUrl = photos?.secondaryPhoto
      ? `/uploads/products/${photos.secondaryPhoto.filename}`
      : null;

    const product = this.productsRepository.create({
      partnerProfile,
      name: dto.name.trim(),
      category: dto.category,
      description: dto.description?.trim() || null,
      price: price.toFixed(2),
      mainPhotoUrl,
      secondaryPhotoUrl,
      availability: dto.availability ?? ProductAvailability.DISPONIBLE,
      isActive: true,
    });

    await this.productsRepository.save(product);

    return this.getProductById(product.id);
  }

  async getActiveProducts(): Promise<ProductEntity[]> {
    return this.productsRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getMyProducts(partnerUserId: string): Promise<ProductEntity[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.partnerProfile', 'partnerProfile')
      .leftJoinAndSelect('partnerProfile.user', 'partnerUser')
      .where('partnerUser.id = :partnerUserId', { partnerUserId })
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  async getProductById(productId: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
      },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(
    partnerUserId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductEntity> {
    const product = await this.getOwnedProduct(partnerUserId, productId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException('Le nom du produit est obligatoire.');
      }

      product.name = name;
    }

    if (dto.category !== undefined) {
      product.category = dto.category;
    }

    if (dto.description !== undefined) {
      product.description = dto.description.trim() || null;
    }

    if (dto.price !== undefined) {
      const price = Number(dto.price);

      if (Number.isNaN(price) || price <= 0) {
        throw new BadRequestException('Prix produit invalide.');
      }

      product.price = price.toFixed(2);
    }

    if (dto.availability !== undefined) {
      product.availability = dto.availability;
    }

    await this.productsRepository.save(product);

    return this.getProductById(product.id);
  }

  async deleteProduct(
    partnerUserId: string,
    productId: string,
  ): Promise<DeleteProductResult> {
    const product = await this.getOwnedProduct(partnerUserId, productId);

    const ordersCount = await this.ordersRepository
      .createQueryBuilder('orderEntity')
      .innerJoin('orderEntity.product', 'product')
      .where('product.id = :productId', { productId })
      .getCount();

    if (ordersCount > 0) {
      throw new ConflictException(
        'Ce produit ne peut pas être supprimé car il est déjà lié à une commande. Retirez-le plutôt de la boutique.',
      );
    }

    await this.productsRepository.remove(product);

    return {
      message: 'Produit supprimé avec succès.',
      productId,
    };
  }

  async toggleProductVisibility(
    partnerUserId: string,
    productId: string,
  ): Promise<ProductEntity> {
    const product = await this.getOwnedProduct(partnerUserId, productId);

    product.isActive = !product.isActive;

    await this.productsRepository.save(product);

    return this.getProductById(product.id);
  }

  async deactivateProduct(
    partnerUserId: string,
    productId: string,
  ): Promise<ProductEntity> {
    const product = await this.getOwnedProduct(partnerUserId, productId);

    product.isActive = false;

    await this.productsRepository.save(product);

    return this.getProductById(product.id);
  }

  async reactivateProduct(
    partnerUserId: string,
    productId: string,
  ): Promise<ProductEntity> {
    const product = await this.getOwnedProduct(partnerUserId, productId);

    product.isActive = true;

    await this.productsRepository.save(product);

    return this.getProductById(product.id);
  }

  private async getOwnedProduct(
    partnerUserId: string,
    productId: string,
  ): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
      },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.partnerProfile.user.id !== partnerUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres produits.',
      );
    }

    return product;
  }

  private async getPartnerProfileByUserId(
    partnerUserId: string,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: partnerUserId },
      },
      relations: {
        user: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return partnerProfile;
  }
}
