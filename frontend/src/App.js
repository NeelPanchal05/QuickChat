import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SoundProvider } from "./contexts/SoundContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// --- OPTIMIZATION: Lazy Load Pages ---
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const Chat = lazy(() => import("./pages/Chat"));

// Loading Component
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
    <div className="animate-pulse flex flex-col items-center">
      <div className="h-12 w-12 bg-primary rounded-full mb-4"></div>
      <p className="text-sm text-muted-foreground">Loading QuickChat...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  // 1. Global loading check
  if (loading) return <PageLoader />;

  // 2. Auth token check
  if (!token) return <Navigate to="/login" />;

  // 3. User data safety check
  // This is CRITICAL. It prevents the Chat component from mounting
  // until the user object is fully ready, preventing the "Black Screen".
  if (!user) return <PageLoader />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SoundProvider>
            <LanguageProvider>
              <div className="bg-background text-foreground min-h-screen">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-otp" element={<VerifyOTP />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Chat />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <Chat />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
                <Toaster />
              </div>
            </LanguageProvider>
          </SoundProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
