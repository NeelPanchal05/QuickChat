import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Eye,
  Trash2,
  Lock,
  Save,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";

export default function PrivacyManager({ onClose }) {
  const { user, token, API, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("security"); // security | privacy | danger

  // Security State
  const [passData, setPassData] = useState({
    old_password: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(false);

  // Privacy State
  const [readReceipts, setReadReceipts] = useState(
    JSON.parse(localStorage.getItem("privacy_read_receipts") ?? "true")
  );

  // Handle Privacy Toggles
  const toggleReadReceipts = (checked) => {
    setReadReceipts(checked);
    localStorage.setItem("privacy_read_receipts", JSON.stringify(checked));
    toast.success(`Read receipts ${checked ? "enabled" : "disabled"}`);
  };

  // Handle Password Change
  const handleChangePassword = async () => {
    if (!passData.old_password || !passData.new_password) {
      toast.error("Please fill in both fields");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, passData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Password changed successfully");
      setPassData({ old_password: "", new_password: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    const confirm = window.prompt(
      "Type 'DELETE' to confirm account deletion. This cannot be undone."
    );
    if (confirm !== "DELETE") return;

    try {
      await axios.delete(`${API}/auth/delete-account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Account deleted");
      logout();
    } catch (e) {
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Shield className="text-primary" size={24} />
        <h2 className="text-xl font-bold">Privacy & Security</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border p-2 space-y-1 bg-muted/30">
          <Button
            variant={activeTab === "security" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab("security")}
          >
            <Key size={16} /> Security
          </Button>
          <Button
            variant={activeTab === "privacy" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab("privacy")}
          >
            <Eye size={16} /> Privacy
          </Button>
          <Button
            variant={activeTab === "danger" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => setActiveTab("danger")}
          >
            <Trash2 size={16} /> Danger Zone
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-1">Change Password</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Update your password to keep your account secure.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={passData.old_password}
                      onChange={(e) =>
                        setPassData({
                          ...passData,
                          old_password: e.target.value,
                        })
                      }
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">New Password</label>
                    <Input
                      type="password"
                      value={passData.new_password}
                      onChange={(e) =>
                        setPassData({
                          ...passData,
                          new_password: e.target.value,
                        })
                      }
                      className="bg-muted border-border"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Lock size={16} />
                  <span className="text-sm font-medium">
                    End-to-End Encryption
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your messages and calls are secured with end-to-end
                  encryption. Only you and the person you're communicating with
                  can read or listen to them.
                </p>
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Read Receipts</h4>
                  <p className="text-xs text-muted-foreground">
                    Allow others to see when you've read their messages.
                  </p>
                </div>
                <Switch
                  checked={readReceipts}
                  onCheckedChange={toggleReadReceipts}
                />
              </div>

              {/* Placeholder for future features */}
              <div
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border opacity-50 cursor-not-allowed"
                title="Coming Soon"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium">Online Status</h4>
                  <p className="text-xs text-muted-foreground">
                    Show when you are active on QuickChat.
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === "danger" && (
            <div className="space-y-6">
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle size={20} />
                  <h3 className="font-bold">Delete Account</h3>
                </div>
                <p className="text-sm text-destructive/80 mb-4">
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="w-full"
                >
                  Delete My Account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
