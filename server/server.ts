import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { createApp } from './app';
import { config } from './config/env';
import { db } from './db/database';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`========================================================`);
  console.log(`  MEMORIA'26 — BACKEND API SERVER RUNNING`);
  console.log(`  Port:        http://localhost:${config.port}`);
  console.log(`  Health:      http://localhost:${config.port}/api/health`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Database:    ${config.databasePath}`);
  console.log(`========================================================`);
});

// Graceful shutdown handling
const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    try {
      db.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });

  // Force close after 5 seconds if still hanging
  setTimeout(() => {
    console.error('Forcefully terminating process.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
