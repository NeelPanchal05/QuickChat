import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Mail, Save, Hash } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function Profile({ onBack }) {
  const { user, token, API } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    real_name: user?.real_name || "",
    bio: user?.bio || "",
    profile_photo: user?.profile_photo || "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  // --- NEW: Image Compression Function ---
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 500; // Resize to max 500px width
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality (significantly reduces size)
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setFormData((prev) => ({ ...prev, profile_photo: compressedBase64 }));
    } catch (err) {
      toast.error("Failed to process image");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Profile updated successfully!");

      // Force a reload to ensure the new optimized image is used everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile. Try a smaller image.");
    } finally {
      setLoading(false);
    }
  };

  // Helper for initials
  const initials = user?.real_name ? user.real_name[0].toUpperCase() : "U";

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold">Edit Profile</h2>
        {/* Close button handled by Dialog */}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          <div
            className="relative group cursor-pointer"
            onClick={handleImageClick}
          >
            <Avatar className="w-24 h-24 border-2 border-primary">
              <AvatarImage src={formData.profile_photo} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Change Profile Photo</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User size={16} /> Real Name
            </label>
            <Input
              name="real_name"
              value={formData.real_name}
              onChange={handleChange}
              className="bg-muted border-border text-foreground"
              placeholder="Your Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Hash size={16} /> Bio
            </label>
            <Input
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="bg-muted border-border text-foreground"
              placeholder="Tell us about yourself"
            />
          </div>

          {/* Read Only Fields */}
          <div className="space-y-2 opacity-70">
            <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Mail size={16} /> Email (Read Only)
            </label>
            <Input
              value={user?.email || ""}
              readOnly
              className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-2 opacity-70">
            <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Hash size={16} /> Username (Read Only)
            </label>
            <Input
              value={`@${user?.username || ""}`}
              readOnly
              className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
