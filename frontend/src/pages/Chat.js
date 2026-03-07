import React, { useState, useMemo } from "react";
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
import GifPicker from "@/components/GifPicker";
import MessageReadStatus from "@/components/MessageReadStatus";
import Profile from "@/pages/Profile";
import TermsAndConditions from "@/pages/TermsAndConditions";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import MessageInput from "@/components/MessageInput";
import DarkVeil from "@/components/DarkVeil";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useChat } from "@/contexts/ChatContext";

export default function Chat() {
  const { user, token, socket, logout, API, fetchUser } = useAuth();
  const { t } = useLanguage();
  
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
  } = useChat();

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [typing, setTyping] = useState(null);
  const [dateSearch, setDateSearch] = useState({ start: "", end: "" });

  // Recording State from Custom Hook
  // (Hook is called below after addOptimisticMessage is defined)

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

  const blockUser = async (e, userId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to block this user?")) return;
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
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?"))
      return;
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
    if (!window.confirm("Clear all messages?")) return;
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



  const downloadFile = (dataUrl, fileName) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const memoizedMessages = useMemo(() => {
    return messages.map((m, i) => {
      const isOwn = user && m.sender_id === user.user_id;

      if (m.message_type === "poll") return null;

      return (
        <div
          key={m.message_id}
          className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-message-in`}
          style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}
        >
          <div
            className={`max-w-[72%] px-4 py-2.5 rounded-2xl ${
              isOwn
                ? "bubble-own text-white rounded-tr-sm"
                : "bubble-other text-foreground rounded-tl-sm"
            }`}
          >
            {m.message_type === "text" && (
              <p className="text-sm leading-relaxed break-words">{m.content}</p>
            )}
            {m.message_type === "location" && (
              <a
                href={m.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-inherit text-sm underline underline-offset-2"
              >
                <MapPin size={14} /> {t("view_location")}
              </a>
            )}
            {m.message_type === "image" && (
              <div className="relative group">
                <img src={m.content} alt="attachment" className="rounded-xl max-h-60 object-cover" />
                <button
                  onClick={() => downloadFile(m.content, m.file_name || "image.jpg")}
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white"
                  title="Download image"
                >
                  <Download size={14} />
                </button>
              </div>
            )}
            {m.message_type && ["audio", "video"].includes(m.message_type.split("/")[0]) && (
              <div>
                <video controls src={m.content} className="max-w-full rounded-xl" />
                <button
                  onClick={() => downloadFile(m.content, m.file_name || "video")}
                  className="mt-1 flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity"
                  title="Download"
                >
                  <Download size={12} /> Download
                </button>
              </div>
            )}
            {m.message_type &&
              !["text", "location", "image", "poll"].includes(m.message_type) &&
              !["audio", "video"].includes(m.message_type.split("/")[0]) && (
              <button
                onClick={() => downloadFile(m.content, m.file_name || "file")}
                className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                title="Download file"
              >
                <Paperclip size={14} />
                <span className="underline underline-offset-2">{m.file_name || t("attached_file")}</span>
                <Download size={13} className="ml-1 opacity-70" />
              </button>
            )}
            <div className="flex justify-end items-center mt-1 gap-1.5">
              <span className="text-[10px]" style={{opacity: 0.55}}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isOwn && (
                <MessageReadStatus status={m.read_by?.length > 1 ? "read" : "sent"} />
              )}
            </div>
          </div>
        </div>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user, t]);

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
          memoizedMessages={memoizedMessages}
          isCurrentChatBlocked={isCurrentChatBlocked}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-background relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen">
            <DarkVeil
              hueShift={0}
              noiseIntensity={0}
              scanlineIntensity={0}
              speed={0.5}
              scanlineFrequency={0}
              warpAmount={0}
            />
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
