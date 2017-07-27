// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    browser: true,
  },
  // https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
  extends: 'standard',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  'rules': {
	"no-useless-escape": 0,
    "semi": 0,
    "indent": 1,
    "quotes":1,
    "eol-last":1,
    "padded-blocks":1,
    "no-throw-literal":1,
    "no-useless-call":1,
    "no-extra-boolean-cast":1,
    "operator-linebreak":1,
    "no-eval": 1,
    "no-undef": 1,
    "no-unused-vars": 1,
    "one-var":1,
    "no-new":0,
    "camelcase":1,
    // allow paren-less arrow functions
    'arrow-parens': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
}