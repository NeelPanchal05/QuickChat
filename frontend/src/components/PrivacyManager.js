import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Archive, AlertCircle, Check } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivacyManager({ open, onOpenChange, conversations }) {
  const { token, API } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [archivedChats, setArchivedChats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
      fetchArchivedChats();
    }
  }, [open]);

  const fetchBlockedUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(response.data);
    } catch (error) {
      console.log("No blocked users or error fetching");
    }
  };

  const fetchArchivedChats = async () => {
    try {
      const response = await axios.get(`${API}/conversations/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setArchivedChats(response.data);
    } catch (error) {
      console.log("No archived chats or error fetching");
    }
  };

  const blockUser = async (userId) => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/users/block/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User blocked successfully");
      fetchBlockedUsers();
    } catch (error) {
      toast.error("Failed to block user");
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId) => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/users/unblock/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User unblocked");
      fetchBlockedUsers();
    } catch (error) {
      toast.error("Failed to unblock user");
    } finally {
      setLoading(false);
    }
  };

  const archiveChat = async (conversationId) => {
    setLoading(true);
    try {
      await axios.put(
        `${API}/conversations/${conversationId}/archive`,
        { archived: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Chat archived");
      fetchArchivedChats();
    } catch (error) {
      toast.error("Failed to archive chat");
    } finally {
      setLoading(false);
    }
  };

  const unarchiveChat = async (conversationId) => {
    setLoading(true);
    try {
      await axios.put(
        `${API}/conversations/${conversationId}/archive`,
        { archived: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Chat unarchived");
      fetchArchivedChats();
    } catch (error) {
      toast.error("Failed to unarchive chat");
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (conversationId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this chat? This action cannot be undone."
      )
    ) {
      setLoading(true);
      try {
        await axios.delete(`${API}/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Chat deleted");
        fetchArchivedChats();
      } catch (error) {
        toast.error("Failed to delete chat");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Privacy & Archive Settings
          </DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            Manage blocked users and archived conversations
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="blocked" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border-white/10">
            <TabsTrigger
              value="blocked"
              className="data-[state=active]:bg-[#7000FF] data-[state=active]:text-white"
            >
              <AlertCircle size={16} className="mr-2" />
              Blocked Users
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="data-[state=active]:bg-[#7000FF] data-[state=active]:text-white"
            >
              <Archive size={16} className="mr-2" />
              Archived Chats
            </TabsTrigger>
          </TabsList>

          {/* Blocked Users Tab */}
          <TabsContent value="blocked" className="space-y-4">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-8 text-[#A1A1AA]">
                <Check size={32} className="mx-auto mb-2 text-[#7000FF]" />
                <p>No blocked users</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {user.real_name}
                      </p>
                      <p className="text-sm text-[#A1A1AA]">@{user.username}</p>
                    </div>
                    <Button
                      onClick={() => unblockUser(user._id)}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-[#A1A1AA] hover:text-white"
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Archived Chats Tab */}
          <TabsContent value="archived" className="space-y-4">
            {archivedChats.length === 0 ? (
              <div className="text-center py-8 text-[#A1A1AA]">
                <Archive size={32} className="mx-auto mb-2 text-[#7000FF]" />
                <p>No archived chats</p>
              </div>
            ) : (
              <div className="space-y-2">
                {archivedChats.map((chat) => (
                  <div
                    key={chat._id}
                    className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {chat.participants[0]?.real_name || "Unknown User"}
                      </p>
                      <p className="text-sm text-[#A1A1AA]">
                        {chat.messages?.[
                          chat.messages.length - 1
                        ]?.content?.substring(0, 40) || "No messages"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => unarchiveChat(chat._id)}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-[#A1A1AA] hover:text-white"
                      >
                        Restore
                      </Button>
                      <Button
                        onClick={() => deleteChat(chat._id)}
                        disabled={loading}
                        size="sm"
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-400"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
