import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CommissionEntity } from '../commissions/entities/commission.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletTransactionEntity } from '../wallet-transactions/entities/wallet-transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';
import { PartnerProfileEntity } from './entities/partner-profile.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepository: Repository<WalletTransactionEntity>,
    @InjectRepository(CommissionEntity)
    private readonly commissionsRepository: Repository<CommissionEntity>,
  ) {}

  async createPartnerProfile(
    userId: string,
    dto: CreatePartnerProfileDto,
  ): Promise<PartnerProfileEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.PARTNER) {
      throw new BadRequestException(
        'Only users with partner role can create a partner profile',
      );
    }

    const existingProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (existingProfile) {
      throw new BadRequestException(
        'Partner profile already exists for this user',
      );
    }

    const partnerProfile = this.partnerProfilesRepository.create({
      user,
      activityType: dto.activityType,
      businessName: dto.businessName?.trim() ?? null,
      description: dto.description?.trim() ?? null,
      interventionZone: dto.interventionZone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      validationStatus: PartnerValidationStatus.EN_ATTENTE,
      isAvailable: false,
      isVisible: false,
    });

    await this.partnerProfilesRepository.save(partnerProfile);

    return this.getPartnerProfileByUserId(userId);
  }

  async getPartnerProfileByUserId(
    userId: string,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
        wallet: true,
        documents: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return partnerProfile;
  }

  async updatePartnerProfile(
    userId: string,
    dto: UpdatePartnerProfileDto,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    if (dto.activityType !== undefined) {
      partnerProfile.activityType = dto.activityType;
    }

    if (dto.businessName !== undefined) {
      partnerProfile.businessName = dto.businessName?.trim() ?? null;
    }

    if (dto.description !== undefined) {
      partnerProfile.description = dto.description?.trim() ?? null;
    }

    if (dto.interventionZone !== undefined) {
      partnerProfile.interventionZone = dto.interventionZone?.trim() ?? null;
    }

    if (dto.address !== undefined) {
      partnerProfile.address = dto.address?.trim() ?? null;
    }

    if (dto.latitude !== undefined) {
      partnerProfile.latitude = dto.latitude;
    }

    if (dto.longitude !== undefined) {
      partnerProfile.longitude = dto.longitude;
    }

    await this.partnerProfilesRepository.save(partnerProfile);

    return this.getPartnerProfileByUserId(userId);
  }

  async updateAvailability(
    userId: string,
    dto: UpdateAvailabilityDto,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    partnerProfile.isAvailable = dto.isAvailable;

    await this.partnerProfilesRepository.save(partnerProfile);

    return this.getPartnerProfileByUserId(userId);
  }

  async getPartnerProfileById(
    partnerProfileId: string,
  ): Promise<PartnerProfileEntity> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: { id: partnerProfileId },
      relations: {
        user: true,
        wallet: true,
        documents: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return partnerProfile;
  }

  async getMyDashboard(userId: string) {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
        wallet: true,
        documents: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    if (!partnerProfile.wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const recentTransactions = await this.walletTransactionsRepository.find({
      where: {
        wallet: { id: partnerProfile.wallet.id },
      },
      relations: {
        mission: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 5,
    });

    const recentCommissions = await this.commissionsRepository.find({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
      relations: {
        mission: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 5,
    });

    const allCommissions = await this.commissionsRepository.find({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
    });

    const totalCommissionPaid = allCommissions
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0)
      .toFixed(2);

    return {
      partnerProfile,
      wallet: partnerProfile.wallet,
      recentTransactions,
      recentCommissions,
      stats: {
        missionsCommissionedCount: allCommissions.length,
        totalCommissionPaid,
        currentBalance: partnerProfile.wallet.balance,
      },
    };
  }
}