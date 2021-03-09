module.exports = {
  'extends': '@enspirit/eslint-config-node',
  'overrides': [
    {
      'files': ['tests/**/*.spec.js'], // Or *.test.js
      'rules': {
        'no-unused-expressions': 'off'
      }
    }
  ]
};
