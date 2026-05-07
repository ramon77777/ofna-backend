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
import { UpdatePartnerDocumentStatusDto } from './dto/update-partner-document-status.dto';
import { UpdatePartnerVisibilityDto } from './dto/update-partner-visibility.dto';
import { ValidatePartnerDto } from './dto/validate-partner.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('partners')
  async getAllPartners(): Promise<PartnerProfileEntity[]> {
    return this.adminService.getAllPartners();
  }

  @Get('partners/pending')
  async getPendingPartners(): Promise<PartnerProfileEntity[]> {
    return this.adminService.getPendingPartners();
  }

  @Get('partners/:partnerProfileId')
  async getPartnerDetails(
    @Param('partnerProfileId') partnerProfileId: string,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.getPartnerDetails(partnerProfileId);
  }

  @Patch('partners/:partnerProfileId/validate')
  async validatePartner(
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: ValidatePartnerDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.validatePartner(partnerProfileId, dto);
  }

  @Patch('partners/:partnerProfileId/visibility')
  async updatePartnerVisibility(
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: UpdatePartnerVisibilityDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.updatePartnerVisibility(partnerProfileId, dto);
  }

  @Patch('partners/:partnerProfileId/request-documents')
  async requestPartnerDocuments(
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: RequestPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.requestPartnerDocuments(partnerProfileId, dto);
  }

  @Patch('partners/:partnerProfileId/documents/:documentId/status')
  async updatePartnerDocumentStatus(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('partnerProfileId') partnerProfileId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdatePartnerDocumentStatusDto,
  ): Promise<PartnerProfileEntity> {
    return this.adminService.updatePartnerDocumentStatus(
      currentUser.sub,
      partnerProfileId,
      documentId,
      dto,
    );
  }

  @Get('missions')
  async getAllMissions(): Promise<MissionEntity[]> {
    return this.adminService.getAllMissions();
  }

  @Patch('missions/:missionId/process-commission')
  async processMissionCommission(
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.adminService.processMissionCommission(missionId);
  }

  @Get('missions/:missionId')
  async getMissionDetails(
    @Param('missionId') missionId: string,
  ): Promise<MissionEntity> {
    return this.adminService.getMissionDetails(missionId);
  }

  @Get('commissions')
  async getAllCommissions(): Promise<CommissionEntity[]> {
    return this.adminService.getAllCommissions();
  }

  @Get('finance')
  async getFinanceDashboard() {
    return this.adminService.getFinanceDashboard();
  }

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }
}
