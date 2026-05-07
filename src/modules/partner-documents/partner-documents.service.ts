import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartnerDocumentStatus } from '../../common/enums/partner-document-status.enum';
import { PartnerDocumentType } from '../../common/enums/partner-document-type.enum';
import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreatePartnerDocumentDto } from './dto/create-partner-document.dto';
import { SubmitPartnerDocumentsDto } from './dto/submit-partner-documents.dto';
import { UpdatePartnerDocumentDto } from './dto/update-partner-document.dto';
import { PartnerDocumentEntity } from './entities/partner-document.entity';

interface UploadedDocumentPayload {
  documentType?: PartnerDocumentType;
  fileUrl: string;
}

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
        wallet: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return partnerProfile;
  }

  private validateFileUrl(fileUrl: string): string {
    const cleanFileUrl = fileUrl.trim();

    if (!cleanFileUrl) {
      throw new BadRequestException('Le fichier du document est obligatoire.');
    }

    return cleanFileUrl;
  }

  private resetDocumentAfterPartnerUpdate(
    document: PartnerDocumentEntity,
  ): PartnerDocumentEntity {
    document.documentStatus = PartnerDocumentStatus.SOUMIS;
    document.adminComment = null;
    document.submittedAt = new Date();
    document.verifiedAt = null;
    document.verifiedByAdmin = null;

    return document;
  }

  /**
   * Ancien flux conservé :
   * création avec URL manuelle.
   */
  async createDocument(
    userId: string,
    dto: CreatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    const partnerProfile = await this.getPartnerProfileByUserId(userId);
    const fileUrl = this.validateFileUrl(dto.fileUrl);

    const document = this.partnerDocumentsRepository.create({
      partnerProfile,
      documentType: dto.documentType,
      fileUrl,
      documentStatus: PartnerDocumentStatus.SOUMIS,
      adminComment: null,
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

  /**
   * Nouveau flux recommandé :
   * création après upload fichier.
   */
  async createUploadedDocument(
    userId: string,
    payload: UploadedDocumentPayload,
  ): Promise<PartnerDocumentEntity> {
    if (!payload.documentType) {
      throw new BadRequestException('Le type de document est obligatoire.');
    }

    const partnerProfile = await this.getPartnerProfileByUserId(userId);
    const fileUrl = this.validateFileUrl(payload.fileUrl);

    const document = this.partnerDocumentsRepository.create({
      partnerProfile,
      documentType: payload.documentType,
      fileUrl,
      documentStatus: PartnerDocumentStatus.SOUMIS,
      adminComment: null,
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

  /**
   * Ancien flux conservé :
   * remplacement via URL manuelle.
   */
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
      document.fileUrl = this.validateFileUrl(dto.fileUrl);
    }

    this.resetDocumentAfterPartnerUpdate(document);

    await this.partnerDocumentsRepository.save(document);

    return this.partnerDocumentsRepository.findOneOrFail({
      where: { id: document.id },
      relations: {
        partnerProfile: true,
        verifiedByAdmin: true,
      },
    });
  }

  /**
   * Nouveau flux recommandé :
   * remplacement avec un vrai fichier uploadé.
   */
  async replaceDocumentFile(
    userId: string,
    documentId: string,
    payload: UploadedDocumentPayload,
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

    if (payload.documentType !== undefined) {
      document.documentType = payload.documentType;
    }

    document.fileUrl = this.validateFileUrl(payload.fileUrl);

    this.resetDocumentAfterPartnerUpdate(document);

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
    dto: SubmitPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    void dto;

    const partnerProfile = await this.getPartnerProfileByUserId(userId);

    const documentsCount = await this.partnerDocumentsRepository.count({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
    });

    if (documentsCount === 0) {
      throw new BadRequestException(
        'Vous devez ajouter au moins un document avant de soumettre votre dossier.',
      );
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
