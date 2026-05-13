import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { CommissionEntity } from './entities/commission.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(CommissionEntity)
    private readonly commissionsRepository: Repository<CommissionEntity>,

    @InjectRepository(PartnerProfileEntity)
    private readonly partnerProfilesRepository: Repository<PartnerProfileEntity>,
  ) {}

  async getMyCommissions(partnerUserId: string): Promise<CommissionEntity[]> {
    const partnerProfile = await this.partnerProfilesRepository.findOne({
      where: {
        user: { id: partnerUserId },
      },
      relations: {
        user: true,
      },
    });

    if (!partnerProfile) {
      throw new NotFoundException('Partner profile not found');
    }

    return this.commissionsRepository.find({
      where: {
        partnerProfile: { id: partnerProfile.id },
      },
      relations: {
        partnerProfile: {
          user: true,
          wallet: true,
        },
        mission: {
          client: true,
          partnerProfile: {
            user: true,
          },
        },
        order: {
          client: true,
          product: true,
          partnerProfile: {
            user: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
