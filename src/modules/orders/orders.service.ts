import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CommissionOperationType } from '../../common/enums/commission-operation-type.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ProductAvailability } from '../../common/enums/product-availability.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletTransactionSource } from '../../common/enums/wallet-transaction-source.enum';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEntity } from './entities/order.entity';
import { PaymentMode } from '../../common/enums/payment-mode.enum';
import { UpdateOrderDeliveryFeeDto } from './dto/update-order-delivery-fee.dto';

interface InsertCommissionResult {
  id: string;
}

@Injectable()
export class OrdersService {
  private readonly commissionRate = 10;

  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,

    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,

    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async createOrder(
    currentUser: CurrentUserData,
    dto: CreateOrderDto,
  ): Promise<OrderEntity> {
    const client = await this.usersRepository.findOne({
      where: { id: currentUser.sub },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const product = await this.productsRepository.findOne({
      where: {
        id: dto.productId,
      },
      relations: {
        partnerProfile: {
          user: true,
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if (product.availability !== ProductAvailability.DISPONIBLE) {
      throw new BadRequestException('Ce produit n’est pas disponible.');
    }

    const quantity = dto.quantity ?? 1;

    if (quantity <= 0) {
      throw new BadRequestException('Quantité invalide.');
    }

    const unitPrice = Number(product.price);

    if (Number.isNaN(unitPrice) || unitPrice <= 0) {
      throw new BadRequestException('Prix produit invalide.');
    }

    const proposedAmount = unitPrice * quantity;

    const allowedDeliveryPaymentModes = [
      PaymentMode.ESPECE_LIVRAISON,
      PaymentMode.WAVE_LIVRAISON,
      PaymentMode.ORANGE_MONEY_LIVRAISON,
      PaymentMode.MTN_MONEY_LIVRAISON,
      PaymentMode.MOOV_MONEY_LIVRAISON,
    ];

    if (!allowedDeliveryPaymentModes.includes(dto.paymentMode)) {
      throw new BadRequestException(
        'Mode de paiement à la livraison invalide.',
      );
    }

    const order = this.ordersRepository.create({
      client,
      product,
      partnerProfile: product.partnerProfile,
      quantity,
      proposedAmount: proposedAmount.toFixed(2),
      validatedAmount: null,
      deliveryFee: null,
      deliveryFeeConfirmedAt: null,
      paymentMode: dto.paymentMode,
      orderStatus: OrderStatus.EN_ATTENTE,
      validatedAt: null,
      completedAt: null,
      cancelledAt: null,
    });

    await this.ordersRepository.save(order);

    return this.getOrderByIdForUser(currentUser, order.id);
  }

  async updateDeliveryFee(
    currentUser: CurrentUserData,
    orderId: string,
    dto: UpdateOrderDeliveryFeeDto,
  ): Promise<OrderEntity> {
    const order = await this.getOrderWithRelations(orderId);

    const isPartnerOwner = order.partnerProfile?.user?.id === currentUser.sub;

    if (!isPartnerOwner) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres commandes.',
      );
    }

    if (
      order.orderStatus === OrderStatus.TERMINEE ||
      order.orderStatus === OrderStatus.ANNULEE
    ) {
      throw new BadRequestException(
        'Les frais de livraison ne peuvent plus être modifiés sur une commande clôturée.',
      );
    }

    const deliveryFee = Number(dto.deliveryFee);

    if (Number.isNaN(deliveryFee) || deliveryFee < 0) {
      throw new BadRequestException('Frais de livraison invalides.');
    }

    await this.ordersRepository.update(
      { id: order.id },
      {
        deliveryFee: deliveryFee.toFixed(2),
        deliveryFeeConfirmedAt: new Date(),
      },
    );

    return this.getOrderByIdForUser(currentUser, order.id);
  }

  async getClientOrders(clientUserId: string): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      where: {
        client: { id: clientUserId },
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
        },
        product: true,
        commissions: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPartnerOrders(partnerUserId: string): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      where: {
        partnerProfile: {
          user: {
            id: partnerUserId,
          },
        },
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
        },
        product: true,
        commissions: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getAllOrdersForAdmin(): Promise<OrderEntity[]> {
    return this.ordersRepository.find({
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
        product: true,
        commissions: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOrderByIdForUser(
    currentUser: CurrentUserData,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.getOrderWithRelations(orderId);

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isClientOwner = order.client?.id === currentUser.sub;
    const isPartnerOwner = order.partnerProfile?.user?.id === currentUser.sub;

    if (!isAdmin && !isClientOwner && !isPartnerOwner) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à consulter cette commande.',
      );
    }

    return order;
  }

  async cancelOrderByClient(
    currentUser: CurrentUserData,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.getOrderWithRelations(orderId);

    const isClientOwner = order.client?.id === currentUser.sub;

    if (!isClientOwner) {
      throw new ForbiddenException(
        'Vous ne pouvez annuler que vos propres commandes.',
      );
    }

    if (order.orderStatus !== OrderStatus.EN_ATTENTE) {
      throw new BadRequestException(
        'Cette commande ne peut plus être annulée car elle a déjà été confirmée.',
      );
    }

    await this.ordersRepository.update(
      { id: order.id },
      {
        orderStatus: OrderStatus.ANNULEE,
        cancelledAt: new Date(),
      },
    );

    return this.getOrderByIdForUser(currentUser, order.id);
  }

  async updateOrderStatus(
    currentUser: CurrentUserData,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderEntity> {
    const order = await this.getOrderWithRelations(orderId);

    const isPartnerOwner = order.partnerProfile?.user?.id === currentUser.sub;

    if (!isPartnerOwner) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres commandes.',
      );
    }

    this.assertAllowedStatusTransition(order.orderStatus, dto.orderStatus);

    if (dto.orderStatus === OrderStatus.TERMINEE) {
      await this.processOrderCompletionWithCommission(order.id);

      return this.getOrderByIdForUser(currentUser, order.id);
    }

    order.orderStatus = dto.orderStatus;

    if (dto.orderStatus === OrderStatus.CONFIRMEE) {
      order.validatedAmount = order.proposedAmount;
      order.validatedAt = new Date();
    }

    if (dto.orderStatus === OrderStatus.ANNULEE) {
      order.cancelledAt = new Date();
    }

    await this.ordersRepository.save(order);

    return this.getOrderByIdForUser(currentUser, order.id);
  }

  private async processOrderCompletionWithCommission(
    orderId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId },
        relations: {
          client: true,
          partnerProfile: {
            user: true,
            wallet: true,
          },
          product: true,
          commissions: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.orderStatus === OrderStatus.TERMINEE) {
        return;
      }

      if (order.orderStatus === OrderStatus.ANNULEE) {
        throw new BadRequestException(
          'Cette commande est annulée et ne peut plus être terminée.',
        );
      }

      if (order.orderStatus !== OrderStatus.EN_COURS_ENVOI) {
        throw new BadRequestException(
          `Transition de statut invalide : ${order.orderStatus} vers ${OrderStatus.TERMINEE}.`,
        );
      }

      if (!order.partnerProfile) {
        throw new BadRequestException(
          'Cette commande n’a pas de partenaire associé.',
        );
      }

      if (!order.partnerProfile.wallet) {
        throw new BadRequestException('Le partenaire n’a pas de portefeuille.');
      }

      const alreadyProcessed =
        order.commissions?.some(
          (commission) =>
            commission.operationType === CommissionOperationType.VENTE_PIECE,
        ) ?? false;

      if (alreadyProcessed) {
        await manager.update(
          OrderEntity,
          { id: order.id },
          {
            orderStatus: OrderStatus.TERMINEE,
            validatedAmount: order.validatedAmount ?? order.proposedAmount,
            validatedAt: order.validatedAt ?? new Date(),
            completedAt: order.completedAt ?? new Date(),
          },
        );

        return;
      }

      const operationAmount = Number(
        order.validatedAmount ?? order.proposedAmount,
      );

      if (Number.isNaN(operationAmount) || operationAmount <= 0) {
        throw new BadRequestException('Montant commande invalide.');
      }

      const commissionAmount = Number(
        ((operationAmount * this.commissionRate) / 100).toFixed(2),
      );

      const wallet = order.partnerProfile.wallet;
      const balanceBefore = Number(wallet.balance);

      if (Number.isNaN(balanceBefore)) {
        throw new BadRequestException('Solde portefeuille invalide.');
      }

      if (balanceBefore < commissionAmount) {
        throw new BadRequestException(
          'Solde portefeuille insuffisant pour prélever la commission OFNA sur cette commande.',
        );
      }

      const balanceAfter = Number(
        (balanceBefore - commissionAmount).toFixed(2),
      );

      const rawSavedCommissionRows: unknown = await manager.query(
        `
        INSERT INTO commissions (
          partner_profile_id,
          mission_id,
          order_id,
          operation_type,
          operation_amount,
          commission_rate,
          commission_amount,
          debited_at,
          note,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
        RETURNING id
        `,
        [
          order.partnerProfile.id,
          null,
          order.id,
          CommissionOperationType.VENTE_PIECE,
          operationAmount.toFixed(2),
          this.commissionRate.toFixed(2),
          commissionAmount.toFixed(2),
          'Commission automatique après commande boutique terminée',
        ],
      );

      const savedCommissionRows =
        rawSavedCommissionRows as InsertCommissionResult[];

      const savedCommissionId = savedCommissionRows[0]?.id;

      if (!savedCommissionId) {
        throw new BadRequestException(
          'Impossible de créer la commission de commande.',
        );
      }

      wallet.balance = balanceAfter.toFixed(2);
      wallet.walletStatus = this.getWalletStatus(balanceAfter);

      await manager.save(WalletEntity, wallet);

      await manager.query(
        `
        INSERT INTO wallet_transactions (
          wallet_id,
          transaction_type,
          source_type,
          amount,
          balance_before,
          balance_after,
          mission_id,
          label,
          reference,
          note,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `,
        [
          wallet.id,
          WalletTransactionType.DEBIT,
          WalletTransactionSource.COMMISSION,
          commissionAmount.toFixed(2),
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          null,
          'Commission vente pièce',
          savedCommissionId,
          `Commission prélevée automatiquement après commande boutique terminée : ${order.id}`,
        ],
      );

      await manager.update(
        OrderEntity,
        { id: order.id },
        {
          orderStatus: OrderStatus.TERMINEE,
          validatedAmount: order.validatedAmount ?? order.proposedAmount,
          validatedAt: order.validatedAt ?? new Date(),
          completedAt: new Date(),
        },
      );
    });
  }

  private getWalletStatus(balance: number): WalletStatus {
    if (balance <= 0) {
      return WalletStatus.VIDE;
    }

    if (balance < 5000) {
      return WalletStatus.FAIBLE;
    }

    return WalletStatus.ACTIF;
  }

  private async getOrderWithRelations(orderId: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        client: true,
        partnerProfile: {
          user: true,
          wallet: true,
        },
        product: true,
        commissions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private assertAllowedStatusTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    const terminalStatuses = [OrderStatus.TERMINEE, OrderStatus.ANNULEE];

    if (terminalStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        'Cette commande est déjà clôturée et ne peut plus être modifiée.',
      );
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.EN_ATTENTE]: [OrderStatus.CONFIRMEE, OrderStatus.ANNULEE],
      [OrderStatus.CONFIRMEE]: [OrderStatus.EN_TRAITEMENT, OrderStatus.ANNULEE],
      [OrderStatus.EN_TRAITEMENT]: [
        OrderStatus.EN_COURS_ENVOI,
        OrderStatus.ANNULEE,
      ],
      [OrderStatus.EN_COURS_ENVOI]: [OrderStatus.TERMINEE, OrderStatus.ANNULEE],
      [OrderStatus.TERMINEE]: [],
      [OrderStatus.ANNULEE]: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${currentStatus} vers ${nextStatus}.`,
      );
    }
  }
}
