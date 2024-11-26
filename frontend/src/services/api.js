import axios from 'axios';
import { getToken } from '../utils/auth';

// Replace with your backend API URL
const API_URL = 'https://lab-sweeping-typically.ngrok-free.app/api';
// const API_URL = 'https://uzi-53c819396cc7.herokuapp.com/api';
const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
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
    const response = await retryRequest(() => throttledRequest(() => 
      api.get(`/appointments/${date}`)
    ));
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

export const getMostRecentMessagePerClient = async () => {
  return retryRequest(async () => {
    const response = await throttledRequest(() => api.get('/chat/most-recent-messages'));
    
    // Fetch suggested responses for all clients
    const suggestedResponses = await Promise.all(
      response.data.map(message => 
        getSuggestedResponse(message.clientid)
          .then(suggestedResponse => ({ clientid: message.clientid, hasSuggestedResponse: !!suggestedResponse }))
          .catch(() => ({ clientid: message.clientid, hasSuggestedResponse: false }))
      )
    );

    // Create a map of client IDs to their suggested response status
    const suggestedResponseMap = Object.fromEntries(
      suggestedResponses.map(({ clientid, hasSuggestedResponse }) => [clientid, hasSuggestedResponse])
    );

    // Modify the response data to include the suggested response status
    const modifiedData = response.data.map(message => ({
      ...message,
      hasSuggestedResponse: suggestedResponseMap[message.clientid],
      // Remove the 'read' property if it exists
      ...(message.read !== undefined && { read: undefined })
    }));

    return modifiedData;
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

export const sendMessage = async (to, message, initialMessage = false, manual = false) => {
  try {
    console.log('Sending messagess:', { to, message, initialMessage, manual });
    await retryRequest(() => throttledRequest(() => api.post('/chat/send-message', { to, message, initialMessage, manual })));
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
    await retryRequest(() => throttledRequest(() => api.post('/save-push-token', { pushToken })));
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
};

export const getCustomList = async (id) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/chat/custom-list`, { params: { id } })));
    return response.data;
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

export const createBlockedTime = async (blockedTimeData) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/appointments/blocked-time', blockedTimeData)));
    return response.data;
  } catch (error) {
    console.error('Error creating blocked time:', error);
    throw error;
  }
};

export const setAIPrompt = async (clientId, prompt) => {
  try {
    await api.post('/ai-prompt/set-prompt', { clientId, prompt });
  } catch (error) {
    console.error('Error setting AI prompt:', error);
    throw error;
  }
};

export const getAIPrompt = async (clientId) => {
  try {
    const response = await api.get(`/ai-prompt/get-prompt/${clientId}`);
    return response.data.prompt;
  } catch (error) {
    console.error('Error getting AI prompt:', error);
    throw error;
  }
};

export const getClientAppointmentsAroundCurrent = async (clientId, currentAppointmentId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.get(`/appointments/client/${clientId}/around-current/${currentAppointmentId}`)
    ));
    return response.data;
  } catch (error) {
    console.error('Error fetching client appointments around current:', error);
    throw error;
  }
};

export const getNotesByClientId = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/notes/${clientId}`)));
    return response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

export const createNote = async (clientId, content) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.post('/notes', { clientId, content })));
    return response.data;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};

export const updateAppointmentPayment = async (appointmentId, paid, tipAmount, paymentMethod) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/appointments/${appointmentId}/payment`, { paid, tipAmount, paymentMethod })
    ));
    return response.data;
  } catch (error) {
    console.error('Error updating appointment payment:', error);
    throw error;
  }
};

export const rescheduleAppointment = async (appointmentId, newDate, newStartTime, newEndTime) => {
  console.log(appointmentId, newDate, newStartTime, newEndTime)
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/appointments/${appointmentId}/reschedule`, { newDate, newStartTime, newEndTime })
    ));
    return response.data;
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    throw error;
  }
};

export const getClientAutoRespond = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/clients/auto-respond/${clientId}`)));
    return response.data.autoRespond;
  } catch (error) {
    console.error('Error fetching client auto-respond:', error);
    throw error;
  }
};

export const updateClientAutoRespond = async (clientId, autoRespond) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/clients/auto-respond/${clientId}`, { autoRespond })
    ));
    return response.data;
  } catch (error) {
    console.error('Error updating client auto-respond:', error);
    throw error;
  }
};

// Add these new functions at the end of the file

export const uploadClientMedia = async (clientId, mediaUris) => {
  const formData = new FormData();
  mediaUris.forEach((uri, index) => {
    const fileType = uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
    const fileName = `media_${index}${fileType === 'video/mp4' ? '.mp4' : '.jpg'}`;
    formData.append('media', {
      uri: uri,
      type: fileType,
      name: fileName,
    });
  });

  try {
    const response = await api.post(`/media/upload/${clientId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading client media:', error);
    throw error;
  }
};

export const getClientMedia = async (clientId) => {
  try {
    const response = await api.get(`/media/${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching client media:', error);
    throw error;
  }
};

export const deleteClientMedia = async (mediaId) => {
  try {
    await retryRequest(() => throttledRequest(() => api.delete(`/media/${mediaId}`)));
  } catch (error) {
    console.error('Error deleting client media:', error);
    throw error;
  }
};

export const getSuggestedResponse = async (clientId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get(`/chat/suggested-response/${clientId}`)));
    return response.data.suggestedResponse;
  } catch (error) {
    console.error('Error fetching suggested response:', error);
    throw error;
  }
};

export const clearSuggestedResponse = async (clientId) => {
  try {
    await retryRequest(() => throttledRequest(() => api.delete(`/chat/suggested-response/${clientId}`)));
  } catch (error) {
    console.error('Error clearing suggested response:', error);
    throw error;
  }
};

export const getMessageMetrics = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/chat/metrics')));
    return response.data;
  } catch (error) {
    console.error('Error fetching message metrics:', error);
    throw error;
  }
};

export const getAppointmentMetrics = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/metrics')));
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment metrics:', error);
    throw error;
  }
};

// Add this new function
export const getSuggestedResponseCount = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/chat/suggested-response-count')));
    return response.data.count;
  } catch (error) {
    console.error('Error fetching suggested response count:', error);
    throw error;
  }
};

export const transcribeAudio = async (audioUri) => {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    });

    const response = await api.post('/chat/transcribe-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const getFillMyCalendarStatus = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/settings/fillMyCalendar')));
    return response.data;
  } catch (error) {
    console.error('Error fetching fillMyCalendar status:', error);
    throw error;
  }
};

export const setFillMyCalendarStatus = async (status) => {
  try {
    await retryRequest(() => throttledRequest(() => api.post('/settings/fillMyCalendar', { status })));
  } catch (error) {
    console.error('Error setting fillMyCalendar status:', error);
    throw error;
  }
  
};

export const updateAppointmentDetails = async (appointmentId, appointmentData) => {
  console.log("Appointment ID", appointmentId)
  console.log("Appointment Data", appointmentData)
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/appointments/${appointmentId}`, appointmentData)
    ));
    return response.data;
  } catch (error) {
    console.error('Error updating appointment details:', error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.post('/users/login', { email, password })
    ));
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const register = async (username, password, email, phoneNumber) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.post('/users/register', { username, password, email, phoneNumber })
    ));
    return response.data;
  } catch (error) {
    console.error('Error registering:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await removeToken();
    // You might want to clear other app state here
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await retryRequest(() => throttledRequest(() => api.get('/users/me')));
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

export const getAppointmentTypesList = async () => {
  console.log("getAppointmentTypesList")
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.get('/appointments/appointment-types')
    ));
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    throw error;
  }
};

export const updateAppointmentType = async (appointmentTypeId, updates) => {
  try {
    console.log('Updating appointment type:', { appointmentTypeId, updates });
    
    // Ensure availability is properly formatted before sending
    if (updates.availability) {
      // Make sure each day's slots are in the correct format
      Object.entries(updates.availability).forEach(([day, slots]) => {
        if (!Array.isArray(slots)) {
          throw new Error(`Invalid availability format for ${day}`);
        }
      });
    }

    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/appointments/appointment-types/${appointmentTypeId}`, updates)
    ));
    
    console.log('Update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating appointment type:', error);
    throw error;
  }
};

// Add a specific function for updating just availability
export const updateAppointmentTypeAvailability = async (appointmentTypeId, availability) => {
  try {
    console.log('Updating availability:', { appointmentTypeId, availability });
    
    // Create the update object with only the availability field
    const updateData = {
      availability: availability
    };

    const response = await retryRequest(() => throttledRequest(() => 
      api.put(`/appointments/appointment-types/${appointmentTypeId}`, updateData)
    ));
    
    console.log('Update availability response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating appointment type availability:', error);
    throw error;
  }
};

export const createAppointmentType = async (appointmentType) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.post('/appointments/appointment-types', appointmentType)
    ));
    return response.data;
  } catch (error) {
    console.error('Error creating appointment type:', error);
    throw error;
  }
};

export const deleteAppointmentType = async (appointmentTypeId) => {
  try {
    const response = await retryRequest(() => throttledRequest(() => 
      api.delete(`/appointments/appointment-types/${appointmentTypeId}`)
    ));
    return response.data;
  } catch (error) {
    console.error('Error deleting appointment type:', error);
    throw error;
  }
};