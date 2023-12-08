module.exports = {
  env: {
    node: true
  },
  extends: ["eslint:all", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "sort-keys-fix"],
  root: true,
  rules: {
    "@stylistic/js/curly": "off",
    "func-names": ["error", "as-needed"],
    "id-length": "off",
    "@stylistic/js/indent": "off",
    "max-depth": "off",
    "max-lines": "off",
    "max-lines-per-function": "off",
    "max-params": "off",
    "max-statements": "off",
    "new-cap": "off",
    "no-console": "off",
    "no-magic-numbers": "off",
    "no-ternary": "off",
    "no-undefined": "off",
    "no-useless-return": "off",
    "one-var": "off",
    "prefer-named-capture-group": "off",
    "quote-props": "off",
    "require-atomic-updates": "off",
    "require-unicode-regexp": "off",
    "sort-imports": "off",
    "sort-keys-fix/sort-keys-fix": "error"
  }
}
