import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { MissionEntity } from '../missions/entities/mission.entity';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { AutoAssignMissionDto } from './dto/auto-assign-mission.dto';
import { MatchingPartnerResult } from './interfaces/matching-partner-result.interface';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,
    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,
  ) {}

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private async getClientMissionOrFail(
    userId: string,
    missionId: string,
  ): Promise<MissionEntity> {
    const mission = await this.missionsRepository.findOne({
      where: {
        id: missionId,
        client: { id: userId },
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found for this user');
    }

    return mission;
  }

  async findEligiblePartnersForMission(
    userId: string,
    missionId: string,
    maxDistanceKm = 25,
  ): Promise<MatchingPartnerResult[]> {
    const mission = await this.getClientMissionOrFail(userId, missionId);

    const missionLatitude = Number(mission.departureLatitude);
    const missionLongitude = Number(mission.departureLongitude);

    if (Number.isNaN(missionLatitude) || Number.isNaN(missionLongitude)) {
      throw new BadRequestException('Mission coordinates are invalid');
    }

    const partners = await this.partnerProfilesRepository.find({
      where: {
        validationStatus: PartnerValidationStatus.VALIDE,
        isVisible: true,
        isAvailable: true,
      },
      relations: {
        user: true,
        wallet: true,
      },
    });

    const eligiblePartners: MatchingPartnerResult[] = [];

    for (const partner of partners) {
      if (!partner.wallet) {
        continue;
      }

      if (
        partner.wallet.walletStatus !== WalletStatus.ACTIF &&
        partner.wallet.walletStatus !== WalletStatus.FAIBLE
      ) {
        continue;
      }

      if (!partner.latitude || !partner.longitude) {
        continue;
      }

      const partnerLatitude = Number(partner.latitude);
      const partnerLongitude = Number(partner.longitude);

      if (Number.isNaN(partnerLatitude) || Number.isNaN(partnerLongitude)) {
        continue;
      }

      const distanceKm = this.calculateDistanceKm(
        missionLatitude,
        missionLongitude,
        partnerLatitude,
        partnerLongitude,
      );

      if (distanceKm <= maxDistanceKm) {
        eligiblePartners.push({
          partnerProfile: partner,
          distanceKm: Number(distanceKm.toFixed(2)),
        });
      }
    }

    eligiblePartners.sort((a, b) => a.distanceKm - b.distanceKm);

    return eligiblePartners;
  }

  async autoAssignMission(
    userId: string,
    missionId: string,
    dto: AutoAssignMissionDto,
  ): Promise<{
    mission: MissionEntity;
    selectedPartner: PartnerProfileEntity | null;
    candidates: MatchingPartnerResult[];
  }> {
    const mission = await this.getClientMissionOrFail(userId, missionId);

    if (mission.partnerProfile) {
      return {
        mission,
        selectedPartner: mission.partnerProfile,
        candidates: [],
      };
    }

    const maxDistanceKm = Number(dto.maxDistanceKm ?? '25');
    if (Number.isNaN(maxDistanceKm) || maxDistanceKm <= 0) {
      throw new BadRequestException('maxDistanceKm must be greater than 0');
    }

    const candidates = await this.findEligiblePartnersForMission(
      userId,
      missionId,
      maxDistanceKm,
    );

    if (candidates.length === 0) {
      return {
        mission,
        selectedPartner: null,
        candidates: [],
      };
    }

    const selectedPartner = candidates[0].partnerProfile;
    mission.partnerProfile = selectedPartner;
    await this.missionsRepository.save(mission);

    const refreshedMission = await this.missionsRepository.findOneOrFail({
      where: { id: mission.id },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
      },
    });

    return {
      mission: refreshedMission,
      selectedPartner,
      candidates,
    };
  }

  async getMissionMatchingCandidates(
    userId: string,
    missionId: string,
    maxDistanceKm = 25,
  ): Promise<MatchingPartnerResult[]> {
    return this.findEligiblePartnersForMission(
      userId,
      missionId,
      maxDistanceKm,
    );
  }
}