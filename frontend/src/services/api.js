// frontend/src/services/api.js
import axios from 'axios';

// Replace with your backend API URL
const API_URL = 'https://lab-sweeping-typically.ngrok-free.app/api';

const api = axios.create({
  baseURL: API_URL,
});

// Implement exponential backoff
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || error.response.status !== 429) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

// Add request throttling
let lastRequestTime = 0;
const minRequestInterval = 1000; // 1 second

const throttledRequest = async (fn) => {
  const now = Date.now();
  if (now - lastRequestTime < minRequestInterval) {
    await new Promise(resolve => setTimeout(resolve, minRequestInterval - (now - lastRequestTime)));
  }
  lastRequestTime = Date.now();
  return fn();
};

// Implement caching
const cache = new Map();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes

export const sendFollowUpMessages = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/followup/send-followups')));
    return response.data;
  } catch (error) {
    console.error('Error sending follow-up messages:', error);
    throw error;
  }
};


export const getClients = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/clients')));
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const handleChat = async (message) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/chat/schedule', { message })));
    return response.data.message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getAppointmentsByDay = async (date) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/appointments/${date}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};


export const addAppointment = async (appointment) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post('/appointments', appointment)));
  } catch (error) {
    console.log(appointment)
    console.error('Error adding appointment:', error);
    throw error;
  }
};

export const addClient = async (client) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post('/clients', client)));
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

export const searchClients = async (query) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/clients/search', { params: { query: query } })));
    return response.data;
  } catch (error) {
    console.error('Error searching clients:', error);
    throw error;
  }
};

export const getAppointmentsByClientId = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/appointments/client/${clientId}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const deleteClient = async (clientId) => {
  try {
    await retryRequest(() => throttledRequest(() => api.delete(`/clients/${clientId}`)));
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const getSuggestedFollowUps = async (days) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/clients/suggested-followup/${days}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching suggested follow-ups:', error);
    throw error;
  }
};

export const getClientById = async (clientId) => {
  const cacheKey = `client_${clientId}`;
  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < cacheTimeout) {
    return cache.get(cacheKey).data;
  }

  return retryRequest(async () => {
    const response = await throttledRequest(() => api.get(`/clients/${clientId}`));
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
  });
};

export const deleteAppointment = async (appointmentId) => {
  try {
    await retryRequest(() => throttledRequest(() => api.delete(`/appointments/${appointmentId}`)));
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

export const handleUserInput = async (message) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/chat/handle-user-input', { message })));
    return response.data;
  } catch (error) {
    console.error('Error handling user input:', error);
    throw error;
  }
};

export const updateClient = async (clientId, client) => {
  try {
    await retryRequest(() => throttledRequest(() => api.put(`/clients/${clientId}`, client)));
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const getMessagesByClientId = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/chat/messages/${clientId}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const getAllMessagesGroupedByClient = async () => {
  const cacheKey = 'groupedMessages';
  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < cacheTimeout) {
    return cache.get(cacheKey).data;
  }

  return retryRequest(async () => {
    const response = await throttledRequest(() => api.get('/chat/messages'));
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
  });
};

export const getDaysSinceLastAppointment = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/clients/days-since-last-appointment/${clientId}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching days since last appointment:', error);
    throw error;
  }
};

export const sendMessage = async (to, message) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post('/chat/send-message', { to, message })));
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const setMessagesRead = async (clientId) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post(`/chat/set-messages-read/${clientId}`)));
  } catch (error) {
    console.error('Error setting messages as read:', error);
    throw error;
  }
};

export const savePushToken = async (phoneNumber, pushToken) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post('/save-push-token', { phoneNumber, pushToken })));
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
};

export const getCustomList = async (id) => {
  try {
    console.log(id)
    const response = await fetch(`${API_URL}/chat/custom-list?id=${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch custom list');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getCustomList:', error);
    throw error;
  }
};

export const sendMessagesToSelectedClients = async (ids, messageTemplate) => {
  try {
      await retryRequest(() => throttledRequest(() => api.post('/chat/send-messages-to-selected-clients', { ids, messageTemplate })));
  } catch (error) {
    console.error('Error sending messages to selected clients:', error);
    throw error;
  }
};

export const updateClientOutreachDate = async (id, outreachDate) => {
  try {
    await retryRequest(() => throttledRequest(() => api.put(`/clients/outreach-date/${id}`, { outreachDate })));
  } catch (error) {
    console.error('Error updating client outreach date:', error);
    throw error;
  }
};

export const startMuslimClientsJob = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/chat/start-muslim-clients-job')));
    return response.data.jobId;
  } catch (error) {
    console.error('Error starting Muslim clients job:', error);
    throw error;
  }
};

export const checkJobStatus = async (jobId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/chat/job-status/${jobId}`)));
    return response.data;
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
};

export const bookAppointmentWithAcuity = async (appointmentData) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/appointments/acuity', appointmentData)));
    return response.data;
  } catch (error) {
    console.error('Error booking appointment with Acuity:', error);
    throw error;
  }
};