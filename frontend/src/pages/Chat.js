import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MessageCircle,
  Phone,
  Video,
  Paperclip,
  Send,
  Smile,
  Pin,
  Shield,
  MapPin,
  Calendar,
  UserPlus,
  X,
  Trash2,
  MoreVertical,
  Eraser,
  UserX,
  Mic,
  Square,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import CallModal from "@/components/CallModal";
import SettingsMenu from "@/components/SettingsMenu";
import ChatBackgroundSelector from "@/components/ChatBackgroundSelector";
import CallHistory from "@/components/CallHistory";
import PrivacyManager from "@/components/PrivacyManager";
import MediaUploader from "@/components/MediaUploader";
import MessageReadStatus from "@/components/MessageReadStatus";
import Profile from "@/pages/Profile";
import TermsAndConditions from "@/pages/TermsAndConditions";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import MessageInput from "@/components/MessageInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useChat } from "@/contexts/ChatContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useDialog } from "@/contexts/DialogContext";

export default function Chat() {
  const GifPicker = React.lazy(() => import("@/components/GifPicker"));
  const DarkVeil = React.lazy(() => import("@/components/DarkVeil"));

  const { user, token, socket, logout, API, fetchUser } = useAuth();
  const { t } = useLanguage();
  const { confirm } = useDialog();
  
  const {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    onlineUsers,
    showCall,
    setShowCall,
    callData,
    setCallData,
    addOptimisticMessage,
    fetchConversations,
    setDownloadProgress,
    clearDownloadProgress,
  } = useChat();

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [typing, setTyping] = useState(null);
  const [dateSearch, setDateSearch] = useState({ start: "", end: "" });

  // Recording State from Custom Hook
  // (Hook is called below after addOptimisticMessage is defined)

  // Push Subscription Hook
  usePushSubscription();

  // Modal States
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // --- API Functions ---

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const createOrOpenConversation = async (userId) => {
    try {
      const res = await axios.post(
        `${API}/conversations`,
        { participant_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newConv = res.data;
      if (
        !conversations.find(
          (c) => c.conversation_id === newConv.conversation_id
        )
      ) {
        setConversations([newConv, ...conversations]);
      }
      setSelectedConversation(newConv);
      setSearchQuery("");
      setSearchResults([]);
    } catch (e) {
      toast.error("Failed to create chat");
    }
  };

  const inviteFriend = async () => {
    try {
      await axios.post(
        `${API}/users/invite`,
        { email: inviteEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Invitation sent!");
      setShowInvite(false);
      setInviteEmail("");
    } catch (e) {
      toast.error("Failed to send invitation");
    }
  };

  const blockUser = useCallback(async (e, userId) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Block User",
      description: "Are you sure you want to block this user?",
      confirmText: "Block",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;
    try {
      await axios.post(
        `${API}/users/block/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUser(token);
      toast.success("User blocked");
      if (selectedConversation?.other_user?.user_id === userId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      toast.error("Failed to block user");
    }
  }, [API, token, fetchUser, selectedConversation, setSelectedConversation, confirm]);

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Delete Conversation",
      description: "Are you sure you want to delete this conversation?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API}/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) =>
        prev.filter((c) => c.conversation_id !== convId)
      );
      if (selectedConversation?.conversation_id === convId)
        setSelectedConversation(null);
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const clearChat = async () => {
    if (!selectedConversation) return;
    const isConfirmed = await confirm({
      title: "Clear Chat",
      description: "Clear all messages? This action cannot be undone.",
      confirmText: "Clear",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(
        `${API}/conversations/${selectedConversation.conversation_id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // NOTE: We rely on a reload or proper context dispatch here ideally
      window.location.reload();
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  const startCall = (callType) => {
    if (selectedConversation) {
      setCallData({
        call_type: callType,
        callType: callType,
        otherUser: selectedConversation.other_user,
        incoming: false,
      });
      setShowCall(true);
    }
  };

  // SAFE BLOCK CHECK FOR UI
  const isCurrentChatBlocked =
    selectedConversation &&
    user &&
    (user.blocked_users || []).includes(
      selectedConversation.other_user?.user_id
    );



  const downloadFile = async (dataUrl, fileName, messageId) => {
    // If it's a blob/data URI we can just download it directly
    if (dataUrl.startsWith("data:") || dataUrl.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // If it's an external URL (e.g CDN in Phase 13), fetch it with Axios to track download progress
    if (messageId) setDownloadProgress(messageId, 0);
    try {
      const response = await axios.get(dataUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (messageId) setDownloadProgress(messageId, percentCompleted);
          }
        }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error(`Failed to download ${fileName}`);
    } finally {
      if (messageId) setTimeout(() => clearDownloadProgress(messageId), 500);
    }
  };
  
  const memoizedMessages = messages;

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Sidebar */}
      <ChatSidebar 
        setShowInvite={setShowInvite}
        setShowProfile={setShowProfile}
        logout={logout}
        setShowTerms={setShowTerms}
        setShowBackgroundSelector={setShowBackgroundSelector}
        setShowPrivacy={setShowPrivacy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchUsers={searchUsers}
        searchResults={searchResults}
        createOrOpenConversation={createOrOpenConversation}
        blockUser={blockUser}
        deleteConversation={deleteConversation}
      />

      {/* Chat Area */}
      {selectedConversation ? (
        <ChatWindow
          startCall={startCall}
          dateSearch={dateSearch}
          setDateSearch={setDateSearch}
          setShowPrivacy={setShowPrivacy}
          clearChat={clearChat}
          isCurrentChatBlocked={isCurrentChatBlocked}
          downloadFile={downloadFile}
          blockUser={blockUser}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-background relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen">
            <React.Suspense fallback={null}>
              <DarkVeil
                hueShift={0}
                noiseIntensity={0}
                scanlineIntensity={0}
                speed={0.5}
                scanlineFrequency={0}
                warpAmount={0}
              />
            </React.Suspense>
          </div>
          
          <div className="text-center animate-fade-up z-10 relative pointer-events-none">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15))', border:'1px solid rgba(139,92,246,0.3)', boxShadow:'0 0 40px rgba(124,58,237,0.2)'}}
            >
              <MessageCircle size={44} style={{color:'#a78bfa'}} />
            </div>
            <h2 className="text-3xl font-bold gradient-text mb-3">Welcome to QuickChat</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Select a conversation to start chatting securely and instantly.
            </p>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      {showCall && callData && (
        <CallModal
          callData={callData}
          socket={socket}
          userId={user?.user_id}
          onClose={() => {
            setShowCall(false);
            setCallData(null);
          }}
        />
      )}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-xl bg-card border-border">
          <Profile user={user} onBack={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <TermsAndConditions onBack={() => setShowTerms(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={showBackgroundSelector}
        onOpenChange={setShowBackgroundSelector}
      >
        <DialogContent className="max-w-xl bg-card border-border">
          <ChatBackgroundSelector />
        </DialogContent>
      </Dialog>
      <Dialog open={showCallHistory} onOpenChange={setShowCallHistory}>
        <DialogContent className="max-w-xl bg-card border-border">
          <CallHistory onClose={() => setShowCallHistory(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-xl bg-card border-border p-0">
          <PrivacyManager onClose={() => setShowPrivacy(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showGifPicker} onOpenChange={setShowGifPicker}>
        <DialogContent className="max-w-xl bg-card border-border">
          <React.Suspense fallback={<div className="p-10 text-center">Loading GIFs...</div>}>
            <GifPicker
              onSelect={(url) => {
                const tempId = addOptimisticMessage(url, "image");
                socket?.emit("send_message", {
                  conversation_id: selectedConversation.conversation_id,
                  content: url,
                  message_type: "image",
                  temp_id: tempId,
                });
                setShowGifPicker(false);
              }}
              onClose={() => setShowGifPicker(false)}
            />
          </React.Suspense>
        </DialogContent>
      </Dialog>
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{t("invite_friend")}</DialogTitle>
            <DialogDescription>
              Send an email invitation to join QuickChat.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="friend@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="bg-muted border-border"
          />
          <Button onClick={inviteFriend} className="bg-primary w-full">
            {t("invite_friend")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
