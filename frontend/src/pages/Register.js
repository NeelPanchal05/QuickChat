import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    real_name: "",
    unique_id: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedTerms) {
      toast.error("Please accept the Terms and Conditions");
      return;
    }

    setLoading(true);

    try {
      console.log("Registering with data:", formData);
      const response = await register(formData);
      console.log("Registration response:", response);
      toast.success("OTP sent to your email!");
      navigate("/verify-otp", { state: { email: formData.email } });
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error message:", error.message);
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1760978631939-32968f2e1813?crop=entropy&cs=srgb&fm=jpg&q=85)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-3xl bg-black/40 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <MessageCircle
              className="h-8 sm:h-12 w-8 sm:w-12 text-[#7000FF]"
              strokeWidth={2}
            />
            <h1
              className="text-2xl sm:text-4xl font-bold ml-2 sm:ml-3"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              QuickChat
            </h1>
          </div>

          <h2
            className="text-xl sm:text-2xl font-semibold mb-6 text-center"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Create Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label
                htmlFor="real_name"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Full Name
              </Label>
              <Input
                id="real_name"
                name="real_name"
                data-testid="real-name-input"
                type="text"
                value={formData.real_name}
                onChange={handleChange}
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="username"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Username
              </Label>
              <Input
                id="username"
                name="username"
                data-testid="username-input"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="email"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="unique_id"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Unique ID
              </Label>
              <Input
                id="unique_id"
                name="unique_id"
                data-testid="unique-id-input"
                type="text"
                value={formData.unique_id}
                onChange={handleChange}
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-sm sm:text-base"
                placeholder="Create a unique identifier"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  name="password"
                  data-testid="password-input"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] pr-10 text-sm sm:text-base"
                  required
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

            <div className="flex items-start gap-2 mt-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
                className="mt-1"
              />
              <Label
                htmlFor="terms"
                className="text-[#A1A1AA] text-xs sm:text-sm cursor-pointer leading-tight"
              >
                I agree to the Terms and Conditions and Privacy Policy
              </Label>
            </div>

            <Button
              type="submit"
              data-testid="register-button"
              disabled={loading || !acceptedTerms}
              className="w-full bg-[#7000FF] hover:bg-[#5B00D1] text-white font-semibold py-5 sm:py-6 rounded-full shadow-[0_0_20px_rgba(112,0,255,0.4)] hover:shadow-[0_0_30px_rgba(112,0,255,0.6)] transition-all duration-300 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center mt-6 text-[#A1A1AA] text-sm sm:text-base">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#7000FF] hover:text-[#9D4DFF] font-semibold transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
