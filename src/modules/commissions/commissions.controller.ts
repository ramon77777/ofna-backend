import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CommissionEntity } from './entities/commission.entity';
import { CommissionsService } from './commissions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('me')
  @Roles(UserRole.PARTNER)
  async getMyCommissions(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<CommissionEntity[]> {
    return this.commissionsService.getMyCommissions(currentUser.sub);
  }
}
