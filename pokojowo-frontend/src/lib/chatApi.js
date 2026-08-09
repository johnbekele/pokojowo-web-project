import axios from 'axios';
import { installAuthInterceptors } from './authInterceptor';

const CHAT_API_BASE_URL =
  import.meta.env.VITE_CHAT_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const chatApi = axios.create({
  baseURL: CHAT_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

installAuthInterceptors(chatApi, { refreshBaseURL: API_BASE_URL });

export default chatApi;
