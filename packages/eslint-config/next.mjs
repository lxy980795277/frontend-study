import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import typescriptEslint from 'typescript-eslint';

import { createBaseConfig } from './base.mjs';

/**
 * 创建 Next.js / React workspace 配置。
 *
 * @param {{ project?: string[]; tsconfigRootDir: string }} options 配置参数
 * @returns {import('typescript-eslint').ConfigWithExtends[]}
 */
export const createNextConfig = (options) => {
  const { project = ['./tsconfig.json'], tsconfigRootDir } = options;

  return typescriptEslint.config(
    {
      ignores: ['eslint.config.mjs', '*.config.js', '*.config.mjs', '*.config.ts'],
    },
    ...createBaseConfig({ project, tsconfigRootDir }),
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        globals: {
          ...globals.browser,
        },
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          project,
          tsconfigRootDir,
        },
      },
      plugins: {
        react,
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'arrow-body-style': ['error', 'always'],
        'func-style': ['error', 'expression'],
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-restricted-syntax': [
          'error',
          {
            message: 'Object methods must use arrow-function properties.',
            selector: 'Property[method=true]',
          },
        ],
        'prefer-arrow-callback': 'error',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': 'off',
        'react/jsx-boolean-value': ['error', 'never'],
        'react/jsx-curly-brace-presence': ['error', { children: 'never', props: 'never' }],
        'react/jsx-sort-props': [
          'error',
          {
            callbacksLast: true,
            ignoreCase: true,
            multiline: 'last',
            noSortAlphabetically: false,
            reservedFirst: true,
            shorthandFirst: true,
          },
        ],
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/self-closing-comp': 'error',
      },
    },
  );
};
