import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/env';

// Initialize PostgreSQL Connection Pool with TCP Keepalive & Resilient Timeouts
export const pool = new Pool(
  config.pg.connectionString
    ? {
        connectionString: config.pg.connectionString,
        ssl: config.pg.ssl,
        max: 10, // Controlled pool size to prevent Azure Flexible Server connection throttling
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 15000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
    : {
        host: config.pg.host,
        port: config.pg.port,
        user: config.pg.user,
        password: config.pg.password,
        database: config.pg.database,
        ssl: config.pg.ssl,
        max: 10,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 15000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
);

// Graceful pool error logging
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Background Event]:', err.message);
});

/**
 * Automatically transforms SQLite/ANSI ? parameter placeholders into PostgreSQL $1, $2, $3...
 * Ensures 100% compatibility with existing query signatures.
 */
export function convertPlaceholders(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export interface RunResult {
  changes: number;
  rowCount: number;
  rows: any[];
}

export interface PreparedStatement {
  get: <T = any>(...params: any[]) => Promise<T | undefined>;
  all: <T = any>(...params: any[]) => Promise<T[]>;
  run: (...params: any[]) => Promise<RunResult>;
}

export interface TxRunner {
  client: PoolClient;
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  get: <T = any>(sql: string, params?: any[]) => Promise<T | undefined>;
  run: (sql: string, params?: any[]) => Promise<RunResult>;
}

function normalizeParams(params: any[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toUpperCase();
    const isTransient =
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ENETUNREACH' ||
      code === '57P01' ||
      msg.includes('etimedout') ||
      msg.includes('connection terminated') ||
      msg.includes('connection timeout') ||
      msg.includes('timeout') ||
      msg.includes('unreachable') ||
      msg.includes('socket closed');
    if (retries > 0 && isTransient) {
      await new Promise((r) => setTimeout(r, 500));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

/**
 * Authoritative PostgreSQL Database Interface
 */
export const db = {
  pool,

  /**
   * Execute query returning all matching rows
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return withRetry(async () => {
      const text = convertPlaceholders(sql);
      const res = await pool.query(text, normalizeParams(params));
      return res.rows as T[];
    });
  },

  /**
   * Execute query returning the first matching row or undefined
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return withRetry(async () => {
      const text = convertPlaceholders(sql);
      const res = await pool.query(text, normalizeParams(params));
      return res.rows[0] as T | undefined;
    });
  },

  /**
   * Execute INSERT / UPDATE / DELETE returning affected row count
   */
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    return withRetry(async () => {
      const text = convertPlaceholders(sql);
      const res = await pool.query(text, normalizeParams(params));
      return {
        changes: res.rowCount || 0,
        rowCount: res.rowCount || 0,
        rows: res.rows,
      };
    });
  },

  /**
   * Execute multiple raw DDL / migration statements
   */
  async exec(sql: string): Promise<void> {
    return withRetry(async () => {
      await pool.query(sql);
    });
  },

  /**
   * PreparedStatement emulator providing .get(), .all(), and .run() with async resolution
   */
  prepare(sql: string): PreparedStatement {
    return {
      get: async <T = any>(...params: any[]): Promise<T | undefined> => {
        return db.get<T>(sql, normalizeParams(params));
      },
      all: async <T = any>(...params: any[]): Promise<T[]> => {
        return db.query<T>(sql, normalizeParams(params));
      },
      run: async (...params: any[]): Promise<RunResult> => {
        return db.run(sql, normalizeParams(params));
      },
    };
  },

  /**
   * Execute transaction with automatic BEGIN, COMMIT, and ROLLBACK
   */
  async transaction<T>(callback: (tx: TxRunner) => Promise<T>): Promise<T> {
    const client = await withRetry(() => pool.connect());
    const tx: TxRunner = {
      client,
      query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
        const text = convertPlaceholders(sql);
        const res = await client.query(text, normalizeParams(params));
        return res.rows as R[];
      },
      get: async <R = any>(sql: string, params: any[] = []): Promise<R | undefined> => {
        const text = convertPlaceholders(sql);
        const res = await client.query(text, normalizeParams(params));
        return res.rows[0] as R | undefined;
      },
      run: async (sql: string, params: any[] = []): Promise<RunResult> => {
        const text = convertPlaceholders(sql);
        const res = await client.query(text, normalizeParams(params));
        return {
          changes: res.rowCount || 0,
          rowCount: res.rowCount || 0,
          rows: res.rows,
        };
      },
    };
    try {
      await client.query('BEGIN');
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await pool.end();
  },
};

export default db;
