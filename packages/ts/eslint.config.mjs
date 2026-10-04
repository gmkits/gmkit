import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // TS 推荐配置关闭 no-undef；此包保留原有未声明全局检查。
      'no-undef': 'error',
    },
  },
  {
    files: ['src/core/utils.ts'],
    rules: {
      // 仅环境探测允许 require/空 catch；其它文件仍拒绝静默吞错。
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
    },
  },
];
