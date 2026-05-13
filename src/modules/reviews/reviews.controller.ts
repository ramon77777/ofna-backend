import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreateMissionReviewDto } from './dto/create-mission-review.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles(UserRole.CLIENT)
  @Post('missions/:missionId/review')
  async createMissionReview(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: CreateMissionReviewDto,
  ): Promise<ReviewEntity> {
    return this.reviewsService.createMissionReview(
      currentUser.sub,
      missionId,
      dto,
    );
  }

  @Roles(UserRole.CLIENT)
  @Get('missions/:missionId/review/me')
  async getMyMissionReview(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<ReviewEntity | null> {
    return this.reviewsService.getMyMissionReview(currentUser.sub, missionId);
  }

  @Roles(UserRole.CLIENT)
  @Post('orders/:orderId/review')
  async createOrderReview(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderReviewDto,
  ): Promise<ReviewEntity> {
    return this.reviewsService.createOrderReview(currentUser.sub, orderId, dto);
  }

  @Roles(UserRole.CLIENT)
  @Get('orders/:orderId/review/me')
  async getMyOrderReview(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
  ): Promise<ReviewEntity | null> {
    return this.reviewsService.getMyOrderReview(currentUser.sub, orderId);
  }

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get('partners/:partnerProfileId/reviews')
  async getPartnerReviews(
    @Param('partnerProfileId') partnerProfileId: string,
  ): Promise<ReviewEntity[]> {
    return this.reviewsService.getPartnerReviews(partnerProfileId);
  }
}
