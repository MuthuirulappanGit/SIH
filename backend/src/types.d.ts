declare module "*.css";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      DATABASE_PATH?: string;
      JWT_SECRET?: string;
      ADMIN_USERNAME?: string;
      ADMIN_PASSWORD?: string;
      DEVICE_API_SECRET?: string;
      CORS_ORIGIN?: string;
      NODE_ENV?: string;
    }
  }
}

export {};
