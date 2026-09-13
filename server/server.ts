import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { createApp } from './app';
import { config } from './config/env';
import { db } from './db/database';
import { initializeDatabase } from './db/schema';
import { seedDatabase } from './db/seed';
import { emailService } from './services/emailService';

async function bootstrap() {
  try {
    console.log('[Server] Connecting to PostgreSQL and initializing schema...');
    await initializeDatabase();
    console.log('[Server] Seeding initial database records...');
    await seedDatabase();
    console.log('[Server] Loading active SMTP configuration...');
    await emailService.loadActiveConfig();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`========================================================`);
      console.log(`  MEMORIA'26 — BACKEND API SERVER RUNNING (PostgreSQL)`);
      console.log(`  Port:        http://localhost:${config.port}`);
      console.log(`  Health:      http://localhost:${config.port}/api/health`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Postgres DB: ${config.pg.host}:${config.pg.port}/${config.pg.database}`);
      console.log(`========================================================`);
    });

    const handleShutdown = (signal: string) => {
      console.log(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await db.close();
          console.log('Database connection pool closed.');
        } catch (err) {
          console.error('Error closing database pool:', err);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forcefully terminating process.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  }
}

bootstrap();
