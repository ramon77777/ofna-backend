import { Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletSummary } from './interfaces/wallet-summary.interface';
import { WalletsService } from './wallets.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  async getMyWallet(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletEntity> {
    return this.walletsService.getMyWallet(currentUser.sub);
  }

  @Get('me/history')
  async getWalletHistory(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletTransactionEntity[]> {
    return this.walletsService.getWalletHistory(currentUser.sub);
  }

  @Get('me/summary')
  async getWalletSummary(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletSummary> {
    return this.walletsService.getWalletSummary(currentUser.sub);
  }

  @Patch('me/refresh-status')
  async refreshWalletStatus(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletEntity> {
    return this.walletsService.refreshWalletStatus(currentUser.sub);
  }
}
