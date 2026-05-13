import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MissionStatus } from '../../common/enums/mission-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ReviewType } from '../../common/enums/review-type.enum';
import { MissionEntity } from '../missions/entities/mission.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateMissionReviewDto } from './dto/create-mission-review.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import { ReviewEntity } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepository: Repository<ReviewEntity>,

    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,

    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async createMissionReview(
    clientUserId: string,
    missionId: string,
    dto: CreateMissionReviewDto,
  ): Promise<ReviewEntity> {
    const mission = await this.missionsRepository.findOne({
      where: {
        id: missionId,
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.client.id !== clientUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez noter que vos propres missions.',
      );
    }

    if (mission.missionStatus !== MissionStatus.TERMINEE) {
      throw new BadRequestException(
        'Vous ne pouvez noter une mission que lorsqu’elle est terminée.',
      );
    }

    if (!mission.partnerProfile) {
      throw new BadRequestException(
        'Cette mission n’a pas de partenaire à noter.',
      );
    }

    const existingReview = await this.reviewsRepository.findOne({
      where: {
        mission: {
          id: mission.id,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('Cette mission a déjà été notée.');
    }

    const client = await this.getClientOrFail(clientUserId);

    const review = this.reviewsRepository.create({
      client,
      partnerProfile: mission.partnerProfile,
      mission,
      order: null,
      reviewType: ReviewType.MISSION,
      rating: dto.rating,
      comment: dto.comment?.trim() ? dto.comment.trim() : null,
      publishedAt: new Date(),
    });

    const savedReview = await this.reviewsRepository.save(review);

    await this.refreshPartnerRating(mission.partnerProfile.id);

    return this.getReviewById(savedReview.id);
  }

  async createOrderReview(
    clientUserId: string,
    orderId: string,
    dto: CreateOrderReviewDto,
  ): Promise<ReviewEntity> {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
        },
        product: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.client.id !== clientUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez noter que vos propres commandes.',
      );
    }

    if (order.orderStatus !== OrderStatus.TERMINEE) {
      throw new BadRequestException(
        'Vous ne pouvez noter une commande que lorsqu’elle est terminée.',
      );
    }

    if (!order.partnerProfile) {
      throw new BadRequestException(
        'Cette commande n’a pas de partenaire à noter.',
      );
    }

    const existingReview = await this.reviewsRepository.findOne({
      where: {
        order: {
          id: order.id,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('Cette commande a déjà été notée.');
    }

    const client = await this.getClientOrFail(clientUserId);

    const review = this.reviewsRepository.create({
      client,
      partnerProfile: order.partnerProfile,
      mission: null,
      order,
      reviewType: ReviewType.ORDER,
      rating: dto.rating,
      comment: dto.comment?.trim() ? dto.comment.trim() : null,
      publishedAt: new Date(),
    });

    const savedReview = await this.reviewsRepository.save(review);

    await this.refreshPartnerRating(order.partnerProfile.id);

    return this.getReviewById(savedReview.id);
  }

  async getMyMissionReview(
    clientUserId: string,
    missionId: string,
  ): Promise<ReviewEntity | null> {
    return this.reviewsRepository.findOne({
      where: {
        mission: {
          id: missionId,
        },
        client: {
          id: clientUserId,
        },
      },
      relations: {
        mission: true,
        order: {
          product: true,
        },
        client: true,
        partnerProfile: {
          user: true,
        },
      },
    });
  }

  async getMyOrderReview(
    clientUserId: string,
    orderId: string,
  ): Promise<ReviewEntity | null> {
    return this.reviewsRepository.findOne({
      where: {
        order: {
          id: orderId,
        },
        client: {
          id: clientUserId,
        },
      },
      relations: {
        mission: true,
        order: {
          product: true,
        },
        client: true,
        partnerProfile: {
          user: true,
        },
      },
    });
  }

  async getPartnerReviews(partnerProfileId: string): Promise<ReviewEntity[]> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        id: partnerProfileId,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return this.reviewsRepository.find({
      where: {
        partnerProfile: {
          id: partnerProfileId,
        },
      },
      relations: {
        mission: true,
        order: {
          product: true,
        },
        client: true,
        partnerProfile: {
          user: true,
        },
      },
      order: {
        publishedAt: 'DESC',
      },
    });
  }

  async getAllReviewsForAdmin(): Promise<ReviewEntity[]> {
    return this.reviewsRepository.find({
      relations: {
        mission: true,
        order: {
          product: true,
        },
        client: true,
        partnerProfile: {
          user: true,
        },
      },
      order: {
        publishedAt: 'DESC',
      },
    });
  }

  private async getClientOrFail(clientUserId: string): Promise<UserEntity> {
    const client = await this.usersRepository.findOne({
      where: {
        id: clientUserId,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  private async getReviewById(reviewId: string): Promise<ReviewEntity> {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
      },
      relations: {
        mission: true,
        order: {
          product: true,
        },
        client: true,
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private async refreshPartnerRating(partnerProfileId: string): Promise<void> {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'reviewsCount')
      .addSelect('AVG(review.rating)', 'averageRating')
      .where('review.partner_profile_id = :partnerProfileId', {
        partnerProfileId,
      })
      .getRawOne<{
        reviewsCount: string;
        averageRating: string | null;
      }>();

    const reviewsCount = Number(result?.reviewsCount ?? 0);
    const averageRating = Number(result?.averageRating ?? 0);

    await this.partnerProfilesRepository.update(
      {
        id: partnerProfileId,
      },
      {
        reviewsCount,
        averageRating: averageRating.toFixed(2),
      },
    );
  }
}
