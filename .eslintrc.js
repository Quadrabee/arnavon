module.exports = {
  'root': true,
  'parser': '@typescript-eslint/parser',
  'plugins': [
    '@typescript-eslint',
  ],
  'extends': [
    'eslint:recommended',
    '@enspirit/eslint-config-node',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  'overrides': [
    {
      'files': ['*.spec.*'],
      'rules': {
        'no-unused-expressions': 'off',
      },
    },
  ],
};
