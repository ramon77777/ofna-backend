import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartnerDocumentStatus } from '../../common/enums/partner-document-status.enum';
import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { UserEntity } from '../users/entities/user.entity';
import { CreatePartnerDocumentDto } from './dto/create-partner-document.dto';
import { SubmitPartnerDocumentsDto } from './dto/submit-partner-documents.dto';
import { UpdatePartnerDocumentDto } from './dto/update-partner-document.dto';
import { PartnerDocumentEntity } from './entities/partner-document.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';

@Injectable()
export class PartnerDocumentsService {
  constructor(
    @InjectRepository(PartnerDocumentEntity)
    private readonly partnerDocumentsRepository: Repository<PartnerDocumentEntity>,
    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  private async getPartnerProfileByUserId(
    userId: string,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
        documents: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return partnerProfile;
  }

  async createDocument(
    userId: string,
    dto: CreatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    const partnerProfile = await this.getPartnerProfileByUserId(userId);

    const document = this.partnerDocumentsRepository.create({
      partnerProfile,
      documentType: dto.documentType,
      fileUrl: dto.fileUrl.trim(),
      documentStatus: PartnerDocumentStatus.SOUMIS,
      adminComment: dto.adminComment?.trim() ?? null,
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedByAdmin: null,
    });

    await this.partnerDocumentsRepository.save(document);

    return this.partnerDocumentsRepository.findOneOrFail({
      where: { id: document.id },
      relations: {
        partnerProfile: true,
        verifiedByAdmin: true,
      },
    });
  }

  async getMyDocuments(userId: string): Promise<PartnerDocumentEntity[]> {
    const partnerProfile = await this.getPartnerProfileByUserId(userId);

    return this.partnerDocumentsRepository.find({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
      relations: {
        partnerProfile: true,
        verifiedByAdmin: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateDocument(
    userId: string,
    documentId: string,
    dto: UpdatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    const partnerProfile = await this.getPartnerProfileByUserId(userId);

    const document = await this.partnerDocumentsRepository.findOne({
      where: {
        id: documentId,
        partnerProfile: { id: partnerProfile.id },
      },
      relations: {
        partnerProfile: true,
        verifiedByAdmin: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Partner document not found');
    }

    if (dto.documentType !== undefined) {
      document.documentType = dto.documentType;
    }

    if (dto.fileUrl !== undefined) {
      document.fileUrl = dto.fileUrl.trim();
    }

    if (dto.documentStatus !== undefined) {
      document.documentStatus = dto.documentStatus;
    }

    if (dto.adminComment !== undefined) {
      document.adminComment = dto.adminComment.trim();
    }

    await this.partnerDocumentsRepository.save(document);

    return this.partnerDocumentsRepository.findOneOrFail({
      where: { id: document.id },
      relations: {
        partnerProfile: true,
        verifiedByAdmin: true,
      },
    });
  }

  async submitDocuments(
    userId: string,
    _dto: SubmitPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
        documents: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    partnerProfile.validationStatus =
      PartnerValidationStatus.EN_COURS_VERIFICATION;

    await this.partnerProfilesRepository.save(partnerProfile);

    return this.partnerProfilesRepository.findOneOrFail({
      where: { id: partnerProfile.id },
      relations: {
        user: true,
        documents: true,
        wallet: true,
      },
    });
  }
}