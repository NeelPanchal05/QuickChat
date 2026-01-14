import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const THEME_PRESETS = {
  default: {
    name: "Default",
    bgClass: "bg-[#050505]",
    bgStyle: { background: "#050505" },
    bgImage: null,
    description: "Classic dark theme",
  },
  gradient_purple: {
    name: "Purple Gradient",
    bgClass: "bg-gradient-to-br from-[#7000FF] to-[#050505]",
    bgStyle: {
      background: "linear-gradient(to bottom right, #7000FF, #050505)",
    },
    bgImage: null,
    description: "Purple to dark gradient",
  },
  gradient_blue: {
    name: "Blue Gradient",
    bgClass: "bg-gradient-to-br from-[#0066FF] to-[#050505]",
    bgStyle: {
      background: "linear-gradient(to bottom right, #0066FF, #050505)",
    },
    bgImage: null,
    description: "Blue to dark gradient",
  },
  gradient_teal: {
    name: "Teal Gradient",
    bgClass: "bg-gradient-to-br from-[#00D9FF] to-[#050505]",
    bgStyle: {
      background: "linear-gradient(to bottom right, #00D9FF, #050505)",
    },
    bgImage: null,
    description: "Teal to dark gradient",
  },
  dark_forest: {
    name: "Forest",
    bgClass: "bg-[#0a1f12]",
    bgStyle: { background: "#0a1f12" },
    bgImage: null,
    description: "Deep forest green",
  },
  dark_midnight: {
    name: "Midnight",
    bgClass: "bg-[#0a0e27]",
    bgStyle: { background: "#0a0e27" },
    bgImage: null,
    description: "Deep midnight blue",
  },
  dark_maroon: {
    name: "Maroon",
    bgClass: "bg-[#2d0a0a]",
    bgStyle: { background: "#2d0a0a" },
    bgImage: null,
    description: "Deep maroon red",
  },
  particles: {
    name: "Particles",
    bgClass: "bg-[#050505]",
    bgStyle: { background: "#050505" },
    bgImage: "particles",
    description: "Animated particle effect",
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("default");
  const [customBgColor, setCustomBgColor] = useState("#050505");

  useEffect(() => {
    const saved = localStorage.getItem("chat_theme");
    if (saved && THEME_PRESETS[saved]) {
      setCurrentTheme(saved);
    }
  }, []);

  const changeTheme = (themeId) => {
    if (THEME_PRESETS[themeId]) {
      setCurrentTheme(themeId);
      localStorage.setItem("chat_theme", themeId);
    }
  };

  const updateCustomBgColor = (color) => {
    setCustomBgColor(color);
    localStorage.setItem("custom_bg_color", color);
  };

  const currentThemeData = THEME_PRESETS[currentTheme];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        changeTheme,
        currentThemeData,
        customBgColor,
        updateCustomBgColor,
        availableThemes: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
