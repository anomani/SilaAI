import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";

export const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (e) {
    console.error('Failed to decode token:', e);
    return true;
  }
};

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('userToken', token);
  } catch (e) {
    console.error('Failed to save the token');
  }
};

export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token && isTokenExpired(token)) {
      await removeToken();
      return null;
    }
    return token;
  } catch (e) {
    console.error('Failed to get the token:', e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
  } catch (e) {
    console.error('Failed to remove the token');
  }
};

export const logout = async () => {
  await removeToken();
  // You can add any other cleanup operations here
};