export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "3000"),
};
