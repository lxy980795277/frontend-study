import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

/**
 * 创建适用于所有 TypeScript workspace 的基础 ESLint 配置。
 *
 * @param {{ project?: string[]; tsconfigRootDir: string }} options 配置参数
 * @returns {import('typescript-eslint').ConfigWithExtends[]}
 */
export function createBaseConfig(options) {
  const { project = ['./tsconfig.json'], tsconfigRootDir } = options;

  return typescriptEslint.config(
    {
      ignores: [
        'dist/**',
        'build/**',
        '.next/**',
        'node_modules/**',
        'coverage/**',
        'playwright-report/**',
        'test-results/**',
        '**/*.d.ts',
      ],
    },
    eslint.configs.recommended,
    ...typescriptEslint.configs.recommendedTypeChecked,
    {
      files: ['**/*.{ts,tsx,js,jsx,mjs}'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: {
          ...globals.node,
        },
        parserOptions: {
          project,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            fixStyle: 'inline-type-imports',
            prefer: 'type-imports',
          },
        ],
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            ignoreRestSiblings: true,
            varsIgnorePattern: '^_',
          },
        ],
        eqeqeq: ['warn', 'always', { null: 'ignore' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-var': 'error',
        'prefer-const': 'error',
      },
    },
    {
      files: ['**/*.{js,mjs,cjs}'],
      ...typescriptEslint.configs.disableTypeChecked,
    },
    prettier,
  );
}
