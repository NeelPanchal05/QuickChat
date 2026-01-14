import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme, THEME_PRESETS } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";

export default function ChatBackgroundSelector({ open, onOpenChange }) {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            Choose Chat Background
          </DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            Select a theme to customize your chat experience
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {Object.entries(THEME_PRESETS).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => changeTheme(key)}
              className="relative group cursor-pointer rounded-lg overflow-hidden"
            >
              {/* Background Preview */}
              <div
                className="w-full h-24 transition-all group-hover:scale-105"
                style={theme.bgStyle}
              />

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

              {/* Selected Indicator */}
              {currentTheme === key && (
                <div className="absolute inset-0 border-2 border-[#7000FF] flex items-center justify-center bg-black/30">
                  <div className="bg-[#7000FF] rounded-full p-2">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}

              {/* Theme Name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-4 group-hover:translate-y-0 transition-transform">
                <p className="text-white font-semibold text-sm">{theme.name}</p>
                <p className="text-[#A1A1AA] text-xs">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Color Picker */}
        <div className="border-t border-white/10 pt-4">
          <label className="text-sm font-semibold mb-2 block">
            Custom Background Color
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              defaultValue="#050505"
              onChange={(e) => {
                // Add custom color theme dynamically
                const customTheme = {
                  name: "Custom",
                  bgClass: `bg-[${e.target.value}]`,
                  bgStyle: { background: e.target.value },
                  bgImage: null,
                  description: "Custom color",
                };
                // This would need to be handled in the main Chat component
              }}
              className="w-12 h-12 rounded-lg cursor-pointer"
            />
            <div className="flex-1">
              <p className="text-sm text-[#A1A1AA]">
                Pick any color for your background
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
