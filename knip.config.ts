import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['commitlint.config.mjs', 'prettier.config.mjs'],
      project: ['*.{ts,mts,cts,js,mjs,cjs}'],
    },
    'apps/web': {
      entry: ['src/app/**/{page,layout,error,global-error,not-found}.tsx', 'playwright.config.ts', 'vitest.config.ts'],
      project: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    },
    'apps/server': {
      entry: ['src/main.ts', 'prisma/prisma.config.ts', 'vitest.config.ts'],
      project: ['src/**/*.ts'],
      ignore: ['src/generated/**'],
    },
    'packages/shared-types': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },
    'packages/eslint-config': {
      entry: ['*.mjs'],
      project: ['*.mjs'],
    },
    'packages/typescript-config': {
      entry: [],
      project: [],
    },
  },
  rules: {
    exports: 'off',
    types: 'off',
    enumMembers: 'off',
    duplicates: 'off',
  },
  ignoreDependencies: [
    '@commitlint/config-conventional',
    '@frontend-study/eslint-config',
    '@frontend-study/typescript-config',
    '@prisma/client',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'eslint',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    'globals',
    'husky',
    'lint-staged',
    'next',
    'postcss',
    'prettier',
    'prettier-plugin-tailwindcss',
    'turbo',
    'tailwindcss',
    'tw-animate-css',
    'typescript',
  ],
};

export default config;
