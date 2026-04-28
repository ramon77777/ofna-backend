import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreatePartnerDocumentDto } from './dto/create-partner-document.dto';
import { SubmitPartnerDocumentsDto } from './dto/submit-partner-documents.dto';
import { UpdatePartnerDocumentDto } from './dto/update-partner-document.dto';
import { PartnerDocumentEntity } from './entities/partner-document.entity';
import { PartnerDocumentsService } from './partner-documents.service';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';

@Controller('partner-documents')
export class PartnerDocumentsController {
  constructor(
    private readonly partnerDocumentsService: PartnerDocumentsService,
  ) {}

  @Post(':userId')
  async createDocument(
    @Param('userId') userId: string,
    @Body() dto: CreatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    return this.partnerDocumentsService.createDocument(userId, dto);
  }

  @Get(':userId/me')
  async getMyDocuments(
    @Param('userId') userId: string,
  ): Promise<PartnerDocumentEntity[]> {
    return this.partnerDocumentsService.getMyDocuments(userId);
  }

  @Patch(':userId/:documentId')
  async updateDocument(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    return this.partnerDocumentsService.updateDocument(
      userId,
      documentId,
      dto,
    );
  }

  @Post(':userId/submit')
  async submitDocuments(
    @Param('userId') userId: string,
    @Body() dto: SubmitPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    return this.partnerDocumentsService.submitDocuments(userId, dto);
  }
}