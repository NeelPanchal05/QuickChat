import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginData, setLoginData] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
      {/* Animated overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,7,15,0.88) 0%, rgba(30,0,60,0.75) 100%)', backdropFilter: 'blur(4px)' }} />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none animate-orb-float"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat 11s ease-in-out infinite reverse' }} />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          style={{
            background: 'rgba(10,10,22,0.82)',
            backdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '40px 36px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-8" style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl logo-shimmer flex items-center justify-center"
                style={{ boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
                <MessageCircle className="text-white w-7 h-7" />
              </div>
              <Sparkles size={14} className="absolute -top-1 -right-1 text-violet-300" style={{ animation: 'popIn 0.4s 0.5s both' }} />
            </div>
            <h1 className="text-3xl font-bold ml-3 gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              QuickChat
            </h1>
          </div>

          <h2 className="text-xl font-semibold mb-1 text-center text-white animate-fade-in stagger-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h2>
          <p className="text-sm text-center mb-8 animate-fade-in stagger-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Sign in to continue chatting
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email/Username */}
            <div className="animate-slide-up stagger-2">
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'rgba(167,139,250,0.8)' }}>
                Email or Username
              </label>
              <div className="field-focus-ring">
                <Input
                  id="login"
                  data-testid="login-input"
                  type="text"
                  value={loginData}
                  onChange={(e) => setLoginData(e.target.value)}
                  className="auth-input h-12 rounded-xl text-white text-sm w-full"
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-slide-up stagger-3">
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'rgba(167,139,250,0.8)' }}>
                Password
              </label>
              <div className="relative field-focus-ring">
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input h-12 rounded-xl text-white text-sm pr-12 w-full"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn-hover p-1"
                  style={{ color: 'rgba(167,139,250,0.7)' }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="animate-slide-up stagger-4 pt-2">
              <button
                type="submit"
                data-testid="login-button"
                disabled={loading}
                className="ripple-btn w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin360 0.7s linear infinite' }} />
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm animate-fade-in stagger-5" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="font-semibold transition-colors"
              style={{ color: '#a78bfa', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#c4b5fd'}
              onMouseLeave={e => e.target.style.color = '#a78bfa'}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
