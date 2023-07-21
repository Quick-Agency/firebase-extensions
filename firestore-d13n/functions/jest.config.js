const packageJson = require("./package.json");

module.exports = {
  displayName: packageJson.name,
  rootDir: "./",
  preset: "ts-jest",
  setupFiles: ["<rootDir>/__tests__/jest.setup.ts"],
  testMatch: ["**/__tests__/*.test.ts"],
  testEnvironment: "node",
};
