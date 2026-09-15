module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};