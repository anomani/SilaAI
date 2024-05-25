// frontend/src/services/api.js
import axios from 'axios';

// Replace with your backend API URL
const API_URL = 'http://localhost:3000/api/followup';

export const sendFollowUpMessages = async () => {
  try {
    const response = await axios.get(`${API_URL}/send-followups`);
    return response.data;
  } catch (error) {
    console.error('Error sending follow-up messages:', error);
    throw error;
  }
};


export const getClients = async () => {
  try {
    const response = await axios.get(`${API_URL}/clients`);
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

