require('dotenv').config();

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    // Uncomment the following lines to suppress specific console methods during tests
    // log: jest.fn(),
    // error: jest.fn(),
    // warn: jest.fn(),
}; 