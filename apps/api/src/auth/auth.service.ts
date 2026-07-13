import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { TracingService } from '../common/tracing/tracing.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
  TokenPair,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto, RegisterRoleDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
    private readonly tracingService: TracingService,
  ) {
    this.accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET') ??
      'local-dev-access-secret-change-me';
    this.refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET') ??
      'local-dev-refresh-secret-change-me';
    this.accessTokenTtlSeconds = Number(
      this.configService.get<string>('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? 900,
    );
    this.refreshTokenTtlSeconds = Number(
      this.configService.get<string>('JWT_REFRESH_TOKEN_TTL_SECONDS') ??
        604_800,
    );
  }

  registerCustomer(registerDto: RegisterDto): Promise<TokenPair> {
    return this.registerUser(registerDto, UserRole.CUSTOMER);
  }

  registerRestaurantOwner(registerDto: RegisterDto): Promise<TokenPair> {
    return this.registerUser(registerDto, UserRole.RESTAURANT_OWNER);
  }

  registerRider(registerDto: RegisterDto): Promise<TokenPair> {
    return this.registerUser(registerDto, UserRole.RIDER);
  }

  registerRole(registerDto: RegisterRoleDto): Promise<TokenPair> {
    return this.registerUser(registerDto, registerDto.role);
  }

  async login(loginDto: LoginDto): Promise<TokenPair> {
    return this.tracingService.startActiveSpan(
      'AuthService.login',
      {
        'food_delivery.layer': 'service',
        'food_delivery.auth.action': 'login',
      },
      async () => {
        const user = await this.prismaService.user.findUnique({
          where: { email: loginDto.email.toLowerCase() },
        });

        if (!user) {
          this.metricsService.recordAuthAttempt('login', 'unknown', 'failure');
          throw new UnauthorizedException('Invalid email or password');
        }

        const passwordMatches = await bcrypt.compare(
          loginDto.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          this.metricsService.recordAuthAttempt('login', user.role, 'failure');
          throw new UnauthorizedException('Invalid email or password');
        }

        this.metricsService.recordAuthAttempt('login', user.role, 'success');
        this.logger.info('User logged in', {
          userRole: user.role,
          authAction: 'login',
        });

        return this.issueTokenPair(user);
      },
    );
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokenPair> {
    return this.tracingService.startActiveSpan(
      'AuthService.refresh',
      {
        'food_delivery.layer': 'service',
        'food_delivery.auth.action': 'refresh',
      },
      async () => {
        const payload = this.verifyRefreshPayload(refreshTokenDto.refreshToken);
        const tokenRecord = await this.prismaService.refreshToken.findFirst({
          where: {
            id: payload.refreshTokenId,
            userId: payload.sub,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });

        if (!tokenRecord) {
          this.metricsService.recordAuthAttempt(
            'refresh',
            'unknown',
            'failure',
          );
          throw new UnauthorizedException('Refresh token is invalid');
        }

        const tokenMatches = await bcrypt.compare(
          refreshTokenDto.refreshToken,
          tokenRecord.tokenHash,
        );

        if (!tokenMatches) {
          this.metricsService.recordAuthAttempt(
            'refresh',
            tokenRecord.user.role,
            'failure',
          );
          throw new UnauthorizedException('Refresh token is invalid');
        }

        await this.prismaService.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });

        this.metricsService.recordAuthAttempt(
          'refresh',
          tokenRecord.user.role,
          'success',
        );

        return this.issueTokenPair(tokenRecord.user);
      },
    );
  }

  async logout(refreshTokenDto: RefreshTokenDto): Promise<{ status: string }> {
    const payload = this.verifyRefreshPayload(refreshTokenDto.refreshToken);

    await this.prismaService.refreshToken.updateMany({
      where: {
        id: payload.refreshTokenId,
        userId: payload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.info('User logged out', {
      authAction: 'logout',
    });

    return { status: 'ok' };
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    try {
      const payload = jwt.verify(
        token,
        this.accessTokenSecret,
      ) as JwtAccessPayload;

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Access token is invalid');
    }
  }

  private async registerUser(
    registerDto: RegisterDto,
    role: UserRole,
  ): Promise<TokenPair> {
    return this.tracingService.startActiveSpan(
      'AuthService.registerUser',
      {
        'food_delivery.layer': 'service',
        'food_delivery.auth.action': 'register',
        'food_delivery.user.role': role,
      },
      async () => {
        const email = registerDto.email.toLowerCase();
        const existingUser = await this.prismaService.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          this.metricsService.recordAuthAttempt('register', role, 'failure');
          throw new ConflictException('Email is already registered');
        }

        const passwordHash = await bcrypt.hash(registerDto.password, 12);
        const user = await this.prismaService.user.create({
          data: {
            email,
            passwordHash,
            name: registerDto.name,
            phone: registerDto.phone,
            role,
            customerProfile:
              role === UserRole.CUSTOMER
                ? {
                    create: {
                      address: registerDto.address,
                    },
                  }
                : undefined,
            riderProfile:
              role === UserRole.RIDER
                ? {
                    create: {},
                  }
                : undefined,
          },
        });

        this.metricsService.recordAuthAttempt('register', role, 'success');
        this.logger.info('User registered', {
          userRole: role,
          authAction: 'register',
        });

        return this.issueTokenPair(user);
      },
    );
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const authenticatedUser = this.toAuthenticatedUser(user);
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      } satisfies JwtAccessPayload,
      this.accessTokenSecret,
      { expiresIn: this.accessTokenTtlSeconds },
    );
    const refreshTokenId = randomUUID();
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        refreshTokenId,
      } satisfies JwtRefreshPayload,
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenTtlSeconds },
    );
    const expiresAt = new Date(
      Date.now() + this.refreshTokenTtlSeconds * 1_000,
    );

    await this.prismaService.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 12),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: authenticatedUser,
    };
  }

  private verifyRefreshPayload(refreshToken: string): JwtRefreshPayload {
    try {
      return jwt.verify(
        refreshToken,
        this.refreshTokenSecret,
      ) as JwtRefreshPayload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
