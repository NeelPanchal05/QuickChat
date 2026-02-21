import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email not found. Please register again.");
      navigate("/register");
      return;
    }

    setLoading(true);

    try {
      await verifyOtp(email, otp);
      toast.success("Account verified successfully!");
      navigate("/chat");
    } catch (error) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4"
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
            className="text-xl sm:text-2xl font-semibold mb-2 text-center"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Verify Your Email
          </h2>

          <p className="text-[#A1A1AA] text-center mb-6 text-sm sm:text-base">
            Enter the 6-digit code sent to {email}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="otp"
                className="text-[#A1A1AA] text-sm sm:text-base"
              >
                OTP Code
              </Label>
              <Input
                id="otp"
                data-testid="otp-input"
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="bg-black/20 border-white/10 text-white focus:border-[#7000FF] focus:ring-[#7000FF] mt-2 text-center text-xl sm:text-2xl tracking-widest"
                maxLength={6}
                placeholder="000000"
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="verify-button"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#7000FF] hover:bg-[#5B00D1] text-white font-semibold py-5 sm:py-6 rounded-full shadow-[0_0_20px_rgba(112,0,255,0.4)] hover:shadow-[0_0_30px_rgba(112,0,255,0.6)] transition-all duration-300 text-sm sm:text-base"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>

          <p className="text-center mt-6 text-[#A1A1AA] text-sm sm:text-base">
            Didn't receive the code?{" "}
            <button className="text-[#7000FF] hover:text-[#9D4DFF] font-semibold transition-colors">
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
