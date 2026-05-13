import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEntity } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { UpdateOrderDeliveryFeeDto } from './dto/update-order-delivery-fee.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.CLIENT)
  @Post()
  async createOrder(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderEntity> {
    return this.ordersService.createOrder(currentUser, dto);
  }

  @Roles(UserRole.CLIENT)
  @Get('me')
  async getMyOrders(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<OrderEntity[]> {
    return this.ordersService.getClientOrders(currentUser.sub);
  }

  @Roles(UserRole.PARTNER)
  @Get('partner/me')
  async getPartnerOrders(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<OrderEntity[]> {
    return this.ordersService.getPartnerOrders(currentUser.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  async getAllOrdersForAdmin(): Promise<OrderEntity[]> {
    return this.ordersService.getAllOrdersForAdmin();
  }

  @Roles(UserRole.CLIENT)
  @Patch(':orderId/cancel')
  async cancelOrderByClient(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
  ): Promise<OrderEntity> {
    return this.ordersService.cancelOrderByClient(currentUser, orderId);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':orderId/status')
  async updateOrderStatus(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderEntity> {
    return this.ordersService.updateOrderStatus(currentUser, orderId, dto);
  }

  @Roles(UserRole.PARTNER)
  @Patch(':orderId/delivery-fee')
  async updateDeliveryFee(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderDeliveryFeeDto,
  ): Promise<OrderEntity> {
    return this.ordersService.updateDeliveryFee(currentUser, orderId, dto);
  }

  @Roles(UserRole.CLIENT, UserRole.PARTNER, UserRole.ADMIN)
  @Get(':orderId')
  async getOrderById(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('orderId') orderId: string,
  ): Promise<OrderEntity> {
    return this.ordersService.getOrderByIdForUser(currentUser, orderId);
  }
}
