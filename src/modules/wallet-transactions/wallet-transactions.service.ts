import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MissionEntity } from '../missions/entities/mission.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletTransactionsService {
  constructor(
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepository: Repository<WalletTransactionEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,
    @InjectRepository(MissionEntity)
    private readonly missionsRepository: Repository<MissionEntity>,
  ) {}

  async createTransaction(
    dto: CreateWalletTransactionDto,
  ): Promise<WalletTransactionEntity> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: dto.walletId },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    let mission: MissionEntity | null = null;

    if (dto.missionId) {
      mission = await this.missionsRepository.findOne({
        where: { id: dto.missionId },
      });

      if (!mission) {
        throw new NotFoundException('Mission not found');
      }
    }

    const transaction = this.walletTransactionsRepository.create({
      wallet,
      transactionType: dto.transactionType,
      sourceType: dto.sourceType,
      amount: dto.amount,
      balanceBefore: dto.balanceBefore,
      balanceAfter: dto.balanceAfter,
      mission,
      label: dto.label,
      reference: dto.reference ?? null,
      note: dto.note ?? null,
    });

    await this.walletTransactionsRepository.save(transaction);

    return this.walletTransactionsRepository.findOneOrFail({
      where: { id: transaction.id },
      relations: {
        wallet: {
          partnerProfile: {
            user: true,
          },
        },
        mission: true,
      },
    });
  }

  async getWalletTransactions(
    walletId: string,
  ): Promise<WalletTransactionEntity[]> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.walletTransactionsRepository.find({
      where: {
        wallet: { id: walletId },
      },
      relations: {
        mission: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getMyWalletTransactions(
    userId: string,
  ): Promise<WalletTransactionEntity[]> {
    const wallet = await this.walletsRepository.findOne({
      where: {
        partnerProfile: {
          user: { id: userId },
        },
      },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.walletTransactionsRepository.find({
      where: {
        wallet: { id: wallet.id },
      },
      relations: {
        mission: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}