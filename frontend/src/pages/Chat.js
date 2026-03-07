import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSound } from "@/contexts/SoundContext";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Chat() {
  const { user, token, socket, logout, API, fetchUser } = useAuth();
  const { currentThemeData } = useTheme();
  const { playNotificationSound } = useSound();
  const { t } = useLanguage();

  // Data States
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // UI States
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [dateSearch, setDateSearch] = useState({ start: "", end: "" });

  // Recording State from Custom Hook
  // (Hook is called below after addOptimisticMessage is defined)

  // Modal States
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Call States
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(selectedConversation);

  // --- Sync Ref with State ---
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // --- API Functions ---
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [API, token]);

  const fetchMessages = useCallback(
    async (convId, dates = null) => {
      try {
        let url = `${API}/conversations/${convId}/messages`;
        if (dates && dates.start) {
          url += `?start_date=${dates.start}`;
          if (dates.end) url += `&end_date=${dates.end}`;
        }
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (e) {
        console.error(e);
      }
    },
    [API, token]
  );

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
      setMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  };

  const addOptimisticMessage = (content, type, fileName = null) => {
    if (!user) return null;
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      message_id: tempId,
      conversation_id: selectedConversation.conversation_id,
      sender_id: user.user_id,
      content: content,
      message_type: type,
      file_name: fileName,
      timestamp: new Date().toISOString(),
      read_by: [user.user_id],
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.conversation_id === selectedConversation.conversation_id) {
          return {
            ...c,
            last_message: optimisticMsg,
            updated_at: optimisticMsg.timestamp,
          };
        }
        return c;
      });
      return updated.sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
    });

    return tempId;
  };

  // --- Custom Hooks Initialization ---
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(
    API,
    token,
    selectedConversation,
    addOptimisticMessage
  );



  // --- Socket & User Effects ---
  useEffect(() => {
    // If user is not fully loaded, do not set up listeners yet to prevent crashes
    if (!socket || !user) return;

    const handleNewMessage = (msg) => {
      const currentConv = selectedConversationRef.current;

      setMessages((prev) => {
        // If the server echoed back a temp_id, swap the optimistic placeholder
        if (msg.temp_id) {
          const idx = prev.findIndex((m) => m.message_id === msg.temp_id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...msg };
            return next;
          }
        }
        // Deduplicate by real message_id
        if (prev.some((m) => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });

      if (msg.sender_id !== user.user_id) {
        playNotificationSound();
        if (
          currentConv &&
          msg.conversation_id === currentConv.conversation_id
        ) {
          const allowReadReceipts = JSON.parse(
            localStorage.getItem("privacy_read_receipts") ?? "true"
          );
          if (allowReadReceipts) {
            socket.emit("message_read", {
              message_id: msg.message_id,
              conversation_id: msg.conversation_id,
            });
          }
        }
      }
      fetchConversations();
    };

    const handleUserTyping = (data) => {
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversation_id === currentConv.conversation_id) {
        setTyping(data.user_id);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
      }
    };
    const handleIncomingCall = (data) => {
      setCallData({ ...data, incoming: true });
      setShowCall(true);
    };
    const handleOnline = (data) =>
      setOnlineUsers((p) => new Set([...p, data.user_id]));
    const handleOffline = (data) =>
      setOnlineUsers((p) => {
        const newSet = new Set(p);
        newSet.delete(data.user_id);
        return newSet;
      });
    const handleError = (data) => toast.error(data.message);

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("incoming_call", handleIncomingCall);
    socket.on("error", handleError);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("incoming_call", handleIncomingCall);
      socket.off("error", handleError);
    };
  }, [socket, fetchConversations, playNotificationSound, user]); // Added user dependency

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);
  useEffect(() => {
    if (selectedConversation && socket) {
      fetchMessages(selectedConversation.conversation_id);
      socket.emit("join_conversation", {
        conversation_id: selectedConversation.conversation_id,
      });
    }
  }, [selectedConversation, fetchMessages, socket]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !selectedConversation ||
      !user
    )
      return;

    // SAFE BLOCK CHECK
    const blockedList = user.blocked_users || [];
    if (blockedList.includes(selectedConversation.other_user?.user_id)) {
      toast.error("You have blocked this user. Unblock to chat.");
      return;
    }

    if (messageInput.trim()) {
      const tempId = addOptimisticMessage(messageInput, "text");
      socket?.emit("send_message", {
        conversation_id: selectedConversation.conversation_id,
        content: messageInput,
        message_type: "text",
        temp_id: tempId,
      });
    }

    for (const file of attachedFiles) {
      const tempId = addOptimisticMessage(file.data, file.type, file.name);

      try {
        await axios.post(
          `${API}/conversations/${selectedConversation.conversation_id}/messages`,
          { content: file.data, message_type: file.type, file_name: file.name, temp_id: tempId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        toast.error(`Failed to send ${file.name}`);
      }
    }

    setMessageInput("");
    setAttachedFiles([]);
    setShowMediaUploader(false);
    setShowEmojiPicker(false);
  };

  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    toast.info("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const locationUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const tempId = addOptimisticMessage(locationUrl, "location");
        socket?.emit("send_message", {
          conversation_id: selectedConversation.conversation_id,
          content: locationUrl,
          message_type: "location",
          temp_id: tempId,
        });
      },
      () => toast.error("Unable to retrieve location")
    );
  };

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  const isUserOnline = (userId) => onlineUsers.has(userId);
  const startCall = (callType) => {
    if (selectedConversation) {
      setCallData({
        call_type: callType, // Changed from callType to call_type
        callType: callType,  // Keep both for compatibility
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

  const memoizedConversations = useMemo(() => {
    return conversations.map((c) => (
      <div
        key={c.conversation_id}
        onClick={() => setSelectedConversation(c)}
        className={`conv-row group p-4 border-b border-border cursor-pointer relative text-foreground ${
          selectedConversation?.conversation_id === c.conversation_id
            ? "active"
            : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-11 w-11 ring-2" style={{ringColor: selectedConversation?.conversation_id === c.conversation_id ? 'rgba(139,92,246,0.5)' : 'transparent'}}>
              <AvatarImage src={c.other_user?.profile_photo} />
              <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontFamily:"'Space Grotesk',sans-serif",fontWeight:700}}>{c.other_user?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            {isUserOnline(c.other_user?.user_id) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 online-badge" style={{background:'#22c55e', borderColor:'rgba(10,10,20,1)'}} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-foreground truncate">
                {c.other_user?.real_name}
              </span>
              {c.is_pinned && <Pin size={11} className="text-violet-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {c.last_message?.content
                ? c.last_message.content.length > 32
                  ? c.last_message.content.substring(0, 32) + "…"
                  : c.last_message.content
                : t("start_chatting")}
            </p>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreVertical size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" style={{background:'rgba(14,14,26,0.97)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <DropdownMenuItem
                  onClick={(e) => blockUser(e, c.other_user?.user_id)}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                >
                  <UserX size={13} className="mr-2" /> Block User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => deleteConversation(e, c.conversation_id)}
                  className="text-destructive focus:text-destructive cursor-pointer text-xs"
                >
                  <Trash2 size={13} className="mr-2" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedConversation, onlineUsers, t]);

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
              <img src={m.content} alt="attachment" className="rounded-xl max-h-60 object-cover" />
            )}
            {m.message_type && ["audio", "video"].includes(m.message_type.split("/")[0]) && (
              <video controls src={m.content} className="max-w-full rounded-xl" />
            )}
            {m.message_type &&
              !["text", "location", "image", "poll"].includes(m.message_type) &&
              !["audio", "video"].includes(m.message_type.split("/")[0]) && (
              <div className="flex items-center gap-2 text-sm">
                <Paperclip size={14} />
                <span className="underline underline-offset-2">{m.file_name || t("attached_file")}</span>
              </div>
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
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } w-full md:w-80 flex-col h-full relative z-10 bg-card border-r border-border`}
        style={{ backdropFilter: 'blur(24px)' }}
      >
        {/* Sidebar top gradient orb */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{background: 'radial-gradient(ellipse at 50% -20%, rgba(109,40,217,0.15) 0%, transparent 70%)'}} />
        <div className="p-4 border-b border-border relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'}}>
                <MessageCircle className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold gradient-text hidden sm:block">QuickChat</h1>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost" size="icon"
                onClick={() => setShowInvite(true)}
                className="icon-btn-hover text-muted-foreground h-8 w-8"
              >
                <UserPlus size={18} />
              </Button>
              <SettingsMenu
                onProfile={() => setShowProfile(true)}
                onLogout={logout}
                onTerms={() => setShowTerms(true)}
                onBackgrounds={() => setShowBackgroundSelector(true)}
                onPrivacy={() => setShowPrivacy(true)}
              />
            </div>
          </div>
          <div className="relative z-20">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
              className="pl-9 pr-4 rounded-full h-9 text-foreground text-sm bg-muted border border-border"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden bg-popover border border-border" style={{ maxHeight: '12rem', overflowY: 'auto' }}>
              {searchResults.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => createOrOpenConversation(u.user_id)}
                  className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <Avatar className="h-8 w-8 ring-1" style={{ringColor:'rgba(139,92,246,0.3)'}}>
                    <AvatarImage src={u.profile_photo} />
                    <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontSize:'12px'}}>{u.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.real_name}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {memoizedConversations}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div
          className={`${
            !selectedConversation ? "hidden md:flex" : "flex"
          } flex-1 flex-col h-full relative`}
          style={currentThemeData?.bgStyle || undefined}
        >
          {/* Chat Header */}
          <div className="p-3 md:p-4 flex justify-between items-center z-10 flex-shrink-0 bg-card border-b border-border"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center gap-3">
              <Button
                variant="ghost" size="icon"
                className="md:hidden text-foreground icon-btn-hover"
                onClick={() => setSelectedConversation(null)}
              >
                <X />
              </Button>
              <div className="relative">
                <div className="rounded-full p-[2px]" style={{background: 'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedConversation.other_user?.profile_photo} />
                    <AvatarFallback style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:700,fontFamily:"'Space Grotesk',sans-serif"}}>
                      {selectedConversation.other_user?.username?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {isUserOnline(selectedConversation.other_user?.user_id) && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 online-badge" style={{background:'#22c55e', borderColor:'hsl(var(--card))'}} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{selectedConversation.other_user?.real_name}</h3>
                <span className={`text-xs ${isUserOnline(selectedConversation.other_user?.user_id) ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {isUserOnline(selectedConversation.other_user?.user_id) ? t("online") : t("offline")}
                </span>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 items-center">
              <Button variant="ghost" size="icon" onClick={() => startCall("audio")} className="icon-btn-hover text-muted-foreground h-8 w-8">
                <Phone size={17} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => startCall("video")} className="icon-btn-hover text-muted-foreground h-8 w-8">
                <Video size={17} />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="icon-btn-hover text-muted-foreground h-8 w-8"><Calendar size={17} /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-popover border border-border">
                  <h4 className="text-foreground font-semibold mb-3 text-sm">Search by Date</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" className="bg-muted text-foreground text-xs" onChange={(e) => setDateSearch({...dateSearch, start: e.target.value})} />
                      <Input type="date" className="bg-muted text-foreground text-xs" onChange={(e) => setDateSearch({...dateSearch, end: e.target.value})} />
                    </div>
                    <Button className="w-full text-sm" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}} onClick={() => fetchMessages(selectedConversation.conversation_id, dateSearch)}>Search</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={() => setShowPrivacy(true)} className="icon-btn-hover text-muted-foreground h-8 w-8"><Shield size={17} /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="icon-btn-hover text-muted-foreground h-8 w-8"><MoreVertical size={17} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-foreground bg-popover border border-border">
                  <DropdownMenuItem onClick={clearChat} className="text-destructive cursor-pointer text-sm">
                    <Eraser className="mr-2 h-4 w-4" /><span>{t("clear_chat")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {memoizedMessages}
            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start animate-fade-up">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input Bar */}
          <div className="p-3 flex-shrink-0 bg-card border-t border-border" style={{ backdropFilter:'blur(20px)' }}>
            {isCurrentChatBlocked ? (
              <div className="w-full text-center p-3 text-sm font-medium rounded-xl" style={{background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)'}}>
                You have blocked this user. Unblock to send messages.
              </div>
            ) : (
              <>
                {showMediaUploader && (
                  <MediaUploader onUpload={(f) => setAttachedFiles((p) => [...p, f])} />
                )}
                {attachedFiles.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                    {attachedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="px-3 py-1 rounded-full flex items-center gap-2 text-xs animate-slide-in-left flex-shrink-0"
                        style={{background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.25)', color:'#c4b5fd'}}
                      >
                        {f.name}
                        <X
                          size={11}
                          className="cursor-pointer opacity-70 hover:opacity-100"
                          onClick={() => setAttachedFiles(attachedFiles.filter((x) => x.id !== f.id))}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {showEmojiPicker && (
                  <div className="absolute bottom-20 z-50">
                    <EmojiPicker
                      theme="dark"
                      onEmojiClick={(e) => setMessageInput((p) => p + e.emoji)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => setShowMediaUploader(!showMediaUploader)}
                      className="icon-btn-hover h-9 w-9 text-muted-foreground">
                      <Paperclip size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="icon-btn-hover h-9 w-9 text-muted-foreground">
                      <Smile size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={sendLocation}
                      className="icon-btn-hover h-9 w-9 text-muted-foreground">
                      <MapPin size={18} />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`h-9 w-9 icon-btn-hover ${
                        isRecording ? "recording-btn text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                    </Button>
                  </div>
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      socket?.emit("typing", { conversation_id: selectedConversation.conversation_id });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={isRecording ? "Recording…" : t("type_message")}
                    className="flex-1 rounded-full text-foreground text-sm h-10 bg-muted border border-border"
                    disabled={isRecording}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isRecording}
                    className="glow-btn flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow:'0 4px 16px rgba(124,58,237,0.4)'}}
                  >
                    <Send size={16} className="text-white ml-0.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-background relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute w-96 h-96 rounded-full pointer-events-none animate-orb-float"
            style={{background:'radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)', top:'10%', left:'20%'}} />
          <div className="absolute w-64 h-64 rounded-full pointer-events-none"
            style={{background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', bottom:'15%', right:'15%', animation:'orbFloat 8s ease-in-out infinite reverse'}} />
          <div className="text-center animate-fade-up">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.15))', border:'1px solid rgba(139,92,246,0.2)', boxShadow:'0 0 40px rgba(124,58,237,0.15)'}}
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
              setMessageInput(url);
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
