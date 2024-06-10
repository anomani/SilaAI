// frontend/src/services/api.js
import axios from 'axios';

// Replace with your backend API URL
const API_URL = 'http://localhost:3000/api';

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
    const response = await axios.get(`${API_URL}/clients`);
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

export const getAppointmentsByDay = async (date) => {
  try {
    const response = await axios.get(`${API_URL}/appointments/${date}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};


export const addAppointment = async (appointment) => {
  try {
    await axios.post(`${API_URL}/appointments`, appointment);
  } catch (error) {
    console.log(appointment)
    console.error('Error adding appointment:', error);
    throw error;
  }
};

export const addClient = async (client) => {
  try {
    await axios.post(`${API_URL}/clients`, client);
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

export const searchClients = async (query) => {
  try {
    const response = await axios.get(`${API_URL}/clients/search`, { params: { query: query } });
    return response.data;
  } catch (error) {
    console.error('Error searching clients:', error);
    throw error;
  }
};

export const getAppointmentsByClientId = async (clientId) => {
  try {
    const response = await axios.get(`${API_URL}/appointments/client/${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const deleteClient = async (clientId) => {
  try {
    await axios.delete(`${API_URL}/clients/${clientId}`);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const getSuggestedFollowUps = async (days) => {
  try {
    const response = await axios.get(`${API_URL}/clients/suggested-followup/${days}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching suggested follow-ups:', error);
    throw error;
  }
};

export const getClientById = async (clientId) => {
  try {
    const response = await axios.get(`${API_URL}/clients/${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
};

export const deleteAppointment = async (appointmentId) => {
  try {
    await axios.delete(`${API_URL}/appointments/${appointmentId}`);
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

export const handleUserInput = async (message) => {
  try {
    const response = await axios.post(`${API_URL}/chat/handle-user-input`, { message });
    return response.data;
  } catch (error) {
    console.error('Error handling user input:', error);
    throw error;
  }
};

