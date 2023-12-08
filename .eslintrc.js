module.exports = {
  env: {
    node: true
  },
  extends: ["eslint:all", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "sort-keys-fix"],
  root: true,
  rules: {
    curly: "off",
    "id-length": "off",
    "max-lines-per-function": "off",
    "max-params": "off",
    "max-statements": "off",
    "new-cap": "off",
    "no-console": "off",
    "no-magic-numbers": "off",
    "no-useless-return": "off",
    "one-var": "off",
    "sort-imports": "off",
    "sort-keys-fix/sort-keys-fix": "warn"
  }
}
