import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, MessageCircle, Sparkles, User, AtSign, Mail, Hash, Lock } from "lucide-react";
import { toast } from "sonner";
import VariableProximity from "@/components/ui/VariableProximity";
import { useRef } from "react";

const fields = [
  { name: "real_name",  label: "Full Name",  icon: User,   type: "text",     placeholder: "Your full name",              testId: "real-name-input" },
  { name: "username",   label: "Username",   icon: AtSign, type: "text",     placeholder: "@yourhandle",                  testId: "username-input" },
  { name: "email",      label: "Email",      icon: Mail,   type: "email",    placeholder: "you@example.com",              testId: "email-input" },
  { name: "unique_id",  label: "Unique ID",  icon: Hash,   type: "text",     placeholder: "A searchable unique ID",       testId: "unique-id-input" },
  { name: "password",   label: "Password",   icon: Lock,   type: "password", placeholder: "Create a strong password",     testId: "password-input" },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ email: "", username: "", password: "", real_name: "", unique_id: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error("Please accept the Terms and Conditions"); return; }
    setLoading(true);
    try {
      await register(formData);
      toast.success("OTP sent to your email!");
      navigate("/verify-otp", { state: { email: formData.email } });
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const memoizedBackground = useMemo(() => (
    <>
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,7,15,0.9) 0%, rgba(30,0,60,0.78) 100%)', backdropFilter: 'blur(4px)' }} />

      {/* Orbs */}
      <div className="absolute top-1/3 left-1/5 w-72 h-72 rounded-full pointer-events-none animate-orb-float"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat 12s ease-in-out infinite reverse' }} />
    </>
  ), []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1760978631939-32968f2e1813?crop=entropy&cs=srgb&fm=jpg&q=85)",
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      {memoizedBackground}

      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{
          background: 'rgba(10,10,22,0.82)', backdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
          padding: '36px', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          {/* Logo */}
          <div className="flex items-center justify-center mb-7" style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl logo-shimmer flex items-center justify-center" style={{ boxShadow: '0 8px 28px rgba(124,58,237,0.4)' }}>
                <MessageCircle className="text-white w-6 h-6" />
              </div>
              <Sparkles size={12} className="absolute -top-1 -right-1 text-violet-300" style={{ animation: 'popIn 0.4s 0.5s both' }} />
            </div>
            <h1 className="text-2xl font-bold ml-3 gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>QuickChat</h1>
          </div>

          <div className="text-lg font-semibold mb-1 text-center text-white animate-fade-in cursor-default">
            <VariableProximity
              label="Create an account"
              containerRef={containerRef}
              radius={100}
              falloff="linear"
              fromFontVariationSettings="'wght' 400, 'opsz' 9"
              toFontVariationSettings="'wght' 1000, 'opsz' 40"
            />
          </div>
          <p className="text-xs text-center mb-6 animate-fade-in stagger-1" style={{ color: 'rgba(255,255,255,0.38)' }}>Join thousands chatting securely</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.name} className="animate-slide-up" style={{ animationDelay: `${0.04 + i * 0.04}s` }}>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block" style={{ color: 'rgba(167,139,250,0.7)' }}>
                  <f.icon size={11} /> {f.label}
                </label>
                <div className="relative field-focus-ring">
                  <Input
                    name={f.name}
                    id={f.name}
                    data-testid={f.testId}
                    type={f.name === "password" ? (showPassword ? "text" : "password") : f.type}
                    value={formData[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    className="auth-input h-11 rounded-xl text-white text-sm w-full"
                    required
                  />
                  {f.name === "password" && (
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn-hover p-1"
                      style={{ color: 'rgba(167,139,250,0.6)' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Terms */}
            <div className="flex items-start gap-3 pt-1 animate-fade-in stagger-5">
              <div
                className="w-5 h-5 rounded mt-0.5 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200"
                style={{
                  background: acceptedTerms ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
                  border: `1.5px solid ${acceptedTerms ? '#7c3aed' : 'rgba(255,255,255,0.2)'}`,
                  boxShadow: acceptedTerms ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                }}
                onClick={() => setAcceptedTerms(v => !v)}
              >
                {acceptedTerms && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <label className="text-xs leading-snug cursor-pointer" style={{ color: 'rgba(255,255,255,0.45)' }} onClick={() => setAcceptedTerms(v => !v)}>
                I agree to the{" "}
                <span style={{ color: '#a78bfa' }}>Terms and Conditions</span> and{" "}
                <span style={{ color: '#a78bfa' }}>Privacy Policy</span>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-1 animate-slide-up stagger-6">
              <button
                type="submit"
                data-testid="register-button"
                disabled={loading || !acceptedTerms}
                className="ripple-btn w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 24px rgba(124,58,237,0.4)', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin360 0.7s linear infinite' }} />
                    Creating account…
                  </span>
                ) : "Create Account"}
              </button>
            </div>
          </form>

          <p className="text-center mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="font-semibold" style={{ color: '#a78bfa' }}
              onMouseEnter={e => e.target.style.color = '#c4b5fd'}
              onMouseLeave={e => e.target.style.color = '#a78bfa'}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
