import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { closeDatabase, getPool } from './connection.js';
import { listMigrationFiles, resolveMigrationsDirectory } from './migration-files.js';

export async function runMigrations(): Promise<void> {
  const migrationsDirectory = resolveMigrationsDirectory();
  const migrationFiles = listMigrationFiles();

  if (migrationFiles.length === 0) {
    throw new Error(`Nenhuma migration encontrada em ${migrationsDirectory}.`);
  }

  const migrationClient = await getPool().connect();
  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await migrationClient.query("SELECT pg_advisory_lock(hashtext('projetos-tecnihub-migrations'))");

    for (const filename of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const existing = await migrationClient.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum.trim() !== checksum) {
          throw new Error(`A migration já aplicada ${filename} foi alterada.`);
        }
        console.log(`[DB] Migration já aplicada: ${filename}`);
        continue;
      }

      try {
        await migrationClient.query('BEGIN');
        await migrationClient.query(sql);
        await migrationClient.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await migrationClient.query('COMMIT');
      } catch (error) {
        await migrationClient.query('ROLLBACK');
        throw error;
      }
      console.log(`[DB] Migration aplicada: ${filename}`);
    }
  } finally {
    await migrationClient.query("SELECT pg_advisory_unlock(hashtext('projetos-tecnihub-migrations'))").catch(() => undefined);
    migrationClient.release();
  }
}

async function main(): Promise<void> {
  try {
    await runMigrations();
    console.log('[DB] Migrations concluídas com sucesso.');
  } finally {
    await closeDatabase();
  }
}

main().catch(error => {
  console.error('[DB] Falha ao executar migrations:', error);
  process.exitCode = 1;
});
