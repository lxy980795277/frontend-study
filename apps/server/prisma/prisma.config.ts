import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnvironment } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));
const environmentFile = resolve(currentDirectory, '../env/.env.dev');

loadEnvironment({
  path: environmentFile,
  quiet: true,
});

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  schema: resolve(currentDirectory, 'schema.prisma'),
});
