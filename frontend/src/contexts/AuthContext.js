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

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // Only connect if we have a token.
    // REMOVED 'user' from dependencies to prevent constant reconnection.
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
  }, [token, BACKEND_URL]); // <--- FIXED: Removed 'user' dependency

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
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
    const response = await axios.post(`${API}/auth/login`, {
      login: loginData,
      password,
    });

    const { token: newToken, user: userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("token", newToken);
    return response.data;
  };

  const register = async (registerData) => {
    const response = await axios.post(`${API}/auth/register`, registerData);
    return response.data;
  };

  const verifyOtp = async (email, otp) => {
    const response = await axios.post(`${API}/auth/verify-otp`, { email, otp });

    const { token: newToken, user: userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("token", newToken);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    if (socket) {
      socket.close();
      setSocket(null);
    }
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
        API,
        BACKEND_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
