export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    'subject-empty': [2, 'never'],
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'docs', 'chore', 'test', 'perf', 'build', 'ci', 'revert']],
  },
};
