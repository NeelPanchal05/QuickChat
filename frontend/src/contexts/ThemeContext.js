import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../utils/api";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const THEME_PRESETS = [
  { id: "default", name: "Default Dark", style: { background: "#050505" } },
  {
    id: "midnight",
    name: "Midnight",
    style: {
      background: "linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    style: { background: "linear-gradient(to bottom right, #373B44, #4286f4)" },
  },
  {
    id: "forest",
    name: "Forest",
    style: { background: "linear-gradient(to bottom right, #000000, #0f9b0f)" },
  },
  {
    id: "royal",
    name: "Royal",
    style: { background: "linear-gradient(to bottom right, #141E30, #243B55)" },
  },
  {
    id: "fire",
    name: "Fire",
    style: { background: "linear-gradient(to bottom right, #480048, #C04848)" },
  },
  { id: "pitch", name: "Pitch Black", style: { background: "#000000" } },
  { id: "gray", name: "Dark Gray", style: { background: "#1a1a1a" } },
];

export const ThemeProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [theme, setTheme] = useState(
    localStorage.getItem("app_theme") || "dark"
  );

  // Load saved wallpaper or default
  const [currentThemeData, setCurrentThemeData] = useState(() => {
    const saved = localStorage.getItem("chat_wallpaper");
    return saved ? JSON.parse(saved) : {};
  });

  // Sync with backend user profile on login/load
  useEffect(() => {
    if (user && user.chat_wallpaper) {
      setCurrentThemeData(user.chat_wallpaper);
      localStorage.setItem("chat_wallpaper", JSON.stringify(user.chat_wallpaper));
    } else if (!user) {
      // Clear on logout
      setCurrentThemeData({});
      localStorage.removeItem("chat_wallpaper");
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const setChatBackground = async (style) => {
    const newData = { bgStyle: style };
    setCurrentThemeData(newData);
    localStorage.setItem("chat_wallpaper", JSON.stringify(newData));

    if (user) {
      try {
        const res = await api.put("/users/profile", { chat_wallpaper: newData });
        if (res.data) {
          updateUser(res.data);
        }
      } catch (err) {
        console.error("Failed to sync chat wallpaper to backend", err);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: toggleTheme,
        currentThemeData,
        setChatBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
