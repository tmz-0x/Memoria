import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/memoria',
  pg: {
    connectionString: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('{your-password}') ? process.env.DATABASE_URL : undefined,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'memoria',
    ssl: (process.env.PGSSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('amazonaws.com') || process.env.DATABASE_URL?.includes('azure.com') || (process.env.PGHOST && (process.env.PGHOST.includes('amazonaws.com') || process.env.PGHOST.includes('azure.com')))) ? { rejectUnauthorized: false } : undefined,
  },
  jwtSecret: process.env.JWT_SECRET || 'memoria_eclipse_2026_jwt_secret_dev_key',
  qrSecret: process.env.QR_SECRET || 'memoria_qr_cryptographic_signing_key_2026',
  authTokenExpiry: process.env.AUTH_TOKEN_EXPIRY || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '5242880', 10), // 5MB

  // Authoritative ticket pricing in Integer LKR
  pricing: {
    student: parseInt(process.env.UNIVERSITY_TICKET_PRICE || '200', 10),
    outsider: parseInt(process.env.OUTSIDER_TICKET_PRICE || '1000', 10),
  },

  // University registration format: 2-3 uppercase letters followed by 5-7 digits (e.g. FC122716, AS104921)
  studentRegRegex: /^[A-Za-z]{2,3}\d{5,7}$/,

  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Memoria\'26 Ticketing Desk" <tickets@memoria.lk>',
  },
};
