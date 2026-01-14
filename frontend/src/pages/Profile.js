import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Save, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function Profile({ onBack }) {
  const { user, token, API } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    real_name: user?.real_name || "",
    username: user?.username || "",
    email: user?.email || "",
    bio: user?.bio || "",
    password: "",
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API}/users/profile`,
        {
          ...formData,
          profile_photo: profilePhoto,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="p-4 backdrop-blur-xl bg-black/70 border-b border-white/5 flex items-center gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="text-[#A1A1AA] hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold text-white">Profile Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#7000FF]/20 flex items-center justify-center overflow-hidden">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-[#7000FF]">
                {user?.real_name?.charAt(0)}
              </span>
            )}
          </div>
          {isEditing && (
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#7000FF] hover:bg-[#5B00D1] text-white rounded-lg transition-colors">
                <Upload size={18} />
                <span>Change Photo</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Profile Info */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
          <div>
            <Label className="text-[#A1A1AA] text-sm">Full Name</Label>
            <Input
              name="real_name"
              value={formData.real_name}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] mt-2"
            />
          </div>

          <div>
            <Label className="text-[#A1A1AA] text-sm">Username</Label>
            <Input
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={!isEditing}
              className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] mt-2"
            />
          </div>

          <div>
            <Label className="text-[#A1A1AA] text-sm">Email</Label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              className="bg-black/20 border-white/10 text-white/50 mt-2"
            />
          </div>

          <div>
            <Label className="text-[#A1A1AA] text-sm">Bio</Label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full bg-black/20 border border-white/10 text-white rounded-lg p-3 focus:border-[#7000FF] resize-none"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>

          {isEditing && (
            <div>
              <Label className="text-[#A1A1AA] text-sm">
                Password (leave empty to keep current)
              </Label>
              <div className="relative mt-2">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] pr-10"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex-1 bg-[#7000FF] hover:bg-[#5B00D1] text-white"
            >
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[#7000FF] hover:bg-[#5B00D1] text-white flex items-center gap-2"
              >
                <Save size={18} />
                Save Changes
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    real_name: user?.real_name || "",
                    username: user?.username || "",
                    email: user?.email || "",
                    bio: user?.bio || "",
                    password: "",
                  });
                }}
                variant="outline"
                className="flex-1 border-white/10 text-[#A1A1AA] hover:text-white"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
