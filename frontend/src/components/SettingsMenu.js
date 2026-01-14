import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  Moon,
  Sun,
  Globe,
  Volume2,
  VolumeX,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsMenu({ onProfile, onLogout, onTerms }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("en");

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  };

  return (
    <DropdownMenu>
      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#A1A1AA] hover:text-white">
        <Settings size={20} />
      </button>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-black/90 border-white/10 text-white backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-[#A1A1AA]">
          Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />

        {/* Appearance Section */}
        <div className="px-2 py-2">
          <p className="text-xs font-semibold text-[#A1A1AA] px-2 mb-2">
            Appearance
          </p>

          <DropdownMenuCheckboxItem
            checked={theme === "dark"}
            onCheckedChange={() => handleThemeChange("dark")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Moon size={16} className="mr-2" />
            Dark Theme
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={theme === "light"}
            onCheckedChange={() => handleThemeChange("light")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Sun size={16} className="mr-2" />
            Light Theme
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator className="bg-white/5" />

        {/* Sound Section */}
        <div className="px-2 py-2">
          <p className="text-xs font-semibold text-[#A1A1AA] px-2 mb-2">
            Notifications
          </p>

          <DropdownMenuCheckboxItem
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            {soundEnabled ? (
              <>
                <Volume2 size={16} className="mr-2" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX size={16} className="mr-2" />
                Sound Off
              </>
            )}
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator className="bg-white/5" />

        {/* Language Section */}
        <div className="px-2 py-2">
          <p className="text-xs font-semibold text-[#A1A1AA] px-2 mb-2">
            Language
          </p>

          <DropdownMenuCheckboxItem
            checked={language === "en"}
            onCheckedChange={() => handleLanguageChange("en")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Globe size={16} className="mr-2" />
            English
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={language === "es"}
            onCheckedChange={() => handleLanguageChange("es")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Globe size={16} className="mr-2" />
            Español
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={language === "fr"}
            onCheckedChange={() => handleLanguageChange("fr")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Globe size={16} className="mr-2" />
            Français
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={language === "de"}
            onCheckedChange={() => handleLanguageChange("de")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Globe size={16} className="mr-2" />
            Deutsch
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator className="bg-white/5" />

        {/* Account Section */}
        <DropdownMenuItem
          onClick={onProfile}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
        >
          <Shield size={16} className="mr-2" />
          <span>View Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onTerms}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
        >
          <Shield size={16} className="mr-2" />
          <span>Terms & Conditions</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/5" />

        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer hover:bg-red-500/20 focus:bg-red-500/20 text-red-400"
        >
          <LogOut size={16} className="mr-2" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
