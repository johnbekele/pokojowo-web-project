import axios from 'axios';

// A single promise is shared by every API client in the browser.  Keeping it
// in this module means a burst of expired requests from both the main API and
// chat still rotates the refresh token only once.
let refreshPromise = null;

function refreshAccessToken(refreshBaseURL, refreshToken) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${refreshBaseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((response) => {
        const accessToken = response.data.access_token || response.data.accessToken;
        const newRefreshToken =
          response.data.refresh_token || response.data.refreshToken;

        localStorage.setItem('token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        return response.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function clearSessionAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}

/**
 * Install the shared auth request/response behavior on an Axios client.
 *
 * `refreshBaseURL` deliberately points at the main API even when the client
 * itself talks to the chat service, because token refresh is owned by auth.
 */
export function installAuthInterceptors(client, { refreshBaseURL, onForbidden } = {}) {
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (onForbidden) {
        onForbidden(error);
      }

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await refreshAccessToken(refreshBaseURL, refreshToken);
            const accessToken = response.access_token || response.accessToken;

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          clearSessionAndRedirect();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}
