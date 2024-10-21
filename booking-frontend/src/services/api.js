import axios from 'axios';

const API_URL = 'https://localhost:3000/api'; // Keep this as is, assuming your backend is still on port 3001

export const getAvailabilities = async (date, appointmentType) => {
  try {
    console.log("getAvailabilities", date, appointmentType)
    const response = await axios.get(`${API_URL}/availabilities`, {
      params: { date, appointmentType } // This is where the fix is
    });

    console.log('API response:', response.data);  // Add this line for debugging

    // Ensure we're always returning an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    throw error;
  }
};

export const bookAppointment = async (appointmentData) => {
  try {
    const response = await axios.post(`${API_URL}/appointments`, appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
};
