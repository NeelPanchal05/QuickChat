import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [theme, setTheme] = useState(
    localStorage.getItem("app_theme") || "dark"
  );

  // Load saved wallpaper or default
  const [currentThemeData, setCurrentThemeData] = useState(() => {
    const saved = localStorage.getItem("chat_wallpaper");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const setChatBackground = (style) => {
    setCurrentThemeData({ bgStyle: style });
    localStorage.setItem("chat_wallpaper", JSON.stringify({ bgStyle: style }));
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
