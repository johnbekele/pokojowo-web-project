import axios from 'axios';
import Constants from 'expo-constants';
import { storage, STORAGE_KEYS } from './storage';

const MAIN_API_URL =
  Constants.expoConfig?.extra?.apiUrl || 'https://pokojowo-web-project.onrender.com/api';

const CHAT_API_URL =
  Constants.expoConfig?.extra?.chatApiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  'https://pokojowo-web-project.onrender.com/api';

const chatApi = axios.create({
  baseURL: CHAT_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

chatApi.interceptors.request.use(async (config) => {
  const token = await storage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

chatApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const response = await axios.post(`${MAIN_API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const accessToken = response.data.access_token || response.data.accessToken;
          await storage.setItem(STORAGE_KEYS.TOKEN, accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return chatApi(originalRequest);
        } catch {
          // Let caller handle auth failure
        }
      }
    }
    return Promise.reject(error);
  }
);

export default chatApi;
