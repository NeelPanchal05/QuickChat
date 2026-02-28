import React, { useState, useEffect, useCallback } from "react";
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
  AlertTriangle,
  Archive,
  UserX,
  Unlock,
} from "lucide-react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PrivacyManager({ onClose }) {
  const { user, token, API, logout, fetchUser } = useAuth();

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
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Archive State
  const [archivedChats, setArchivedChats] = useState([]);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [API, token]);

  const fetchArchivedChats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/conversations/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setArchivedChats(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [API, token]);

  useEffect(() => {
    fetchBlockedUsers();
    fetchArchivedChats();
  }, [fetchBlockedUsers, fetchArchivedChats]);

  const toggleReadReceipts = (checked) => {
    setReadReceipts(checked);
    localStorage.setItem("privacy_read_receipts", JSON.stringify(checked));
    toast.success(`Read receipts ${checked ? "enabled" : "disabled"}`);
  };

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

  const unblockUser = async (userId) => {
    try {
      await axios.post(
        `${API}/users/unblock/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User unblocked");
      fetchBlockedUsers();
      fetchUser(token); // Update global user context
    } catch (e) {
      toast.error("Failed to unblock");
    }
  };

  const restoreChat = async (convId) => {
    try {
      await axios.put(
        `${API}/conversations/${convId}/archive`,
        { archived: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Chat restored");
      fetchArchivedChats();
    } catch (e) {
      toast.error("Failed to restore chat");
    }
  };

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
    <div className="flex flex-col h-[500px] w-full text-foreground bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-card">
        <Shield className="text-primary" size={24} />
        <h2 className="text-xl font-bold">Privacy & Security</h2>
      </div>

      <Tabs defaultValue="security" className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-1/3 border-r border-border bg-muted/20">
          <TabsList className="flex flex-col h-full justify-start space-y-1 bg-transparent p-2">
            <TabsTrigger
              value="security"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Key size={16} /> Security
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Eye size={16} /> Privacy
            </TabsTrigger>
            <TabsTrigger
              value="archive"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Archive size={16} /> Archive
            </TabsTrigger>
            <div className="flex-1"></div>
            <TabsTrigger
              value="danger"
              className="w-full justify-start gap-2 px-3 py-2 text-destructive hover:text-destructive hover:bg-destructive/10 data-[state=active]:bg-destructive/10"
            >
              <Trash2 size={16} /> Danger Zone
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-card">
          {/* SECURITY TAB */}
          <TabsContent value="security" className="mt-0 space-y-6">
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
                      setPassData({ ...passData, old_password: e.target.value })
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
                      setPassData({ ...passData, new_password: e.target.value })
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
                Your messages and calls are secured. Only you and the person
                you're communicating with can access them.
              </p>
            </div>
          </TabsContent>

          {/* PRIVACY TAB */}
          <TabsContent value="privacy" className="mt-0 space-y-6">
            {/* Read Receipts */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Read Receipts</h4>
                <p className="text-xs text-muted-foreground">
                  Allow others to see when you've read messages.
                </p>
              </div>
              <Switch
                checked={readReceipts}
                onCheckedChange={toggleReadReceipts}
              />
            </div>

            {/* Blocked Users */}
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <UserX size={18} /> Blocked Users
              </h3>
              {blockedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No blocked users.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {blockedUsers.map((u) => (
                    <div
                      key={u.user_id}
                      className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.profile_photo} />
                          <AvatarFallback>{u.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {u.real_name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockUser(u.user_id)}
                      >
                        <Unlock size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ARCHIVE TAB */}
          <TabsContent value="archive" className="mt-0 space-y-4">
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Archive size={18} /> Archived Chats
            </h3>
            {archivedChats.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No chats archived.
              </p>
            ) : (
              <div className="space-y-2">
                {archivedChats.map((chat) => (
                  <div
                    key={chat.conversation_id}
                    className="flex justify-between items-center p-3 bg-muted/30 rounded border border-border"
                  >
                    <span className="text-sm font-medium">
                      Chat with {chat.participants[0] || "User"}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => restoreChat(chat.conversation_id)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DANGER ZONE TAB */}
          <TabsContent value="danger" className="mt-0 space-y-6">
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle size={20} />
                <h3 className="font-bold">Delete Account</h3>
              </div>
              <p className="text-sm text-destructive/80 mb-4">
                Once you delete your account, there is no going back. All your
                data will be permanently removed.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="w-full"
              >
                Delete My Account
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 border-t border-border flex justify-end bg-card">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
