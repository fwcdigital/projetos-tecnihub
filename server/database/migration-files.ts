import fs from 'fs';
import path from 'path';

export function resolveMigrationsDirectory(): string {
  const configured = process.env.MIGRATIONS_DIR?.trim();
  const candidates = configured
    ? [path.resolve(configured)]
    : [
        path.resolve(process.cwd(), 'server', 'database', 'migrations'),
        path.resolve(process.cwd(), 'dist', 'migrations')
      ];

  const directory = candidates.find(candidate => fs.existsSync(candidate));
  if (!directory) {
    throw new Error(`Diretório de migrations não encontrado. Locais verificados: ${candidates.join(', ')}`);
  }
  return directory;
}

export function listMigrationFiles(): string[] {
  return fs.readdirSync(resolveMigrationsDirectory())
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();
}

