import "dotenv/config";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  DATABASE_URL: getEnv("DATABASE_URL"),
  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  ACCESS_TOKEN_EXPIRY: getEnv("ACCESS_TOKEN_EXPIRY"),
  REFRESH_TOKEN_EXPIRY: getEnv("REFRESH_TOKEN_EXPIRY"),
};
