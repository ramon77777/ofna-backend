import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreateWalletRechargeDto } from './dto/create-wallet-recharge.dto';
import { UpdateWalletRechargeStatusDto } from './dto/update-wallet-recharge-status.dto';
import { WalletRechargeEntity } from './entities/wallet-recharge.entity';
import { WalletRechargesService } from './wallet-recharges.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet-recharges')
export class WalletRechargesController {
  constructor(
    private readonly walletRechargesService: WalletRechargesService,
  ) {}

  @Post()
  @Roles(UserRole.PARTNER)
  async createRecharge(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreateWalletRechargeDto,
  ): Promise<WalletRechargeEntity> {
    return this.walletRechargesService.createRecharge(currentUser.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.PARTNER)
  async getMyRecharges(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletRechargeEntity[]> {
    return this.walletRechargesService.getMyRecharges(currentUser.sub);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  async getAllRechargesForAdmin(): Promise<WalletRechargeEntity[]> {
    return this.walletRechargesService.getAllRechargesForAdmin();
  }

  @Patch('admin/:rechargeId/status')
  @Roles(UserRole.ADMIN)
  async updateRechargeStatusAsAdmin(
    @Param('rechargeId') rechargeId: string,
    @Body() dto: UpdateWalletRechargeStatusDto,
  ): Promise<WalletRechargeEntity> {
    return this.walletRechargesService.updateRechargeStatusAsAdmin(
      rechargeId,
      dto,
    );
  }

  @Get(':rechargeId')
  @Roles(UserRole.PARTNER)
  async getRechargeById(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('rechargeId') rechargeId: string,
  ): Promise<WalletRechargeEntity> {
    return this.walletRechargesService.getRechargeById(
      currentUser.sub,
      rechargeId,
    );
  }
}
