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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

const uploadDestination = join(process.cwd(), 'uploads', 'partner-documents');

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function ensureUploadDirectoryExists() {
  if (!existsSync(uploadDestination)) {
    mkdirSync(uploadDestination, { recursive: true });
  }
}

function generateSafeFilename(originalName: string, userId: string): string {
  const extension = extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomPart = Math.round(Math.random() * 1_000_000_000);

  return `${userId}-${timestamp}-${randomPart}${extension}`;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('partner-documents')
export class PartnerDocumentsController {
  constructor(
    private readonly partnerDocumentsService: PartnerDocumentsService,
  ) {}

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
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          ensureUploadDirectoryExists();
          callback(null, uploadDestination);
        },
        filename: (req, file, callback) => {
          const user = req.user as CurrentUserData | undefined;
          const userId = user?.sub ?? 'partner';

          callback(null, generateSafeFilename(file.originalname, userId));
        },
      }),
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

    const fileUrl = `/uploads/partner-documents/${file.filename}`;

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
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          ensureUploadDirectoryExists();
          callback(null, uploadDestination);
        },
        filename: (req, file, callback) => {
          const user = req.user as CurrentUserData | undefined;
          const userId = user?.sub ?? 'partner';

          callback(null, generateSafeFilename(file.originalname, userId));
        },
      }),
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

    const fileUrl = `/uploads/partner-documents/${file.filename}`;

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
