import 'dotenv/config';
import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;

/** @internal Permite validar os repositórios contra PostgreSQL embutido sem alterar o runtime. */
export function setDatabasePoolForTests(testPool: Pool | null): void {
  pool = testPool;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL (ou SUPABASE_DB_URL) não foi configurada.');
  }

  const sslSetting = process.env.DATABASE_SSL?.trim().toLowerCase();
  const isSupabase = connectionString.includes('.supabase.co') || connectionString.includes('.pooler.supabase.com');
  const useSsl = sslSetting === 'true' || (sslSetting !== 'false' && (isSupabase || process.env.NODE_ENV === 'production'));

  return {
    connectionString,
    ssl: useSsl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
    max: parsePositiveInteger(process.env.DATABASE_POOL_MAX, 10),
    idleTimeoutMillis: parsePositiveInteger(process.env.DATABASE_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMillis: parsePositiveInteger(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10_000)
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(createPoolConfig());
    pool.on('error', error => {
      console.error('[DB] Erro inesperado em conexão ociosa:', error);
    });
  }
  return pool;
}

export async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    const activePool = pool;
    pool = null;
    await activePool.end();
  }
}
