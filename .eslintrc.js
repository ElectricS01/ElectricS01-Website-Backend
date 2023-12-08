module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ["eslint:all", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-useless-return": "off",
    "one-var": "off",
    curly: "off",
    "new-cap": "off"
  }
}
