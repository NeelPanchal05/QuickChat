import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

function LoginForm({ containerRef }) {
  const navigate = useNavigate();
  const { login, googleAuth } = useAuth();
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await googleAuth(credentialResponse.credential);
      toast.success("Google Login successful!");
      navigate("/chat");
    } catch (error) {
      toast.error(error.message || "Google Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            willChange: 'transform'
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin360 0.7s linear infinite' }} />
              Signing in…
            </span>
          ) : "Sign In"}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase">Or</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <div className="flex justify-center w-full pb-2">
           <GoogleLogin
             onSuccess={handleGoogleSuccess}
             onError={() => toast.error("Google Login Failed")}
             theme="filled_black"
             shape="rectangular"
             text="continue_with"
             width="100%"
           />
        </div>
      </div>
    </form>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);



  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden bg-black"
    >

      {/* Card */}
      <div
        ref={containerRef}
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

          <div className="text-xl font-semibold mb-1 text-center text-white animate-fade-in stagger-1 cursor-default">
            Welcome back
          </div>
          <p className="text-sm text-center mb-8 animate-fade-in stagger-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Sign in to continue chatting
          </p>

          <LoginForm containerRef={containerRef} />

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
