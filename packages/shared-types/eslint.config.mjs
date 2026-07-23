import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBaseConfig } from '@frontend-study/eslint-config/base';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default createBaseConfig({
  project: ['./tsconfig.json'],
  tsconfigRootDir: currentDirectory,
});
