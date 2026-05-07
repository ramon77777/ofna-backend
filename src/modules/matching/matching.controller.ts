import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { AutoAssignMissionDto } from './dto/auto-assign-mission.dto';
import { MatchingPartnerResult } from './interfaces/matching-partner-result.interface';
import { MatchingService } from './matching.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Roles(UserRole.CLIENT)
  @Get('missions/:missionId/candidates')
  async getMissionMatchingCandidates(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Query('maxDistanceKm') maxDistanceKm?: string,
  ): Promise<MatchingPartnerResult[]> {
    const distance = maxDistanceKm ? Number(maxDistanceKm) : 25;

    return this.matchingService.getMissionMatchingCandidates(
      currentUser.sub,
      missionId,
      distance,
    );
  }

  @Roles(UserRole.CLIENT)
  @Patch('missions/:missionId/auto-assign')
  async autoAssignMission(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
    @Body() dto: AutoAssignMissionDto,
  ): Promise<{
    mission: any;
    selectedPartner: any;
    candidates: MatchingPartnerResult[];
  }> {
    return this.matchingService.autoAssignMission(
      currentUser.sub,
      missionId,
      dto,
    );
  }
}
