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

import { MissionType } from '../../common/enums/mission-type.enum';
import { PartnerActivityType } from '../../common/enums/partner-activity-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { FindNearbyPartnersDto } from './dto/find-nearby-partners.dto';

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

  private readonly priorityRadiusKm = 5;

  private toNumber(value: string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateDistanceKm(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
  ): number {
    const earthRadiusKm = 6371;

    const toRadians = (value: number) => (value * Math.PI) / 180;

    const latitudeDistance = toRadians(toLatitude - fromLatitude);
    const longitudeDistance = toRadians(toLongitude - fromLongitude);

    const a =
      Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
      Math.cos(toRadians(fromLatitude)) *
        Math.cos(toRadians(toLatitude)) *
        Math.sin(longitudeDistance / 2) *
        Math.sin(longitudeDistance / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private getAllowedActivityTypesForMission(
    missionType: MissionType,
  ): PartnerActivityType[] {
    if (missionType === MissionType.REMORQUAGE) {
      return [PartnerActivityType.REMORQUEUR];
    }

    return [PartnerActivityType.DEPANNEUR, PartnerActivityType.GARAGISTE];
  }

  async findNearbyPartners(dto: FindNearbyPartnersDto) {
    const clientLatitude = this.toNumber(dto.latitude);
    const clientLongitude = this.toNumber(dto.longitude);

    if (clientLatitude === null || clientLongitude === null) {
      throw new BadRequestException('Coordonnées client invalides.');
    }

    const allowedActivityTypes = this.getAllowedActivityTypesForMission(
      dto.missionType,
    );

    const partners = await this.partnerProfilesRepository.find({
      where: {
        validationStatus: PartnerValidationStatus.VALIDE,
        isAvailable: true,
        isVisible: true,
      },
      relations: {
        user: true,
        wallet: true,
      },
    });

    const eligiblePartners = partners
      .filter((partner) => allowedActivityTypes.includes(partner.activityType))
      .filter((partner) => {
        if (!partner.wallet) {
          return false;
        }

        return partner.wallet.walletStatus === WalletStatus.ACTIF;
      })
      .map((partner) => {
        const partnerLatitude = this.toNumber(partner.latitude);
        const partnerLongitude = this.toNumber(partner.longitude);

        if (partnerLatitude === null || partnerLongitude === null) {
          return null;
        }

        const distanceKm = this.calculateDistanceKm(
          clientLatitude,
          clientLongitude,
          partnerLatitude,
          partnerLongitude,
        );

        return {
          id: partner.id,
          businessName:
            partner.businessName ||
            `${partner.user?.firstName ?? ''} ${partner.user?.lastName ?? ''}`.trim() ||
            'Partenaire OFNA',
          activityType: partner.activityType,
          description: partner.description,
          interventionZone: partner.interventionZone,
          address: partner.address,
          latitude: partner.latitude,
          longitude: partner.longitude,
          phone: partner.user?.phone ?? null,
          averageRating: partner.averageRating,
          reviewsCount: partner.reviewsCount,
          isAvailable: partner.isAvailable,
          isVisible: partner.isVisible,
          distanceKm: Number(distanceKm.toFixed(2)),
          isWithinPriorityRadius: distanceKm <= this.priorityRadiusKm,
        };
      })
      .filter(
        (partner): partner is NonNullable<typeof partner> => partner !== null,
      )
      .sort((first, second) => {
        if (first.isWithinPriorityRadius !== second.isWithinPriorityRadius) {
          return first.isWithinPriorityRadius ? -1 : 1;
        }

        if (first.distanceKm !== second.distanceKm) {
          return first.distanceKm - second.distanceKm;
        }

        const firstRating = Number(first.averageRating ?? 0);
        const secondRating = Number(second.averageRating ?? 0);

        if (firstRating !== secondRating) {
          return secondRating - firstRating;
        }

        return (
          Number(second.reviewsCount ?? 0) - Number(first.reviewsCount ?? 0)
        );
      });

    const nearbyPartners = eligiblePartners.filter(
      (partner) => partner.isWithinPriorityRadius,
    );

    const otherPartners = eligiblePartners.filter(
      (partner) => !partner.isWithinPriorityRadius,
    );

    return {
      priorityRadiusKm: this.priorityRadiusKm,
      total: eligiblePartners.length,
      nearbyCount: nearbyPartners.length,
      otherCount: otherPartners.length,
      nearbyPartners,
      otherPartners,
      partners: eligiblePartners,
    };
  }

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
