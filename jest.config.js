module.exports = {
  testEnvironment: 'jsdom', // Changed from 'node' to 'jsdom'
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'], 
  // setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'], // Original line, but @testing-library/jest-dom is usually enough
};
