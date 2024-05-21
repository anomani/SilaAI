const getAppointments = require('../src/config/headlessBrowser');

describe('Phantom Cloud API Integration', () => {
  it('should fetch appointments correctly', async () => {
    const appointments = await getAppointments();
    expect(appointments).toHaveProperty('data')
    // expect(appointments).toBeInstanceOf(Array);
    // expect(appointments).not.toHaveLength(0);
    // appointments.forEach(appointment => {
    //   expect(appointment).toHaveProperty('name');
    //   expect(appointment).toHaveProperty('phone');
    //   expect(appointment).toHaveProperty('datetime');
    // });
  }, 100000);

//   it('should handle errors gracefully', async () => {
//     // Mocking axios to throw an error
//     jest.mock('axios', () => ({
//       post: jest.fn().mockRejectedValue(new Error('Network error'))
//     }));
//     await expect(getAppointments()).rejects.toThrow('Network error');
//   });
});
