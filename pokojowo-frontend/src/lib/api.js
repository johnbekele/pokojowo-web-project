import axios from 'axios';
import { installAuthInterceptors } from './authInterceptor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Axios instance with interceptors for JWT authentication
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

installAuthInterceptors(api, {
  refreshBaseURL: API_BASE_URL,
  onForbidden: (error) => {
    // Verification gate: normalize the structured 403 so screens can show
    // the verify-email CTA instead of a generic error message.
    const detail = error.response?.data?.detail;
    if (error.response?.status === 403 && detail?.code === 'EMAIL_NOT_VERIFIED') {
      error.isEmailNotVerified = true;
      error.friendlyMessage = detail.message;
      window.dispatchEvent(new CustomEvent('email-not-verified'));
    }
  },
});

/**
 * Normalize API errors for consistent handling
 */
export function normalizeError(error) {
  if (error.isEmailNotVerified) {
    return {
      message: error.friendlyMessage || 'Please verify your email address to use this feature',
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      data: error.response?.data,
    };
  }
  if (error.response) {
    // Server responded with error
    return {
      message: error.response.data?.detail || error.response.data?.message || 'An error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      data: null,
    };
  } else {
    // Error setting up request
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      data: null,
    };
  }
}

export default api;
