import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
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
  Settings,
  BarChart3,
  Shield,
  MapPin,
  Calendar,
  UserPlus,
  X,
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
import PollCreator from "@/components/PollCreator";
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

export default function Chat() {
  const { user, token, socket, logout, API } = useAuth();
  const { currentThemeData } = useTheme();

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

  // Modal States
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Call States
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    if (socket) {
      socket.on("new_message", handleNewMessage);
      socket.on("user_typing", handleUserTyping);
      socket.on("user_online", (data) =>
        setOnlineUsers((p) => new Set([...p, data.user_id]))
      );
      socket.on("user_offline", (data) =>
        setOnlineUsers((p) => {
          const newSet = new Set(p);
          newSet.delete(data.user_id);
          return newSet;
        })
      );
      socket.on("incoming_call", handleIncomingCall);
      socket.on("error", (data) => toast.error(data.message));

      return () => {
        socket.off("new_message");
        socket.off("user_typing");
        socket.off("user_online");
        socket.off("user_offline");
        socket.off("incoming_call");
        socket.off("error");
      };
    }
  }, [socket]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversation_id);
      socket?.emit("join_conversation", {
        conversation_id: selectedConversation.conversation_id,
      });
    }
    return () => {
      if (selectedConversation)
        socket?.emit("leave_conversation", {
          conversation_id: selectedConversation.conversation_id,
        });
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- API Calls ---
  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (convId, dates = null) => {
    try {
      let url = `${API}/conversations/${convId}/messages`;
      if (dates) {
        url += `?start_date=${dates.start}&end_date=${dates.end}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

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

  // --- Handlers ---
  const handleNewMessage = (msg) => {
    if (msg.conversation_id === selectedConversation?.conversation_id) {
      setMessages((p) => [...p, msg]);
    }
    fetchConversations();
  };

  const handleUserTyping = (data) => {
    if (data.conversation_id === selectedConversation?.conversation_id) {
      setTyping(data.user_id);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(null), 3000);
    }
  };

  const sendMessage = async () => {
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !selectedConversation
    )
      return;

    // Send Text
    if (messageInput.trim()) {
      socket?.emit("send_message", {
        conversation_id: selectedConversation.conversation_id,
        content: messageInput,
        message_type: "text",
      });
    }

    // Send Attachments
    for (const file of attachedFiles) {
      await axios.post(
        `${API}/conversations/${selectedConversation.conversation_id}/messages`,
        {
          content: file.data,
          message_type: file.type,
          file_name: file.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Note: socket emission for attachments is handled by backend or separate emission here
      socket?.emit("send_message", {
        conversation_id: selectedConversation.conversation_id,
        content: file.data,
        message_type: file.type,
        file_name: file.name,
      });
    }

    setMessageInput("");
    setAttachedFiles([]);
    setShowMediaUploader(false);
    setShowEmojiPicker(false);
  };

  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Getting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationLink = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
        socket?.emit("send_message", {
          conversation_id: selectedConversation.conversation_id,
          content: locationLink,
          message_type: "location",
        });
      },
      () => toast.error("Unable to retrieve your location")
    );
  };

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  const isUserOnline = (userId) => onlineUsers.has(userId);

  const startCall = (callType) => {
    setCallData({
      callType,
      otherUser: selectedConversation.other_user,
      incoming: false,
    });
    setShowCall(true);
  };

  const handleIncomingCall = (data) => {
    setCallData({ ...data, incoming: true });
    setShowCall(true);
  };

  // --- Render ---
  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#050505] font-sans overflow-hidden">
      {/* Sidebar - Responsive handling: Hidden on mobile if chat selected */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } w-full md:w-80 backdrop-blur-xl bg-black/70 border-r border-white/5 flex-col h-full`}
      >
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Logo Placeholder */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7000FF] to-blue-600 flex items-center justify-center">
                <MessageCircle className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white hidden sm:block">
                QuickChat
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInvite(true)}
                className="text-[#A1A1AA] hover:text-white"
              >
                <UserPlus size={20} />
              </Button>
              <SettingsMenu
                onProfile={() => setShowProfile(true)}
                onLogout={logout}
                onTerms={() => setShowTerms(true)}
              />
            </div>
          </div>

          <div className="relative z-20">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
              size={16}
            />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-9 bg-white/5 border-white/10 text-white rounded-full h-9"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#111] border border-white/10 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => createOrOpenConversation(u.user_id)}
                  className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.profile_photo} />
                    <AvatarFallback>{u.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {u.real_name}
                    </p>
                    <p className="text-xs text-[#666]">@{u.username}</p>
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
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                selectedConversation?.conversation_id === c.conversation_id
                  ? "bg-white/10"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={c.other_user?.profile_photo} />
                    <AvatarFallback>{c.other_user?.username[0]}</AvatarFallback>
                  </Avatar>
                  {isUserOnline(c.other_user?.user_id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-white truncate">
                      {c.other_user?.real_name}
                    </span>
                    {c.is_pinned && (
                      <Pin size={12} className="text-[#7000FF]" />
                    )}
                  </div>
                  <p className="text-xs text-[#888] truncate">
                    {c.last_message?.content?.substring(0, 30) ||
                      "Start chatting..."}
                  </p>
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
          style={currentThemeData?.bgStyle}
        >
          {/* Header */}
          <div className="p-3 md:p-4 backdrop-blur-md bg-black/60 border-b border-white/10 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white"
                onClick={() => setSelectedConversation(null)}
              >
                <X />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={selectedConversation.other_user?.profile_photo}
                />
                <AvatarFallback>
                  {selectedConversation.other_user?.username[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {selectedConversation.other_user?.real_name}
                </h3>
                <span className="text-xs text-gray-400">
                  {isUserOnline(selectedConversation.other_user?.user_id)
                    ? "Online"
                    : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startCall("audio")}
                className="text-gray-400 hover:text-white"
              >
                <Phone size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startCall("video")}
                className="text-gray-400 hover:text-white"
              >
                <Video size={18} />
              </Button>

              {/* Date Search Trigger */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white"
                  >
                    <Calendar size={18} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-black border border-white/10 p-4">
                  <h4 className="text-white font-medium mb-2">
                    Search by Date
                  </h4>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      className="bg-white/10 text-white"
                      onChange={(e) =>
                        setDateSearch({ ...dateSearch, start: e.target.value })
                      }
                    />
                    <Input
                      type="date"
                      className="bg-white/10 text-white"
                      onChange={(e) =>
                        setDateSearch({ ...dateSearch, end: e.target.value })
                      }
                    />
                    <Button
                      className="w-full bg-[#7000FF]"
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
                className="text-gray-400 hover:text-white"
              >
                <Shield size={18} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((m) => {
              const isOwn = m.sender_id === user.user_id;
              return (
                <div
                  key={m.message_id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      isOwn
                        ? "bg-[#7000FF] text-white rounded-tr-none"
                        : "bg-white/10 text-white rounded-tl-none backdrop-blur-sm"
                    }`}
                  >
                    {/* Content Rendering based on Type */}
                    {m.message_type === "text" && <p>{m.content}</p>}
                    {m.message_type === "location" && (
                      <a
                        href={m.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline text-white"
                      >
                        <MapPin size={16} /> View Location
                      </a>
                    )}
                    {m.message_type === "image" && (
                      <img
                        src={m.content}
                        alt="attachment"
                        className="rounded-lg max-h-60"
                      />
                    )}
                    {["audio", "video"].includes(
                      m.message_type?.split("/")[0]
                    ) && (
                      <video
                        controls
                        src={m.content}
                        className="max-w-full rounded-lg"
                      />
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

          {/* Input Area */}
          <div className="p-3 backdrop-blur-md bg-black/60 border-t border-white/10">
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
                    className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-2 text-white text-xs"
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
                  theme="dark"
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
                  className="text-gray-400 hover:text-[#7000FF]"
                >
                  <Paperclip size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-400 hover:text-[#7000FF]"
                >
                  <Smile size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={sendLocation}
                  className="text-gray-400 hover:text-[#7000FF]"
                >
                  <MapPin size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPollCreator(true)}
                  className="text-gray-400 hover:text-[#7000FF]"
                >
                  <BarChart3 size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBackgroundSelector(true)}
                  className="text-gray-400 hover:text-[#7000FF]"
                >
                  <Settings size={20} />
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
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border-white/10 text-white rounded-full"
              />
              <Button
                onClick={sendMessage}
                className="bg-[#7000FF] hover:bg-[#5a00cc] rounded-full w-10 h-10 p-0 flex items-center justify-center"
              >
                <Send size={18} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#0a0a0a]">
          <div className="text-center text-gray-500">
            <div className="w-20 h-20 bg-[#111] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={40} className="text-[#7000FF]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
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
          userId={user.user_id}
          onClose={() => {
            setShowCall(false);
            setCallData(null);
          }}
        />
      )}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <Profile user={user} onBack={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl bg-[#0a0a0a] border-white/10">
          <TermsAndConditions onBack={() => setShowTerms(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={showBackgroundSelector}
        onOpenChange={setShowBackgroundSelector}
      >
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <ChatBackgroundSelector />
        </DialogContent>
      </Dialog>
      <Dialog open={showCallHistory} onOpenChange={setShowCallHistory}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <CallHistory onClose={() => setShowCallHistory(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <PrivacyManager onClose={() => setShowPrivacy(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={showGifPicker} onOpenChange={setShowGifPicker}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <GifPicker
            onSelect={(url) => {
              setMessageInput(url);
              setShowGifPicker(false);
            }}
            onClose={() => setShowGifPicker(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showPollCreator} onOpenChange={setShowPollCreator}>
        <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/10">
          <PollCreator
            onClose={() => setShowPollCreator(false)}
            onCreatePoll={async (poll) => {
              try {
                const res = await axios.post(
                  `${API}/polls`,
                  {
                    conversation_id: selectedConversation.conversation_id,
                    ...poll,
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                socket?.emit("send_message", {
                  conversation_id: selectedConversation.conversation_id,
                  content: JSON.stringify(res.data),
                  message_type: "poll",
                });
                setShowPollCreator(false);
              } catch (e) {
                toast.error("Failed to create poll");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Invite a Friend</DialogTitle>
            <DialogDescription>
              Send an email invitation to join QuickChat.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="friend@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="bg-white/10 border-white/10"
          />
          <Button onClick={inviteFriend} className="bg-[#7000FF] w-full">
            Send Invitation
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
