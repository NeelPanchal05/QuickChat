import React, { useState } from "react";
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
  User,
  FileText,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";

const MenuSection = ({ label, children }) => (
  <>
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.5)' }}>
        {label}
      </span>
    </div>
    <div className="px-2 pb-1">{children}</div>
    <div className="mx-3 my-1" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
  </>
);

const AnimItem = ({ onClick, icon: Icon, label, danger, checked, isCheckbox, onCheck }) => {
  const [hovered, setHovered] = useState(false);
  const content = (
    <div
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150 select-none"
      style={{
        background: hovered ? (danger ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)') : 'transparent',
        color: danger ? (hovered ? '#f87171' : 'rgba(248,113,113,0.8)') : (hovered ? 'white' : 'rgba(255,255,255,0.7)'),
        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={isCheckbox ? undefined : onClick}
    >
      <Icon size={15} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: hovered ? 'scale(1.15)' : 'scale(1)' }} />
      <span className="flex-1 font-medium">{label}</span>
      {isCheckbox && (
        <div
          className="w-4 h-4 rounded border flex items-center justify-center transition-all duration-200"
          style={{
            background: checked ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
            borderColor: checked ? '#7c3aed' : 'rgba(255,255,255,0.2)',
            boxShadow: checked ? '0 0 8px rgba(124,58,237,0.4)' : 'none',
          }}
          onClick={() => onCheck && onCheck(!checked)}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'checkDraw 0.25s ease both' }} />
            </svg>
          )}
        </div>
      )}
    </div>
  );
  return isCheckbox ? content : <DropdownMenuItem asChild>
    <button className="w-full text-left p-0 bg-transparent border-0 outline-none focus:outline-none" onClick={onClick}>
      <div
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150 select-none"
        style={{
          background: hovered ? (danger ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)') : 'transparent',
          color: danger ? (hovered ? '#f87171' : 'rgba(248,113,113,0.8)') : (hovered ? 'white' : 'rgba(255,255,255,0.7)'),
          transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon size={15} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: hovered ? 'scale(1.15)' : 'scale(1)' }} />
        <span className="flex-1 font-medium">{label}</span>
      </div>
    </button>
  </DropdownMenuItem>;
};

export default function SettingsMenu({ onProfile, onLogout, onTerms, onBackgrounds, onPrivacy }) {
  const { theme, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-xl outline-none transition-all duration-200"
          style={{
            color: open ? '#a78bfa' : 'rgba(161,161,170,1)',
            background: open ? 'rgba(139,92,246,0.12)' : 'transparent',
            transform: open ? 'rotate(30deg)' : 'rotate(0deg)',
            transition: 'color 0.2s, background 0.2s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <Settings size={19} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 overflow-hidden p-0"
        style={{
          background: 'rgba(10,10,22,0.97)',
          backdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.06)',
          animation: 'popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="w-6 h-6 rounded-lg logo-shimmer flex items-center justify-center">
            <Settings size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("settings")}
          </span>
        </div>

        <div className="py-2 max-h-[420px] overflow-y-auto custom-scrollbar">
          {/* Chat */}
          <MenuSection label="Chat">
            <AnimItem onClick={onBackgrounds} icon={ImageIcon} label={t("chat_wallpapers")} />
            <AnimItem onClick={onPrivacy}     icon={Lock}       label={t("privacy")} />
          </MenuSection>

          {/* Appearance */}
          <MenuSection label={t("appearance")}>
            <AnimItem
              isCheckbox checked={theme === "dark"} onCheck={() => setTheme("dark")}
              icon={Moon} label={t("dark_theme")}
            />
            <AnimItem
              isCheckbox checked={theme === "light"} onCheck={() => setTheme("light")}
              icon={Sun}  label={t("light_theme")}
            />
          </MenuSection>

          {/* Sound */}
          <MenuSection label={t("notifications")}>
            <AnimItem
              isCheckbox checked={soundEnabled} onCheck={setSoundEnabled}
              icon={soundEnabled ? Volume2 : VolumeX}
              label={soundEnabled ? t("sound_on") : t("sound_off")}
            />
          </MenuSection>

          {/* Language */}
          <MenuSection label={t("language")}>
            {[
              { code: "en", label: "English 🇬🇧" },
              { code: "es", label: "Español 🇪🇸" },
              { code: "fr", label: "Français 🇫🇷" },
              { code: "de", label: "Deutsch 🇩🇪" },
            ].map(({ code, label: lbl }) => (
              <AnimItem
                key={code}
                isCheckbox checked={language === code} onCheck={() => setLanguage(code)}
                icon={Globe} label={lbl}
              />
            ))}
          </MenuSection>

          {/* Account */}
          <div className="px-2 pb-2">
            <div className="px-3 pt-1 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.5)' }}>Account</span>
            </div>
            <AnimItem onClick={onProfile} icon={User}     label={t("view_profile")} />
            <AnimItem onClick={onTerms}   icon={FileText} label={t("terms")} />
            <div className="mt-1 mx-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <AnimItem onClick={onLogout} icon={LogOut} label={t("logout")} danger />
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
