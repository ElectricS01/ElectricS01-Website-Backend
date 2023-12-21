module.exports = {
  env: {
    node: true
  },
  extends: ["eslint:all", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "sort-keys-fix"],
  root: true,
  overrides: [
    {
      files: ["*.js"],
      rules: {
        "sort-keys-fix/sort-keys-fix": "off",
        "sort-keys": "off"
      }
    }
  ],
  rules: {
    "array-element-newline": "off",
    "consistent-return": "off",
    curly: "off",
    "dot-location": "off",
    "func-names": ["error", "as-needed"],
    "function-call-argument-newline": "off",
    "function-paren-newline": "off",
    "id-length": "off",
    indent: "off",
    "max-depth": "off",
    "max-len": "off",
    "max-lines": "off",
    "max-lines-per-function": "off",
    "max-params": "off",
    "max-statements": "off",
    "new-cap": "off",
    "no-console": "off",
    "no-extra-parens": "off",
    "no-magic-numbers": "off",
    "no-ternary": "off",
    "no-undefined": "off",
    "no-useless-return": "off",
    "nonblock-statement-body-position": "off",
    "object-curly-spacing": "off",
    "object-property-newline": "off",
    "one-var": "off",
    "padded-blocks": "off",
    "prefer-named-capture-group": "off",
    "quote-props": "off",
    "require-atomic-updates": "off",
    "require-unicode-regexp": "off",
    semi: "off",
    "sort-imports": "off",
    "sort-keys-fix/sort-keys-fix": "error",
    "space-before-function-paren": "off"
  }
}
