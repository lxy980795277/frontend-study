import typescriptEslint from 'typescript-eslint';

import { createBaseConfig } from './base.mjs';

/**
 * 创建 NestJS workspace 配置。
 *
 * @param {{ project?: string[]; tsconfigRootDir: string }} options 配置参数
 * @returns {import('typescript-eslint').ConfigWithExtends[]}
 */
export function createNestConfig(options) {
  const { project = ['./tsconfig.json'], tsconfigRootDir } = options;

  return typescriptEslint.config(
    {
      ignores: [
        'eslint.config.mjs',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/*.config.ts',
      ],
    },
    ...createBaseConfig({ project, tsconfigRootDir }),
    {
      files: ['**/*.{ts,js}'],
      languageOptions: {
        parserOptions: {
          project,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            ignoreRestSiblings: true,
            varsIgnorePattern: '^_',
          },
        ],
        'no-console': 'off',
      },
    },
  );
}
