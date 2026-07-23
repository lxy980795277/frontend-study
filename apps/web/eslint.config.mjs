import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNextConfig } from '@frontend-study/eslint-config/next';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default createNextConfig({
  project: ['./tsconfig.json'],
  tsconfigRootDir: currentDirectory,
});
