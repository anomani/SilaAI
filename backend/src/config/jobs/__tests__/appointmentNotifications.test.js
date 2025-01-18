const { sendNextDayAppointmentReminders, convertTo12Hour } = require('../appointmentNotifications');
const { getAppointmentsByDay } = require('../../../model/appointment');
const { getClientById } = require('../../../model/clients');
const { sendMessage } = require('../../twilio');

// Mock all the dependencies
jest.mock('../../../model/appointment');
jest.mock('../../../model/clients');
jest.mock('../../twilio');

// Mock the modules that are causing issues
jest.mock('../../../ai/scheduling', () => ({
    // Add any functions that are imported from scheduling.js
}));

describe('appointmentNotifications', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('sendNextDayAppointmentReminders', () => {
        it('should send reminders for all appointments scheduled for tomorrow', async () => {
            // Mock data
            const mockAppointments = [
                { clientid: 1, starttime: '14:30', date: '2024-01-19' },
                { clientid: 2, starttime: '09:15', date: '2024-01-19' }
            ];

            const mockClients = {
                1: { firstname: 'John', phonenumber: '+1234567890' },
                2: { firstname: 'Jane', phonenumber: '+0987654321' }
            };

            // Setup mocks
            getAppointmentsByDay.mockResolvedValue(mockAppointments);
            getClientById.mockImplementation((id) => Promise.resolve(mockClients[id]));
            sendMessage.mockResolvedValue();

            // Execute function
            const userId = 1;
            await sendNextDayAppointmentReminders(userId);

            // Verify getAppointmentsByDay was called with correct date
            expect(getAppointmentsByDay).toHaveBeenCalledTimes(1);
            expect(getAppointmentsByDay.mock.calls[0][0]).toBe(userId);
            
            // Verify client lookups
            expect(getClientById).toHaveBeenCalledTimes(2);
            expect(getClientById).toHaveBeenCalledWith(1);
            expect(getClientById).toHaveBeenCalledWith(2);

            // Verify messages were sent
            expect(sendMessage).toHaveBeenCalledTimes(2);
            expect(sendMessage.mock.calls[0][0]).toBe('+1234567890');
            expect(sendMessage.mock.calls[0][1]).toContain('2:30 PM');
            expect(sendMessage.mock.calls[1][0]).toBe('+0987654321');
            expect(sendMessage.mock.calls[1][1]).toContain('9:15 AM');
        });

        it('should skip clients without phone numbers', async () => {
            const mockAppointments = [
                { clientid: 1, starttime: '14:30', date: '2024-01-19' }
            ];

            const mockClient = { firstname: 'John', phonenumber: null };

            getAppointmentsByDay.mockResolvedValue(mockAppointments);
            getClientById.mockResolvedValue(mockClient);
            sendMessage.mockResolvedValue();

            await sendNextDayAppointmentReminders(1);

            expect(sendMessage).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            // Mock console.error to prevent actual logging during test
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            getAppointmentsByDay.mockRejectedValue(new Error('Database error'));

            await sendNextDayAppointmentReminders(1);

            expect(consoleSpy).toHaveBeenCalled();
            expect(sendMessage).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('convertTo12Hour', () => {
        it('should convert 24-hour times to 12-hour format correctly', () => {
            expect(convertTo12Hour('14:30')).toBe('2:30 PM');
            expect(convertTo12Hour('09:15')).toBe('9:15 AM');
            expect(convertTo12Hour('00:00')).toBe('12:00 AM');
            expect(convertTo12Hour('12:00')).toBe('12:00 PM');
            expect(convertTo12Hour('23:59')).toBe('11:59 PM');
        });
    });
}); 