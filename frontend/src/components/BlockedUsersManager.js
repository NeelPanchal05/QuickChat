import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { UserX, Unlock } from "lucide-react";

export default function BlockedUsersManager({ onClose }) {
  const { token, API } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wrapped in useCallback to prevent infinite loops and satisfy linting
  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlockedUsers(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const unblockUser = async (userId) => {
    try {
      await axios.post(
        `${API}/users/unblock/${userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBlockedUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success("User unblocked");
    } catch (e) {
      toast.error("Failed to unblock user");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserX className="text-red-500" size={24} />
        <h2 className="text-xl font-bold text-white">Blocked Users</h2>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : blockedUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>You haven't blocked anyone yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {blockedUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profile_photo} />
                  <AvatarFallback>{user.username[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">
                    {user.real_name}
                  </p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => unblockUser(user.user_id)}
                className="text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
              >
                <Unlock size={14} className="mr-2" /> Unblock
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-white/10">
        <Button variant="ghost" onClick={onClose} className="text-white">
          Close
        </Button>
      </div>
    </div>
  );
}
