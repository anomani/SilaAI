import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const getAvailabilities = async (date, appointmentTypeId, selectedAddOns = []) => {
  try {
    console.log("getAvailabilities", date, appointmentTypeId, selectedAddOns);
    const response = await axios.get(`${API_URL}/availabilities`, {
      params: { date, appointmentTypeId, addOnIds: JSON.stringify(selectedAddOns) }
    });

    console.log('API response:', response.data);

    return response.data;
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

export const getCompatibleAddOns = async (appointmentTypeId) => {
  try {
    const response = await axios.get(`${API_URL}/compatible-addons`, {
      params: { appointmentTypeId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching compatible add-ons:', error);
    throw error;
  }
};

export const getAppointmentTypeById = async (appointmentTypeId) => {
  try {
    const response = await axios.get(`${API_URL}/appointment-types/${appointmentTypeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment type:', error);
    throw error;
  }
};

export const getAppointmentDetails = async (appointmentTypeId, addOnIds = []) => {
  try {
    const response = await axios.get(`${API_URL}/appointment-details/${appointmentTypeId}`, {
      params: { addOnIds: JSON.stringify(addOnIds) }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    throw error;
  }
};

export const confirmAppointment = async (appointmentData) => {
  try {
    console.log('Confirming appointment api call:', appointmentData);
    const response = await axios.post(`${API_URL}/appointments/confirm`, appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error confirming appointment:', error);
    throw error;
  }
};

export const getAppointmentTypes = async () => {
  try {
    const response = await axios.get(`${API_URL}/appointment-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    throw error;
  }
};
