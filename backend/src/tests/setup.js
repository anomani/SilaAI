// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  // Add any global setup here
});

// Global test teardown
afterAll(() => {
  // Add any global cleanup here
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
}); 