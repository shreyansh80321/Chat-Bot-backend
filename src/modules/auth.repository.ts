import prisma from "../config/prisma.js";
import { AuthProvider } from "../generated/prisma/enums.js";

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      auth: true,
    },
  });
};

export const findUserByGoogleId = async (googleId: string) => {
  return prisma.auth.findUnique({
    where: {
      providerUserId: googleId,
    },
    include: {
      user: true,
    },
  });
};

interface CreateUserParams {
  userRefId: string;
  name: string;
  email: string;
  googleId: string;
}

export const createUser = async ({
  userRefId,
  name,
  email,
  googleId,
}: CreateUserParams) => {
  return prisma.user.create({
    data: {
      userRefId,
      name,
      email,
      auth: {
        create: {
          provider: AuthProvider.GOOGLE,
          providerUserId: googleId,
        },
      },
    },
    include: {
      auth: true,
    },
  });
};

export const createSession = async ({
  userId,
  refreshToken,
  deviceId,
  userAgent,
  ipAddress,
  expiresAt,
}: {
  userId: string;
  refreshToken: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}) => {
  return prisma.session.create({
    data: {
      userId,
      refreshToken,
      deviceId: deviceId ?? null,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    },
  });
};

export const findSessionByRefreshToken = async (refreshToken: string) => {
  return prisma.session.findUnique({
    where: {
      refreshToken,
    },
    include: {
      user: true,
    },
  });
};

export const deleteSession = async (refreshToken: string) => {
  return prisma.session.delete({
    where: {
      refreshToken,
    },
  });
};
