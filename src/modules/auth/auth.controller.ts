import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from './interfaces/login-response.interface';
import { UserEntity } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-client')
  async registerClient(@Body() dto: RegisterClientDto): Promise<LoginResponse> {
    return this.authService.registerClient(dto);
  }

  @Post('register-partner')
  async registerPartner(
    @Body() dto: RegisterPartnerDto,
  ): Promise<LoginResponse> {
    return this.authService.registerPartner(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() currentUser: CurrentUserData): Promise<UserEntity> {
    return this.authService.me(currentUser.sub);
  }
}
