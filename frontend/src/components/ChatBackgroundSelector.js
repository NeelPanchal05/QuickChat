import React, { useRef } from "react";
import { useTheme, THEME_PRESETS } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Upload, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function ChatBackgroundSelector() {
  const { setChatBackground, currentThemeData } = useTheme();
  const fileInputRef = useRef(null);

  const handlePresetClick = (preset) => {
    setChatBackground(preset.style);
    toast.success(`Wallpaper set to ${preset.name}`);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const style = {
        backgroundImage: `url(${reader.result})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      };
      setChatBackground(style);
      toast.success("Custom wallpaper set");
    };
    reader.readAsDataURL(file);
  };

  // Helper to check if a preset is active
  const isActive = (style) => {
    return JSON.stringify(style) === JSON.stringify(currentThemeData?.bgStyle);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-foreground">Chat Wallpaper</h3>
        <p className="text-sm text-muted-foreground">
          Select a preset or upload your own image.
        </p>
      </div>

      {/* Custom Upload Section */}
      <div className="w-full">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={handleFileChange}
        />
        <Button
          onClick={handleUploadClick}
          variant="outline"
          className="w-full h-20 border-dashed border-2 border-muted-foreground/25 hover:border-primary hover:bg-accent/50 flex flex-col items-center justify-center gap-2 transition-all"
        >
          <Upload size={24} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Upload from Device
          </span>
        </Button>
      </div>

      {/* Presets Grid */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ImageIcon size={16} /> Presets
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {THEME_PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`
                            cursor-pointer group relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                            ${
                              isActive(preset.style)
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            }
                        `}
            >
              {/* Preview */}
              <div className="w-full h-full" style={preset.style}></div>

              {/* Label Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center backdrop-blur-sm">
                <span className="text-[10px] font-medium text-white uppercase tracking-wide">
                  {preset.name}
                </span>
              </div>

              {/* Active Indicator */}
              {isActive(preset.style) && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
