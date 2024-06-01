// frontend/src/services/api.js
import axios from 'axios';

// Replace with your backend API URL
const API_URL = 'https://lab-sweeping-typically.ngrok-free.app/api';

export const sendFollowUpMessages = async () => {
  try {
    const response = await axios.get(`${API_URL}/followup/send-followups`);
    return response.data;
  } catch (error) {
    console.error('Error sending follow-up messages:', error);
    throw error;
  }
};


export const getClients = async () => {
  try {
    const response = await axios.get(`${API_URL}/followup/clients`);
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const sendMessage = async (message) => {
  try {
    const response = await axios.post(`${API_URL}/chat/schedule`, { message });
    return response.data.message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};


