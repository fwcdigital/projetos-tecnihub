import fs from 'node:fs';
import path from 'node:path';

if (process.platform !== 'win32') {
  const platformPackage = `${process.platform}-${process.arch}`;
  const candidates = [
    path.resolve('node_modules', '@esbuild', platformPackage, 'bin', 'esbuild'),
    path.resolve('node_modules', 'esbuild', 'bin', 'esbuild'),
    path.resolve('node_modules', 'tsx', 'node_modules', '@esbuild', platformPackage, 'bin', 'esbuild')
  ];
  let fixed = 0;
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    fs.chmodSync(candidate, 0o755);
    fixed += 1;
  }
  if (fixed === 0) {
    throw new Error(`Binário do esbuild não encontrado para ${platformPackage}. Execute npm ci antes do build.`);
  }
  console.log(`[build] Permissão executável confirmada para ${fixed} binário(s) do esbuild.`);
}
