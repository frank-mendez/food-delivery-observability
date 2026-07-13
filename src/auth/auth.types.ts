import { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
};

export type JwtAccessPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

export type JwtRefreshPayload = {
  sub: string;
  refreshTokenId: string;
};
