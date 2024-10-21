import axios from 'axios';

const API_URL = 'https://uzi-53c819396cc7.herokuapp.com/api'; // Keep this as is, assuming your backend is still on port 3001

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // This is important if you're using cookies for authentication
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add a request interceptor
api.interceptors.request.use(
  config => {
    // You can add any custom headers here if needed
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    return config;
  },
  error => Promise.reject(error)
);

// Add a response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
    }
    return Promise.reject(error);
  }
);

export const getAvailabilities = async (date, appointmentType) => {
  try {
    console.log("getAvailabilities", date, appointmentType);
    const response = await api.get('/availabilities', {
      params: { date, appointmentType }
    });

    console.log('API response:', response.data);

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    throw error;
  }
};

export const bookAppointment = async (appointmentData) => {
  try {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
};
