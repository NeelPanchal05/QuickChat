import React, { createContext, useContext, useState, useEffect } from "react";

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("app_sound");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("app_sound", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playNotificationSound = () => {
    if (soundEnabled) {
      // Simple beep sound (Base64) to avoid needing external assets
      const audio = new Audio(
        "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"
      );
      // Note: The base64 above is a placeholder. For a real sound, use a real URL or longer base64.
      // Using a standard notification sound URL:
      const realAudio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      );
      realAudio.volume = 0.5;
      realAudio.play().catch((e) => console.log("Audio play blocked", e));
    }
  };

  return (
    <SoundContext.Provider
      value={{ soundEnabled, setSoundEnabled, playNotificationSound }}
    >
      {children}
    </SoundContext.Provider>
  );
};
