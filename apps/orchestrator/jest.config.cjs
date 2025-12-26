module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@insurance-lead-gen/core$': '<rootDir>/../../packages/core/src',
    '^@insurance-lead-gen/types$': '<rootDir>/../../packages/types/src',
    '^@insurance-lead-gen/config$': '<rootDir>/../../packages/config/src',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
