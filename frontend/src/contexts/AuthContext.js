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

// Use environment variable for backend URL, defaulting to localhost for development
let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// If the configured URL evaluates to localhost, but the browser is NOT on localhost,
// rewrite it to use the browser's current hostname so mobile devices can connect.
if (
  BACKEND_URL.includes("localhost") &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
) {
  BACKEND_URL = BACKEND_URL.replace("localhost", window.location.hostname);
}
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // 1. Define logout first using useCallback so it's stable
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    // Socket disconnection is automatically handled by the useEffect cleanup below when token becomes null
  }, []);

  // 2. Define fetchUser using useCallback (depends on logout)
  const fetchUser = useCallback(
    async (currentToken, retryCount = 0) => {
      try {
        const response = await api.get('/auth/me');

        if (response.status === 200) {
          setUser(response.data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error instanceof Error ? error.message : String(error));
        
        if (error.response?.status === 401) {
           // logout is handled by the api interceptor dispatching auth:logout
           setLoading(false);
        } else if (retryCount < 5) { // Max 5 retries for network errors
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying fetchUser in ${delay}ms (Attempt ${retryCount + 1})...`);
          setTimeout(() => fetchUser(currentToken, retryCount + 1), delay);
        } else {
          console.error("Failed to fetch user after maximum retries. Backend may be offline.");
          setLoading(false);
        }
      }
    },
    []
  );

  // Initialize Socket.IO
  useEffect(() => {
    if (token) {
      const newSocket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err instanceof Error ? err.message : String(err));
      });

      setSocket(newSocket);

      // Cleanup function: Disconnects socket when component unmounts OR when token changes (e.g., logout)
      return () => newSocket.disconnect();
    }
  }, [token]);

  // Check auth on load
  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  // Listen for interceptor forced logouts
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

      // Fetch user immediately
      await fetchUser(data.token);
      return data;
    } catch (err) {
      console.error("Login error:", err instanceof Error ? err.message : String(err));
      throw new Error(err.response?.data?.detail || "Login failed");
    }
  };

  const register = async (userData) => {
    // Generate E2EE Keys
    const keyPair = generateKeyPair();
    localStorage.setItem(`e2ee_private_key_${userData.email}`, keyPair.privateKey);
    
    const registrationData = {
      ...userData,
      public_key: keyPair.publicKey
    };

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

      await fetchUser(data.token);
      return data;
    } catch (err) {
      console.error("OTP Error:", err instanceof Error ? err.message : String(err));
      throw new Error(err.response?.data?.detail || "OTP verification failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
