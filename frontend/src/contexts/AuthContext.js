import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import io from "socket.io-client";
import { generateKeyPair } from "../utils/encryption";
import api from "../utils/api";

const AuthContext = createContext(null);

let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// Ensure we are using the correct protocol if we are running the frontend on HTTPS
if (BACKEND_URL && window.location.protocol === 'https:' && BACKEND_URL.startsWith('http://')) {
  BACKEND_URL = BACKEND_URL.replace('http://', 'https://');
}
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// --- User cache helpers -------------------------------------------------
// Caching the user object in localStorage means the UI renders instantly
// on page reload without waiting for a /auth/me round-trip to the server.
const USER_CACHE_KEY = "qc_user_cache";
const getCachedUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_CACHE_KEY)); } catch { return null; }
};
const setCachedUser = (user) => {
  try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)); } catch {}
};
const clearCachedUser = () => localStorage.removeItem(USER_CACHE_KEY);
// -----------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const cachedUser = getCachedUser();

  const [user, setUser] = useState(cachedUser);
  const [token, setToken] = useState(localStorage.getItem("token"));
  // If we have a cached user, skip the loading state so the UI renders immediately
  const [loading, setLoading] = useState(!cachedUser || !localStorage.getItem("token"));
  const [socket, setSocket] = useState(null);

  const updateUser = useCallback((newUser) => {
    setUser(newUser);
    setCachedUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    clearCachedUser();
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(
    async (currentToken, retryCount = 0) => {
      try {
        const response = await api.get('/auth/me');
        if (response.status === 200) {
          setUser(response.data);
          setCachedUser(response.data);
          setLoading(false);
        }
      } catch (error) {
        if (error.response?.status === 401) {
           setLoading(false);
        } else if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchUser(currentToken, retryCount + 1), delay);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initialize Socket.IO — websocket ONLY, no polling.
  // "polling" adds 1-2 extra HTTP round-trips before upgrading to WebSocket.
  // On mobile networks this can add several seconds of latency.
  useEffect(() => {
    if (token) {
      const newSocket = io(BACKEND_URL || "/", {
        auth: { token },
        transports: ["polling"], 
        withCredentials: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err instanceof Error ? err.message : String(err));
      });

      setSocket(newSocket);
      return () => newSocket.disconnect();
    }
  }, [token]);

  // On mount: if we have a cached user+token, show UI immediately, then
  // revalidate in the background to keep data fresh.
  useEffect(() => {
    if (token) {
      if (!cachedUser) {
        // No cache — must wait for /auth/me before showing anything
        setLoading(true);
        fetchUser(token);
      } else {
        // Cache hit — UI renders immediately with cached data.
        // Revalidate silently in background (no loading state change).
        fetchUser(token);
      }
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, [logout]);

  const login = async (loginIdentifier, password) => {
    try {
      const res = await api.post('/auth/login', { login: loginIdentifier, password });
      const data = res.data;

      localStorage.setItem("token", data.token);
      setToken(data.token);

      // Login response includes the user object — use it directly.
      // This avoids an extra /auth/me round-trip right after login.
      if (data.user) {
        setUser(data.user);
        setCachedUser(data.user);
        setLoading(false);
      } else {
        await fetchUser(data.token);
      }
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.detail || "Login failed");
    }
  };

  const register = async (userData) => {
    const keyPair = generateKeyPair();
    localStorage.setItem(`e2ee_private_key_${userData.email}`, keyPair.privateKey);
    
    const registrationData = { ...userData, public_key: keyPair.publicKey };

    try {
      const res = await api.post('/auth/register', registrationData);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.detail || "Registration failed. Please try again.");
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      const data = res.data;

      localStorage.setItem("token", data.token);
      setToken(data.token);

      if (data.user) {
        setUser(data.user);
        setCachedUser(data.user);
        setLoading(false);
      } else {
        await fetchUser(data.token);
      }
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.detail || "OTP verification failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        token,
        login,
        register,
        verifyOtp,
        logout,
        loading,
        socket,
        fetchUser,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

