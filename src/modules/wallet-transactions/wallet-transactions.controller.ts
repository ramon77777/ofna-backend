import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletTransactionsService } from './wallet-transactions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('wallet-transactions')
export class WalletTransactionsController {
  constructor(
    private readonly walletTransactionsService: WalletTransactionsService,
  ) {}

  @Get('me')
  async getMyWalletTransactions(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<WalletTransactionEntity[]> {
    return this.walletTransactionsService.getMyWalletTransactions(
      currentUser.sub,
    );
  }
}
