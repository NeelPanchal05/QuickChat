import axios from 'axios';

let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// Ensure we are using the correct protocol if we are running the frontend on HTTPS
if (BACKEND_URL && window.location.protocol === 'https:' && BACKEND_URL.startsWith('http://')) {
  BACKEND_URL = BACKEND_URL.replace('http://', 'https://');
}

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  withCredentials: true, // Important for sending/receiving HttpOnly cookies
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token using the HttpOnly cookie
        const res = await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (res.status === 200) {
          const newToken = res.data.token;
          
          // Update local storage
          localStorage.setItem('token', newToken);
          
          // Update the failed request's header and retry it
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired or missing)
        // We should clear the token and force a re-login
        localStorage.removeItem('token');
        
        // Dispatch a custom event so the AuthContext can pick it up to clear memory state
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
