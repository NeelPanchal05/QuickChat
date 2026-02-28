import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, Video, Clock, User, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function CallHistory({ open, onOpenChange }) {
  const { token, API } = useAuth();
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/calls/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCallHistory(response.data);
    } catch (error) {
      console.log("Error fetching call history");
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => {
    if (open) {
      fetchCallHistory();
    }
  }, [open, fetchCallHistory]);

  const deleteCall = async (callId) => {
    try {
      await axios.delete(`${API}/calls/${callId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Call deleted");
      setCallHistory(callHistory.filter((c) => c._id !== callId));
    } catch (error) {
      toast.error("Failed to delete call");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Call History</DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            View your recent calls and their duration
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin">
              <div className="w-8 h-8 border-4 border-[#7000FF]/30 border-t-[#7000FF] rounded-full" />
            </div>
          </div>
        ) : callHistory.length === 0 ? (
          <div className="text-center py-8 text-[#A1A1AA]">
            <Phone size={32} className="mx-auto mb-2 text-[#7000FF]" />
            <p>No call history</p>
          </div>
        ) : (
          <div className="space-y-2">
            {callHistory.map((call) => (
              <div
                key={call._id}
                className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {call.type === "video" ? (
                    <div className="p-2 bg-[#7000FF]/20 rounded-lg">
                      <Video size={18} className="text-[#7000FF]" />
                    </div>
                  ) : (
                    <div className="p-2 bg-[#7000FF]/20 rounded-lg">
                      <Phone size={18} className="text-[#7000FF]" />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-[#A1A1AA]" />
                      <p className="font-semibold text-white">
                        {call.participant?.real_name || "Unknown User"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                      <Clock size={14} />
                      {formatTime(call.timestamp)}
                      {call.duration && ` • ${formatDuration(call.duration)}`}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => deleteCall(call._id)}
                  size="icon"
                  variant="ghost"
                  className="text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
