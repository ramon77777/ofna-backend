import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';

import { AccountStatus } from '../../common/enums/account-status.enum';
import { PartnerValidationStatus } from '../../common/enums/partner-validation-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { PartnerProfileEntity } from '../partners/entities/partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { LoginResponse } from './interfaces/login-response.interface';

import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokensRepository: Repository<PasswordResetTokenEntity>,

    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  private async signToken(user: UserEntity): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });
  }

  private async assertUniquePhoneAndEmail(
    phone: string,
    email: string | null,
  ): Promise<void> {
    const existingUserByPhone = await this.usersRepository.findOne({
      where: { phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number is already in use');
    }

    if (email) {
      const existingUserByEmail = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('Email is already in use');
      }
    }
  }

  async registerClient(dto: RegisterClientDto): Promise<LoginResponse> {
    const normalizedPhone = dto.phone.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

    await this.assertUniquePhoneAndEmail(normalizedPhone, normalizedEmail);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      role: UserRole.CLIENT,
      firstName: dto.firstName?.trim() ?? null,
      lastName: dto.lastName?.trim() ?? null,
      phone: normalizedPhone,
      email: normalizedEmail,
      passwordHash,
      profilePhotoUrl: null,
      accountStatus: AccountStatus.ACTIVE,
      lastLoginAt: null,
    });

    await this.usersRepository.save(user);

    const freshUser = await this.usersRepository.findOneOrFail({
      where: { id: user.id },
    });

    const accessToken = await this.signToken(freshUser);

    return {
      accessToken,
      user: freshUser,
    };
  }

  async registerPartner(dto: RegisterPartnerDto): Promise<LoginResponse> {
    const normalizedPhone = dto.phone.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

    await this.assertUniquePhoneAndEmail(normalizedPhone, normalizedEmail);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, {
        role: UserRole.PARTNER,
        firstName: dto.firstName?.trim() ?? null,
        lastName: dto.lastName?.trim() ?? null,
        phone: normalizedPhone,
        email: normalizedEmail,
        passwordHash,
        profilePhotoUrl: null,
        accountStatus: AccountStatus.ACTIVE,
        lastLoginAt: null,
      });

      const createdUser = await manager.save(UserEntity, user);

      const partnerProfile = manager.create(PartnerProfileEntity, {
        user: createdUser,
        activityType: dto.activityType,
        businessName: dto.businessName?.trim() || null,
        description: dto.description?.trim() || null,
        interventionZone: dto.interventionZone?.trim() || null,
        address: dto.address?.trim() || null,
        latitude: dto.latitude?.trim() || null,
        longitude: dto.longitude?.trim() || null,
        validationStatus: PartnerValidationStatus.EN_ATTENTE,
        averageRating: '0',
        reviewsCount: 0,
        isAvailable: false,
        isVisible: false,
        validatedAt: null,
      });

      const createdPartnerProfile = await manager.save(
        PartnerProfileEntity,
        partnerProfile,
      );

      const wallet = manager.create(WalletEntity, {
        partnerProfile: createdPartnerProfile,
        balance: '0.00',
        walletStatus: WalletStatus.VIDE,
      });

      await manager.save(WalletEntity, wallet);

      return createdUser;
    });

    const freshUser = await this.usersRepository.findOneOrFail({
      where: { id: savedUser.id },
    });

    const accessToken = await this.signToken(freshUser);

    return {
      accessToken,
      user: freshUser,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const normalizedPhone = dto.phone?.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase();

    if (!normalizedPhone && !normalizedEmail) {
      throw new UnauthorizedException('Phone or email is required');
    }

    const user = await this.usersRepository.findOne({
      where: normalizedPhone
        ? { phone: normalizedPhone }
        : { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const accessToken = await this.signToken(user);

    return {
      accessToken,
      user,
    };
  }

  private generateResetToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async findUserByPhoneOrEmail(
    phone?: string,
    email?: string,
  ): Promise<UserEntity | null> {
    const normalizedPhone = phone?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedPhone && !normalizedEmail) {
      throw new BadRequestException('Phone or email is required');
    }

    return this.usersRepository.findOne({
      where: normalizedPhone
        ? { phone: normalizedPhone }
        : { email: normalizedEmail },
    });
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
    message: string;
    resetToken?: string;
  }> {
    const user = await this.findUserByPhoneOrEmail(dto.phone, dto.email);

    /**
     * Sécurité :
     * On retourne un message générique même si le compte n’existe pas,
     * pour éviter de révéler quels numéros/emails sont inscrits.
     */
    if (!user) {
      return {
        message:
          'Si un compte correspond à ces informations, un code de réinitialisation sera généré.',
      };
    }

    await this.passwordResetTokensRepository
      .createQueryBuilder()
      .update(PasswordResetTokenEntity)
      .set({
        usedAt: new Date(),
      })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('used_at IS NULL')
      .execute();

    const resetToken = this.generateResetToken();
    const tokenHash = await bcrypt.hash(resetToken, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const passwordResetToken = this.passwordResetTokensRepository.create({
      user,
      tokenHash,
      expiresAt,
    });

    await this.passwordResetTokensRepository.save(passwordResetToken);

    /**
     * MVP OFNA :
     * Tant qu’il n’y a pas de SMS/email automatique, on expose le code.
     * Plus tard, on supprimera resetToken de la réponse et on l’enverra
     * par SMS, WhatsApp, email ou tableau admin.
     */
    return {
      message:
        'Si un compte correspond à ces informations, un code de réinitialisation sera généré.',
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.findUserByPhoneOrEmail(dto.phone, dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid reset code');
    }

    const resetToken = dto.token.trim();

    if (!resetToken) {
      throw new BadRequestException('Reset code is required');
    }

    const activeTokens = await this.passwordResetTokensRepository.find({
      where: {
        user: { id: user.id },
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    let validToken: PasswordResetTokenEntity | null = null;

    for (const activeToken of activeTokens) {
      const tokenMatches = await bcrypt.compare(
        resetToken,
        activeToken.tokenHash,
      );

      if (tokenMatches) {
        validToken = activeToken;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);

    validToken.usedAt = new Date();
    await this.passwordResetTokensRepository.save(validToken);

    return {
      message: 'Password reset successfully',
    };
  }

  async me(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return user;
  }
}
