import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Mail, Save, Hash, ChevronRight } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const Field = ({ icon: Icon, label, children, delay = 0 }) => (
  <div className="animate-slide-up space-y-2" style={{ animationDelay: `${delay}s` }}>
    <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'rgba(167,139,250,0.75)' }}>
      <Icon size={13} /> {label}
    </label>
    <div className="field-focus-ring">
      {children}
    </div>
  </div>
);

export default function Profile({ onBack }) {
  const { user, token, API } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    real_name: user?.real_name || "",
    bio: user?.bio || "",
    profile_photo: user?.profile_photo || "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const compressImage = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // 200px is sufficient for avatar thumbnails shown in sidebar/chat header.
          // Smaller = much smaller base64 blob stored in MongoDB = faster loading for all users.
          const MAX = 200;
          let { width, height } = img;
          if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
          else { if (height > MAX) { width *= MAX / height; height = MAX; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
      };
    });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormData((prev) => ({ ...prev, profile_photo: compressed }));
    } catch { toast.error("Failed to process image"); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile updated!");
      setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.error("Failed to update profile. Try a smaller image.");
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.real_name ? user.real_name[0].toUpperCase() : "U";

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'rgba(10,10,22,0.98)', color: 'white' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(15,15,28,0.9)', backdropFilter: 'blur(20px)' }}
      >
        <div className="w-8 h-8 rounded-lg logo-shimmer flex items-center justify-center flex-shrink-0">
          <User size={15} className="text-white" />
        </div>
        <h2 className="text-lg font-bold gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Edit Profile
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 animate-fade-up">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <div
            className="relative group cursor-pointer avatar-ring rounded-full"
            onClick={() => fileInputRef.current.click()}
            style={{ transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* Gradient ring */}
            <div className="rounded-full p-[3px] logo-shimmer">
              <div className="rounded-full p-[2px]" style={{ background: 'rgba(10,10,22,1)' }}>
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.profile_photo} />
                  <AvatarFallback className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="absolute inset-[5px] bg-black/55 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Camera className="text-white" size={22} />
            </div>
          </div>
          <p className="text-xs font-medium" style={{ color: 'rgba(167,139,250,0.65)' }}>Click to change photo</p>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <Field icon={User} label="Display Name" delay={0.05}>
            <Input
              name="real_name"
              value={formData.real_name}
              onChange={handleChange}
              className="input-glow h-11 rounded-xl text-white border-0 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              placeholder="Your full name"
            />
          </Field>

          <Field icon={Hash} label="Bio" delay={0.08}>
            <Input
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="input-glow h-11 rounded-xl text-white border-0 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              placeholder="Something about yourself"
            />
          </Field>

          <Field icon={Mail} label="Email (read only)" delay={0.11}>
            <Input
              value={user?.email || ""}
              readOnly
              className="h-11 rounded-xl border-0 text-sm cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
            />
          </Field>

          <Field icon={Hash} label="Username (read only)" delay={0.14}>
            <Input
              value={`@${user?.username || ""}`}
              readOnly
              className="h-11 rounded-xl border-0 text-sm cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
            />
          </Field>
        </div>
      </div>

      {/* Save button */}
      <div className="p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,22,0.95)' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          className="ripple-btn w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin360 0.7s linear infinite' }} />
              Saving…
            </>
          ) : (
            <>
              <Save size={16} /> Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
