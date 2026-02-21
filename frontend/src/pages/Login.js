import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginData, setLoginData] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(loginData, password);
      toast.success("Login successful!");
      navigate("/chat");
    } catch (error) {
      toast.error(error.message || "Login failed");
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
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="login"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                Email or Username
              </Label>
              <Input
                id="login"
                data-testid="login-input"
                type="text"
                value={loginData}
                onChange={(e) => setLoginData(e.target.value)}
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-sm sm:text-base"
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
                  data-testid="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button
              type="submit"
              data-testid="login-button"
              disabled={loading}
              className="w-full bg-[#7000FF] hover:bg-[#5B00D1] text-white font-semibold py-5 sm:py-6 rounded-full shadow-[0_0_20px_rgba(112,0,255,0.4)] hover:shadow-[0_0_30px_rgba(112,0,255,0.6)] transition-all duration-300 text-sm sm:text-base"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center mt-6 text-[#A1A1AA] text-sm sm:text-base">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#7000FF] hover:text-[#9D4DFF] font-semibold transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
