import axios from 'axios';
import { storage, STORAGE_KEYS } from './storage';
import { API_BASE_URL, CHAT_API_URL } from './constants';

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
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
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
