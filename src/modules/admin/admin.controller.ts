import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { MissionEntity } from '../missions/entities/mission.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { AdminService } from './admin.service';
import { RequestPartnerDocumentsDto } from './dto/request-partner-documents.dto';
import { ValidatePartnerDto } from './dto/validate-partner.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('partners')
  async getAllPartners(
    @CurrentUser() _currentUser: CurrentUserData,
  ): Promise<PartnerProfileEntity[]> {
    return this.adminService.getAllPartners();
  }

  @Get('partners/pending')
  async getPendingPartners(
    @CurrentUser() _currentUser: CurrentUserData,
  ): Promise<PartnerProfileEntity[]> {
    return this.adminService.getPendingPartners();
  }

  @Get('partners/:partnerProfileId')
  async getPartnerDetails(
    @CurrentUser() _currentUser: CurrentUserData,
    @Param('partnerProfileId') partnerProfileId: string,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.getPartnerDetails(partnerProfileId);
  }

  @Patch('partners/:partnerProfileId/validate')
  async validatePartner(
    @CurrentUser() _currentUser: CurrentUserData,
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: ValidatePartnerDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.validatePartner(partnerProfileId, dto);
  }

  @Patch('partners/:partnerProfileId/request-documents')
  async requestPartnerDocuments(
    @CurrentUser() _currentUser: CurrentUserData,
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: RequestPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.requestPartnerDocuments(partnerProfileId, dto);
  }

  @Get('missions')
  async getAllMissions(
    @CurrentUser() _currentUser: CurrentUserData,
  ): Promise<MissionEntity[]> {
    return this.adminService.getAllMissions();
  }

  @Patch('missions/:missionId/process-commission')
  async processMissionCommission(
    @CurrentUser() _currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.adminService.processMissionCommission(missionId);
  }

  @Get('missions/:missionId')
  async getMissionDetails(
    @CurrentUser() _currentUser: CurrentUserData,
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.adminService.getMissionDetails(missionId);
  }

  @Get('commissions')
  async getAllCommissions(
    @CurrentUser() _currentUser: CurrentUserData,
  ): Promise<CommissionEntity[]> {
    return this.adminService.getAllCommissions();
  }

  @Get('finance')
  async getFinanceDashboard(@CurrentUser() _currentUser: CurrentUserData) {
    return this.adminService.getFinanceDashboard();
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() _currentUser: CurrentUserData) {
    return this.adminService.getDashboard();
  }
}