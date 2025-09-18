// Test setup file
const { logger } = require('../src/utils/logger');

// Suppress logs during testing
logger.silent = true;

// Setup test database connection
beforeAll(async () => {
  // Initialize test database
});

afterAll(async () => {
  // Close database connections
});
