import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNestConfig } from '@frontend-study/eslint-config/nest';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ['src/generated/**'],
  },
  ...createNestConfig({
    project: ['./tsconfig.json'],
    tsconfigRootDir: currentDirectory,
  }),
];
