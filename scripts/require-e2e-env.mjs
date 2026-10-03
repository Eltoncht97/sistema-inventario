import { accessSync, constants } from 'node:fs';

const e2eEnvironmentPath = '.env.e2e';

try {
  accessSync(e2eEnvironmentPath, constants.R_OK);
} catch {
  console.error(
    'No se encontró .env.e2e. Créalo con: cp .env.e2e.example .env.e2e',
  );
  process.exitCode = 1;
}
