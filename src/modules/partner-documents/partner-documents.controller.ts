import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { cloudinary } from '../../config/cloudinary.config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PartnerDocumentType } from '../../common/enums/partner-document-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { CreatePartnerDocumentDto } from './dto/create-partner-document.dto';
import { SubmitPartnerDocumentsDto } from './dto/submit-partner-documents.dto';
import { UpdatePartnerDocumentDto } from './dto/update-partner-document.dto';
import { PartnerDocumentEntity } from './entities/partner-document.entity';
import { PartnerDocumentsService } from './partner-documents.service';

interface UploadedPartnerDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('partner-documents')
export class PartnerDocumentsController {
  constructor(
    private readonly partnerDocumentsService: PartnerDocumentsService,
  ) {}

  private async uploadToCloudinary(
    file: UploadedPartnerDocumentFile,
    userId: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `ofna/partner-documents/${userId}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new BadRequestException(
                'Impossible d’envoyer le fichier vers Cloudinary.',
              ),
            );
            return;
          }

          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Ancien endpoint conservé :
   * permet encore d'enregistrer un document via une URL manuelle.
   * Le nouvel usage recommandé est POST /partner-documents/upload.
   */
  @Post()
  async createDocument(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    return this.partnerDocumentsService.createDocument(currentUser.sub, dto);
  }

  /**
   * Nouveau endpoint :
   * le partenaire choisit un fichier depuis son ordinateur/téléphone.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Format de fichier non autorisé. Utilisez PDF, JPG, PNG ou WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadDocument(
    @CurrentUser() currentUser: CurrentUserData,
    @Body('documentType') documentType: PartnerDocumentType,
    @UploadedFile() file?: UploadedPartnerDocumentFile,
  ): Promise<PartnerDocumentEntity> {
    if (!file) {
      throw new BadRequestException('Le fichier du document est obligatoire.');
    }

    if (!documentType) {
      throw new BadRequestException('Le type de document est obligatoire.');
    }

    const fileUrl = await this.uploadToCloudinary(file, currentUser.sub);

    return this.partnerDocumentsService.createUploadedDocument(
      currentUser.sub,
      {
        documentType,
        fileUrl,
      },
    );
  }

  @Get('me')
  async getMyDocuments(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<PartnerDocumentEntity[]> {
    return this.partnerDocumentsService.getMyDocuments(currentUser.sub);
  }

  /**
   * Ancien endpoint conservé :
   * remplacement par URL manuelle.
   * Le nouvel usage recommandé est PATCH /partner-documents/:documentId/upload.
   */
  @Patch(':documentId')
  async updateDocument(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('documentId') documentId: string,
    @Body() dto: UpdatePartnerDocumentDto,
  ): Promise<PartnerDocumentEntity> {
    return this.partnerDocumentsService.updateDocument(
      currentUser.sub,
      documentId,
      dto,
    );
  }

  /**
   * Nouveau endpoint :
   * le partenaire remplace un document avec un vrai fichier.
   */
  @Patch(':documentId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Format de fichier non autorisé. Utilisez PDF, JPG, PNG ou WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async replaceDocumentFile(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('documentId') documentId: string,
    @Body('documentType') documentType: PartnerDocumentType | undefined,
    @UploadedFile() file?: UploadedPartnerDocumentFile,
  ): Promise<PartnerDocumentEntity> {
    if (!file) {
      throw new BadRequestException('Le fichier du document est obligatoire.');
    }

    const fileUrl = await this.uploadToCloudinary(file, currentUser.sub);

    return this.partnerDocumentsService.replaceDocumentFile(
      currentUser.sub,
      documentId,
      {
        documentType,
        fileUrl,
      },
    );
  }

  @Post('submit')
  async submitDocuments(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: SubmitPartnerDocumentsDto,
  ): Promise<PartnerProfileEntity> {
    return this.partnerDocumentsService.submitDocuments(currentUser.sub, dto);
  }
}