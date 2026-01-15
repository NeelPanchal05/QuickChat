import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import io from "socket.io-client";

const AuthContext = createContext(null);

// Ensure this matches your backend port
const BACKEND_URL = "http://localhost:8000";
const API = process.env.REACT_APP_BACKEND_URL || BACKEND_URL;

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
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // If token is invalid, clear it
          logout();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
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
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      return data;
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
