import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
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
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsMenu({
  onProfile,
  onLogout,
  onTerms,
  onBackgrounds,
  onPrivacy,
}) {
  const { theme, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#A1A1AA] hover:text-white outline-none">
          <Settings size={20} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-[#0a0a0a] border border-white/10 text-white backdrop-blur-xl shadow-2xl"
      >
        <DropdownMenuLabel className="text-[#A1A1AA] text-xs uppercase tracking-wider">
          {t("settings")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {/* Chat Settings */}
        <div className="p-1">
          <DropdownMenuItem
            onClick={onBackgrounds}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <ImageIcon size={16} /> {t("chat_wallpapers")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onPrivacy}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <Lock size={16} /> {t("privacy")}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Appearance */}
        <div className="p-1">
          <DropdownMenuLabel className="text-[#666] text-[10px] uppercase pl-2">
            {t("appearance")}
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={theme === "dark"}
            onCheckedChange={() => setTheme("dark")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <Moon size={16} /> {t("dark_theme")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={theme === "light"}
            onCheckedChange={() => setTheme("light")}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <Sun size={16} /> {t("light_theme")}
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Notifications */}
        <div className="p-1">
          <DropdownMenuLabel className="text-[#666] text-[10px] uppercase pl-2">
            {t("notifications")}
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? t("sound_on") : t("sound_off")}
          </DropdownMenuCheckboxItem>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Language */}
        <div className="p-1">
          <DropdownMenuLabel className="text-[#666] text-[10px] uppercase pl-2">
            {t("language")}
          </DropdownMenuLabel>
          {["en", "es", "fr", "de"].map((lang) => (
            <DropdownMenuCheckboxItem
              key={lang}
              checked={language === lang}
              onCheckedChange={() => setLanguage(lang)}
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
            >
              <Globe size={16} />{" "}
              {lang === "en"
                ? "English"
                : lang === "es"
                ? "Español"
                : lang === "fr"
                ? "Français"
                : "Deutsch"}
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Account */}
        <div className="p-1">
          <DropdownMenuItem
            onClick={onProfile}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <Shield size={16} /> {t("view_profile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onTerms}
            className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
          >
            <Shield size={16} /> {t("terms")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer hover:bg-red-500/20 focus:bg-red-500/20 text-red-400 gap-2 mt-1"
          >
            <LogOut size={16} /> {t("logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
