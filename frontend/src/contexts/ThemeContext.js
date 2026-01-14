import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Added missing export
export const THEME_PRESETS = [
  { id: "default", name: "Default Dark", style: { background: "#050505" } },
  {
    id: "gradient-1",
    name: "Midnight",
    style: {
      background: "linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)",
    },
  },
  {
    id: "gradient-2",
    name: "Sunset",
    style: { background: "linear-gradient(to bottom right, #373B44, #4286f4)" },
  },
  {
    id: "gradient-3",
    name: "Forest",
    style: { background: "linear-gradient(to bottom right, #000000, #0f9b0f)" },
  },
  {
    id: "gradient-4",
    name: "Royal",
    style: { background: "linear-gradient(to bottom right, #141E30, #243B55)" },
  },
  { id: "solid-1", name: "Pitch Black", style: { background: "#000000" } },
  { id: "solid-2", name: "Dark Gray", style: { background: "#1a1a1a" } },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    localStorage.getItem("app_theme") || "dark"
  );
  const [currentThemeData, setCurrentThemeData] = useState({});

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
