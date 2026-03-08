import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Mail, Save, Hash, X, Check, ZoomIn } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Cropper from "react-easy-crop";

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
  const { user, token, API, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    real_name: user?.real_name || "",
    bio: user?.bio || "",
    profile_photo: user?.profile_photo || "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Failed to read image file.");
    }
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Max dimension for avatar
    const MAX_DIM = 256;
    canvas.width = MAX_DIM;
    canvas.height = MAX_DIM;

    // Draw the cropped area scaled to our MAX_DIM
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      MAX_DIM,
      MAX_DIM
    );

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      setFormData((prev) => ({ ...prev, profile_photo: croppedImageBase64 }));
      setShowCropper(false);
      setImageSrc(null);
      setZoom(1);
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image.");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`${API}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser(response.data);
      toast.success("Profile updated!");
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
        <div className="space-y-5 px-2 pb-4">
          <Field icon={User} label="Display Name" delay={0.05}>
            <Input
              name="real_name"
              value={formData.real_name}
              onChange={handleChange}
              className="input-glow h-12 rounded-xl text-white border-0 text-sm transition-all focus:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              placeholder="Your full name"
            />
          </Field>

          <Field icon={Hash} label="Bio" delay={0.08}>
            <Input
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="input-glow h-12 rounded-xl text-white border-0 text-sm transition-all focus:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              placeholder="Something about yourself"
            />
          </Field>

          <Field icon={Mail} label="Email (read only)" delay={0.11}>
            <Input
              value={user?.email || ""}
              readOnly
              className="h-12 rounded-xl border-0 text-sm cursor-not-allowed opacity-60"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)' }}
            />
          </Field>

          <Field icon={Hash} label="Username (read only)" delay={0.14}>
            <Input
              value={`@${user?.username || ""}`}
              readOnly
              className="h-12 rounded-xl border-0 text-sm cursor-not-allowed opacity-60 flex items-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)' }}
            />
          </Field>
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropper && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 fallback-blur bg-black/80 animate-in fade-in duration-200">
          <div className="bg-[#11111a] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[85vh] sm:h-auto sm:aspect-[4/5]">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-medium">Crop Photo</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setShowCropper(false)}
              >
                <X size={18} />
              </Button>
            </div>

            {/* Cropper Area */}
            <div className="relative flex-1 w-full bg-black/50">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Modal Footer & Controls */}
            <div className="p-4 sm:p-5 bg-[#11111a] border-t border-white/10 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <ZoomIn size={18} className="text-white/50 shrink-0" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                  onClick={() => setShowCropper(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 text-white shadow-lg shadow-primary/25"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  onClick={handleCropSave}
                >
                  <Check size={16} className="mr-2" /> Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
