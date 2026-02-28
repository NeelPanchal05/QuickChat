import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
    if (!user) return;
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
  };

  const startRecording = async () => {
    if (!selectedConversation) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result;

          addOptimisticMessage(base64data, "audio/webm", "voice_message.webm");

          try {
            await axios.post(
              `${API}/conversations/${selectedConversation.conversation_id}/messages`,
              {
                content: base64data,
                message_type: "audio/webm",
                file_name: "voice_message.webm",
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (error) {
            toast.error("Failed to send voice message");
          }
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      toast.info("Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- Socket & User Effects ---
  useEffect(() => {
    // If user is not fully loaded, do not set up listeners yet to prevent crashes
    if (!socket || !user) return;

    const handleNewMessage = (msg) => {
      const currentConv = selectedConversationRef.current;

      setMessages((prev) => {
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
      addOptimisticMessage(messageInput, "text");
      socket?.emit("send_message", {
        conversation_id: selectedConversation.conversation_id,
        content: messageInput,
        message_type: "text",
      });
    }

    for (const file of attachedFiles) {
      addOptimisticMessage(file.data, file.type, file.name);

      try {
        await axios.post(
          `${API}/conversations/${selectedConversation.conversation_id}/messages`,
          { content: file.data, message_type: file.type, file_name: file.name },
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
        addOptimisticMessage(locationUrl, "location");
        socket?.emit("send_message", {
          conversation_id: selectedConversation.conversation_id,
          content: locationUrl,
          message_type: "location",
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

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } w-full md:w-80 backdrop-blur-xl bg-card/80 border-r border-border flex-col h-full`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <MessageCircle className="text-primary-foreground w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-foreground hidden sm:block">
                QuickChat
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInvite(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <UserPlus size={20} />
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
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-9 bg-muted border-border text-foreground rounded-full h-9"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-popover border border-border rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => createOrOpenConversation(u.user_id)}
                  className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.profile_photo} />
                    <AvatarFallback>{u.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {u.real_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{u.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.conversation_id}
              onClick={() => setSelectedConversation(c)}
              className={`group p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors relative ${
                selectedConversation?.conversation_id === c.conversation_id
                  ? "bg-accent/80"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={c.other_user?.profile_photo} />
                    <AvatarFallback>{c.other_user?.username?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  {isUserOnline(c.other_user?.user_id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground truncate">
                      {c.other_user?.real_name}
                    </span>
                    {c.is_pinned && <Pin size={12} className="text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.last_message?.content
                      ? c.last_message.content.length > 30
                        ? c.last_message.content.substring(0, 30) + "..."
                        : c.last_message.content
                      : t("start_chatting")}
                  </p>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-popover border-border"
                    >
                      <DropdownMenuItem
                        onClick={(e) => blockUser(e, c.other_user?.user_id)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <UserX size={14} className="mr-2" /> Block User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) =>
                          deleteConversation(e, c.conversation_id)
                        }
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 size={14} className="mr-2" /> Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div
          className={`${
            !selectedConversation ? "hidden md:flex" : "flex"
          } flex-1 flex-col h-full relative`}
          style={
            currentThemeData?.bgStyle || {
              backgroundColor: "var(--background)",
            }
          }
        >
          <div className="p-3 md:p-4 backdrop-blur-md bg-card/80 border-b border-border flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-foreground"
                onClick={() => setSelectedConversation(null)}
              >
                <X />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={selectedConversation.other_user?.profile_photo}
                />
                <AvatarFallback>
                  {selectedConversation.other_user?.username?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  {selectedConversation.other_user?.real_name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {isUserOnline(selectedConversation.other_user?.user_id)
                    ? t("online")
                    : t("offline")}
                </span>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startCall("audio")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Phone size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startCall("video")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Video size={18} />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Calendar size={18} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover border border-border p-4">
                  <h4 className="text-foreground font-medium mb-2">
                    Search by Date
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        className="bg-muted text-foreground"
                        onChange={(e) =>
                          setDateSearch({
                            ...dateSearch,
                            start: e.target.value,
                          })
                        }
                      />
                      <Input
                        type="date"
                        className="bg-muted text-foreground"
                        onChange={(e) =>
                          setDateSearch({ ...dateSearch, end: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() =>
                        fetchMessages(
                          selectedConversation.conversation_id,
                          dateSearch
                        )
                      }
                    >
                      Search
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPrivacy(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Shield size={18} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-popover border-border text-foreground"
                >
                  <DropdownMenuItem
                    onClick={clearChat}
                    className="text-destructive cursor-pointer"
                  >
                    <Eraser className="mr-2 h-4 w-4" />
                    <span>{t("clear_chat")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((m) => {
              const isOwn = user && m.sender_id === user.user_id;

              // Prevent Poll crashes
              if (m.message_type === "poll") return null;

              return (
                <div
                  key={m.message_id}
                  className={`flex ${
                    isOwn ? "justify-end" : "justify-start"
                  } animate-message-in`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none backdrop-blur-sm"
                    }`}
                  >
                    {m.message_type === "text" && <p>{m.content}</p>}
                    {m.message_type === "location" && (
                      <a
                        href={m.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline text-inherit"
                      >
                        <MapPin size={16} /> {t("view_location")}
                      </a>
                    )}
                    {m.message_type === "image" && (
                      <img
                        src={m.content}
                        alt="attachment"
                        className="rounded-lg max-h-60"
                      />
                    )}
                    {m.message_type &&
                      ["audio", "video"].includes(
                        m.message_type.split("/")[0]
                      ) && (
                        <video
                          controls
                          src={m.content}
                          className="max-w-full rounded-lg"
                        />
                      )}
                    {m.message_type &&
                      !["text", "location", "image", "poll"].includes(
                        m.message_type
                      ) &&
                      !["audio", "video"].includes(
                        m.message_type.split("/")[0]
                      ) && (
                        <div className="flex items-center gap-2">
                          <Paperclip size={16} />
                          <span className="text-sm underline">
                            {m.file_name || t("attached_file")}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between items-center mt-1 gap-2">
                      <span className="text-[10px] opacity-70">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isOwn && (
                        <MessageReadStatus
                          status={m.read_by?.length > 1 ? "read" : "sent"}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 backdrop-blur-md bg-card/80 border-t border-border">
            {isCurrentChatBlocked ? (
              <div className="w-full text-center p-2 text-destructive font-medium bg-destructive/10 rounded-lg">
                You have blocked this user. Unblock to send messages.
              </div>
            ) : (
              <>
                {showMediaUploader && (
                  <MediaUploader
                    onUpload={(f) => setAttachedFiles((p) => [...p, f])}
                  />
                )}
                {attachedFiles.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {attachedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="bg-muted px-3 py-1 rounded-full flex items-center gap-2 text-foreground text-xs"
                      >
                        {f.name}{" "}
                        <X
                          size={12}
                          className="cursor-pointer"
                          onClick={() =>
                            setAttachedFiles(
                              attachedFiles.filter((x) => x.id !== f.id)
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
                {showEmojiPicker && (
                  <div className="absolute bottom-20">
                    <EmojiPicker
                      theme={currentThemeData.bgStyle ? "dark" : "auto"}
                      onEmojiClick={(e) => setMessageInput((p) => p + e.emoji)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMediaUploader(!showMediaUploader)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Paperclip size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Smile size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={sendLocation}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <MapPin size={20} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`${
                        isRecording
                          ? "text-destructive animate-pulse"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {isRecording ? (
                        <Square size={20} fill="currentColor" />
                      ) : (
                        <Mic size={20} />
                      )}
                    </Button>
                  </div>
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      socket?.emit("typing", {
                        conversation_id: selectedConversation.conversation_id,
                      });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={
                      isRecording ? "Recording..." : t("type_message")
                    }
                    className="flex-1 bg-muted border-border text-foreground rounded-full"
                    disabled={isRecording}
                  />
                  <Button
                    onClick={sendMessage}
                    className="bg-primary hover:bg-primary/90 rounded-full w-10 h-10 p-0 flex items-center justify-center"
                    disabled={isRecording}
                  >
                    <Send size={18} className="ml-1 text-primary-foreground" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-background">
          <div className="text-center text-muted-foreground">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to QuickChat
            </h2>
            <p>Select a conversation to start chatting securely.</p>
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
