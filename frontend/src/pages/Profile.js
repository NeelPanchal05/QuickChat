import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Mail, Save, X, Hash } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function Profile({ onBack }) {
  const { user, token, API } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    real_name: user?.real_name || "",
    bio: user?.bio || "",
    // Note: Email and Username are typically read-only or handled via separate flows for security
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Assuming 'update_profile' endpoint expects these fields
      const res = await axios.put(`${API}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local storage or context if needed, usually context refetches or we update user object
      toast.success("Profile updated successfully!");
      if (onBack) onBack(); // Optional: close modal on success
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
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
        <Button variant="ghost" size="icon" onClick={onBack}>
          <X size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer">
            <Avatar className="w-24 h-24 border-2 border-primary">
              <AvatarImage src={user?.profile_photo} />
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
