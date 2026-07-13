import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

type UserCreateArgs = {
  data: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string;
    role: UserRole;
    customerProfile: {
      create: {
        address?: string;
      };
    };
  };
};

describe('AuthService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_TOKEN_SECRET: 'test-access-secret',
        JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
        JWT_ACCESS_TOKEN_TTL_SECONDS: '900',
        JWT_REFRESH_TOKEN_TTL_SECONDS: '604800',
      };

      return values[key];
    }),
  };
  const metricsService = {
    recordAuthAttempt: jest.fn(),
  };
  const logger = {
    info: jest.fn(),
  };
  const tracingService = {
    startActiveSpan: jest.fn(
      (
        _name: string,
        _attributes: Record<string, unknown>,
        callback: () => unknown,
      ) => callback(),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a customer with a bcrypt password hash and token pair', async () => {
    let createArgs: UserCreateArgs | undefined;
    const prismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn((args: UserCreateArgs) => {
          createArgs = args;

          return Promise.resolve({
            id: 'user-1',
            email: args.data.email,
            passwordHash: args.data.passwordHash,
            name: args.data.name,
            phone: args.data.phone,
            role: args.data.role,
          });
        }),
      },
      refreshToken: {
        create: jest.fn(),
      },
    };
    const service = new AuthService(
      prismaService as never,
      configService as never,
      metricsService as never,
      logger as never,
      tracingService as never,
    );

    const result = await service.registerCustomer({
      email: 'CUSTOMER@EXAMPLE.COM',
      password: 'Password123!',
      name: 'Demo Customer',
      phone: '+15550101010',
      address: '100 Local Test Ave',
    });

    if (!createArgs) {
      throw new Error('Expected Prisma user.create to be called');
    }

    expect(createArgs.data.email).toBe('customer@example.com');
    expect(createArgs.data.role).toBe(UserRole.CUSTOMER);
    expect(createArgs.data.customerProfile.create.address).toBe(
      '100 Local Test Ave',
    );
    expect(createArgs.data.passwordHash).not.toBe('Password123!');
    await expect(
      bcrypt.compare('Password123!', createArgs.data.passwordHash),
    ).resolves.toBe(true);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'customer@example.com',
      name: 'Demo Customer',
      role: UserRole.CUSTOMER,
    });
    expect(prismaService.refreshToken.create).toHaveBeenCalled();
    expect(metricsService.recordAuthAttempt).toHaveBeenCalledWith(
      'register',
      UserRole.CUSTOMER,
      'success',
    );
  });
});
