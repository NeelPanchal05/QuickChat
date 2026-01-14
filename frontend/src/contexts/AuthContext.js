import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  const API = `${BACKEND_URL}/api`;

  // --- Socket Connection ---
  useEffect(() => {
    if (token) {
      const newSocket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, BACKEND_URL]);

  // --- Initial Load User ---
  useEffect(() => {
    const initAuth = async () => {
      if (token && !user) {
        await fetchUser(token);
      } else {
        setLoading(false);
      }
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async (accessToken = token) => {
    if (!accessToken) return;
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (loginData, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        login: loginData,
        password,
      });

      const { token: newToken } = response.data;

      // 1. Save Token
      localStorage.setItem("token", newToken);
      setToken(newToken);

      // 2. FORCE fetch full user profile before finishing
      // This ensures 'user' has the exact same structure as a page reload
      await fetchUser(newToken);

      return response.data;
    } catch (error) {
      setLoading(false); // Stop loading on error
      throw error;
    }
  };

  const register = async (registerData) => {
    try {
      console.log("Calling register API with URL:", `${API}/auth/register`);
      const response = await axios.post(`${API}/auth/register`, registerData);
      console.log("Register API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Register API error:", error);
      throw error;
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        email,
        otp,
      });

      const { token: newToken } = response.data;

      // 1. Save Token
      localStorage.setItem("token", newToken);
      setToken(newToken);

      // 2. FORCE fetch full user profile
      await fetchUser(newToken);

      return response.data;
    } catch (error) {
      setLoading(false); // Stop loading on error
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        socket,
        login,
        register,
        verifyOtp,
        logout,
        fetchUser,
        API,
        BACKEND_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
