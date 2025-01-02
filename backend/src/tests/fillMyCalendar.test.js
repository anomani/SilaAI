const { fillMyCalendar } = require('../ai/fillMyCalendar');
const { getNumberOfSuggestedResponses } = require('../model/messages');
const { getAvailableSlots } = require('../ai/tools/getAvailableSlots');
const { getOldClients, getNumberOfCustomersContacted } = require('../model/clients');
const { OpenAI } = require('openai');

// Mock all dependencies
jest.mock('../model/messages');
jest.mock('../ai/tools/getAvailableSlots');
jest.mock('../model/clients');
jest.mock('openai');
jest.mock('../model/aiPrompt', () => ({
    storeAIPrompt: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../model/dbUtils', () => ({
    getDB: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({ rows: [] })
    })
}));

// Increase timeout for all tests
jest.setTimeout(10000);

describe('fillMyCalendar', () => {
    // Reset all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock OpenAI instance with proper structure
        const mockParse = jest.fn();
        OpenAI.mockImplementation(() => ({
            beta: {
                chat: {
                    completions: {
                        parse: mockParse
                    }
                }
            }
        }));
    });

    test('should skip if there are 20 or more suggested responses', async () => {
        // Arrange
        getNumberOfSuggestedResponses.mockResolvedValue(20);
        
        // Act
        const result = await fillMyCalendar(1);
        
        // Assert
        expect(result).toBe('Skipping fillMyCalendar: 20 or more suggested responses already stored.');
        expect(getNumberOfSuggestedResponses).toHaveBeenCalledWith(1);
        expect(getAvailableSlots).not.toHaveBeenCalled();
    });

    test('should skip if there are no empty slots available', async () => {
        // Arrange
        getNumberOfSuggestedResponses.mockResolvedValue(0);
        getAvailableSlots.mockResolvedValue([]);
        
        // Act
        const result = await fillMyCalendar(1);
        
        // Assert
        expect(result).toBe('Skipping fillMyCalendar: No empty slots available.');
        expect(getAvailableSlots).toHaveBeenCalled();
    });

    test('should skip if there are no eligible clients', async () => {
        // Arrange
        getNumberOfSuggestedResponses.mockResolvedValue(0);
        getAvailableSlots.mockResolvedValue([{
            date: '2024-01-01',
            slotsByGroup: { '1': ['09:00-10:00'] }
        }]);
        getOldClients.mockResolvedValue([]);
        
        // Act
        const result = await fillMyCalendar(1);
        
        // Assert
        expect(result).toBe('No outreach messages sent. No eligible clients.');
        expect(getOldClients).toHaveBeenCalledWith(1);
    });

    test('should process clients and generate suggestions successfully', async () => {
        // Arrange
        const mockUserId = 1;
        const mockClients = [
            { id: 1, lastvisitdate: '2023-12-01', group: 1 },
            { id: 2, lastvisitdate: '2023-11-01', group: 2 }
        ];
        const mockAvailableSlots = [{
            date: '2024-01-01',
            slotsByGroup: {
                '1': ['09:00-10:00'],
                '2': ['14:00-15:00']
            }
        }];
        const mockStrategy = {
            recommendedStrategy: 'Contact recent clients',
            specificActions: {
                customersToContact: [1, 2]
            }
        };

        getNumberOfSuggestedResponses.mockResolvedValue(0);
        getAvailableSlots.mockResolvedValue(mockAvailableSlots);
        getOldClients.mockResolvedValue(mockClients);
        getNumberOfCustomersContacted.mockResolvedValue(5);
        
        // Mock OpenAI response
        const mockParse = jest.fn().mockResolvedValue({
            choices: [{
                message: {
                    parsed: mockStrategy
                }
            }]
        });
        OpenAI.mockImplementation(() => ({
            beta: {
                chat: {
                    completions: {
                        parse: mockParse
                    }
                }
            }
        }));

        // Act
        const result = await fillMyCalendar(mockUserId);

        // Assert
        expect(result).toContain('Suggested responses saved for');
        expect(getNumberOfSuggestedResponses).toHaveBeenCalledWith(mockUserId);
        expect(getAvailableSlots).toHaveBeenCalled();
        expect(getOldClients).toHaveBeenCalledWith(mockUserId);
        expect(getNumberOfCustomersContacted).toHaveBeenCalledWith(30, mockUserId);
        expect(mockParse).toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
        // Arrange
        getNumberOfSuggestedResponses.mockRejectedValue(new Error('Database error'));
        
        // Act & Assert
        await expect(fillMyCalendar(1)).rejects.toThrow('Database error');
    });

    test('should use default strategy when OpenAI fails', async () => {
        // Arrange
        const mockUserId = 1;
        const mockClients = [
            { id: 1, lastvisitdate: '2023-12-01', group: 1 },
            { id: 2, lastvisitdate: '2023-11-01', group: 2 }
        ];
        const mockAvailableSlots = [{
            date: '2024-01-01',
            slotsByGroup: {
                '1': ['09:00-10:00'],
                '2': ['14:00-15:00']
            }
        }];

        getNumberOfSuggestedResponses.mockResolvedValue(0);
        getAvailableSlots.mockResolvedValue(mockAvailableSlots);
        getOldClients.mockResolvedValue(mockClients);
        getNumberOfCustomersContacted.mockResolvedValue(5);
        
        // Mock OpenAI to throw an error
        const mockParse = jest.fn().mockRejectedValue(new Error('OpenAI API error'));
        OpenAI.mockImplementation(() => ({
            beta: {
                chat: {
                    completions: {
                        parse: mockParse
                    }
                }
            }
        }));

        // Act
        const result = await fillMyCalendar(mockUserId);

        // Assert
        expect(result).toContain('Suggested responses saved for');
        expect(mockParse).toHaveBeenCalled();
    });
}); 