import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { ProcessMissionCommissionDto } from './dto/process-mission-commission.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.ADMIN)
  @Patch('missions/:missionId/process-commission')
  async processMissionCommission(
    @Param('missionId') missionId: string,
    @Body() dto: ProcessMissionCommissionDto,
  ) {
    return this.paymentsService.processMissionCommission(missionId, dto);
  }

  @Roles(UserRole.PARTNER)
  @Get('partner/me/commissions')
  async getMyPartnerCommissions(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<CommissionEntity[]> {
    return this.paymentsService.getPartnerCommissionsByUserId(currentUser.sub);
  }
}