import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import io from "socket.io-client";

const AuthContext = createContext(null);

// Use environment variable for backend URL, defaulting to localhost for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
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
    async (currentToken) => {
      try {
        // Create an abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status === 401) {
          // Only logout if the token is explicitly rejected by the server
          logout();
        } else {
          // For other server errors (500, etc.), don't logout — just log it
          console.error("Failed to fetch user, status:", response.status);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        // Network errors or timeout: do NOT logout — backend may be temporarily unreachable
        if (error.name === 'AbortError') {
          console.error("Request timeout - backend may not be running");
        }
        // Don't call logout() here — preserve the session
      } finally {
        setLoading(false);
      }
    },
    [logout]
  ); // Safe dependency

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
        console.error("Socket connection error:", err);
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
  }, [token, fetchUser]); // <--- dependency warning resolved!

  const login = async (loginIdentifier, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginIdentifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      localStorage.setItem("token", data.token);
      setToken(data.token);

      // Fetch user immediately
      await fetchUser(data.token);
      return data;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  };

  const register = async (userData) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      const text = await res.clone().text().catch(() => "");
      throw new Error(text || "Registration failed. Please try again.");
    }

    if (!res.ok) {
      throw new Error(data.detail || "Registration failed");
    }
    return data;
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "OTP verification failed");

      localStorage.setItem("token", data.token);
      setToken(data.token);

      await fetchUser(data.token);
      return data;
    } catch (err) {
      console.error("OTP Error:", err);
      throw err;
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
