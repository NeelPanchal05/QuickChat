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
  LogOut,
  Phone,
  Video,
  Paperclip,
  Send,
  Smile,
  MoreVertical,
  Pin,
  Settings,
  BarChart3,
  Archive,
  Shield,
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
  DialogPortal,
} from "@/components/ui/dialog";

export default function Chat() {
  const { user, token, socket, logout, API } = useAuth();
  const { currentThemeData } = useTheme();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState(null);

  // New feature states
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (socket) {
      socket.on("new_message", handleNewMessage);
      socket.on("user_typing", handleUserTyping);
      socket.on("user_online", (data) => {
        setOnlineUsers((prev) => new Set([...prev, data.user_id]));
      });
      socket.on("user_offline", (data) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.user_id);
          return newSet;
        });
      });
      socket.on("incoming_call", handleIncomingCall);

      return () => {
        socket.off("new_message", handleNewMessage);
        socket.off("user_typing", handleUserTyping);
        socket.off("user_online");
        socket.off("user_offline");
        socket.off("incoming_call");
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
      if (selectedConversation) {
        socket?.emit("leave_conversation", {
          conversation_id: selectedConversation.conversation_id,
        });
      }
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(
        `${API}/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Failed to search users:", error);
    }
  };

  const createOrOpenConversation = async (userId) => {
    try {
      const response = await axios.post(
        `${API}/conversations`,
        { participant_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newConv = response.data;
      const existingIndex = conversations.findIndex(
        (c) => c.conversation_id === newConv.conversation_id
      );

      if (existingIndex === -1) {
        setConversations([newConv, ...conversations]);
      }

      setSelectedConversation(newConv);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleNewMessage = (message) => {
    if (message.conversation_id === selectedConversation?.conversation_id) {
      setMessages((prev) => [...prev, message]);
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

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    socket?.emit("send_message", {
      conversation_id: selectedConversation.conversation_id,
      content: messageInput,
      message_type: "text",
    });

    setMessageInput("");
    setShowEmojiPicker(false);
  };

  const handleTyping = () => {
    if (selectedConversation) {
      socket?.emit("typing", {
        conversation_id: selectedConversation.conversation_id,
      });
    }
  };

  const handleIncomingCall = (data) => {
    setCallData({ ...data, incoming: true });
    setShowCall(true);
  };

  const startCall = (callType) => {
    if (!selectedConversation) return;

    const otherUser = selectedConversation.other_user;
    setCallData({
      callType,
      otherUser,
      incoming: false,
    });
    setShowCall(true);
  };

  const pinConversation = async (conversationId, isPinned) => {
    try {
      if (isPinned) {
        await axios.delete(`${API}/conversations/${conversationId}/pin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(
          `${API}/conversations/${conversationId}/pin`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      fetchConversations();
    } catch (error) {
      toast.error("Failed to pin conversation");
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      await axios.delete(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConversations();
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(null);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const isUserOnline = (userId) => onlineUsers.has(userId);

  // New feature handlers
  const handleLogout = async () => {
    logout();
  };

  const handleMediaUpload = (file) => {
    setAttachedFiles((prev) => [...prev, file]);
    toast.success(`File ${file.name} attached`);
  };

  const handleRemoveMedia = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSelectGif = (gifUrl) => {
    setMessageInput(gifUrl);
    setShowGifPicker(false);
  };

  const handleCreatePoll = async (poll) => {
    try {
      if (!selectedConversation) {
        toast.error("Select a conversation first");
        return;
      }

      const response = await axios.post(
        `${API}/polls`,
        {
          conversation_id: selectedConversation.conversation_id,
          ...poll,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket?.emit("new_message", {
        conversation_id: selectedConversation.conversation_id,
        content: JSON.stringify(response.data),
        message_type: "poll",
      });

      toast.success("Poll created!");
      setShowPollCreator(false);
    } catch (error) {
      toast.error("Failed to create poll");
    }
  };

  const sendMessageWithAttachments = async () => {
    if (!messageInput.trim() && attachedFiles.length === 0) return;

    try {
      // Send text message
      if (messageInput.trim()) {
        await sendMessage(messageInput);
      }

      // Send attached files
      for (const file of attachedFiles) {
        await axios.post(
          `${API}/conversations/${selectedConversation.conversation_id}/messages`,
          {
            content: file.data,
            message_type: file.type,
            file_name: file.name,
            mime_type: file.mimeType,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        socket?.emit("new_message", {
          conversation_id: selectedConversation.conversation_id,
          content: file.data,
          message_type: file.type,
          file_name: file.name,
        });
      }

      // Clear input
      setMessageInput("");
      setAttachedFiles([]);
      setShowMediaUploader(false);
    } catch (error) {
      toast.error("Failed to send message with attachments");
    }
  };

  return (
    <div
      className="h-screen flex flex-col md:flex-row bg-[#050505]"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      {/* Sidebar */}
      <div className="w-full md:w-80 backdrop-blur-xl bg-black/70 border-b md:border-b-0 md:border-r border-white/5 flex flex-col max-h-1/2 md:max-h-screen">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 md:h-8 w-6 md:w-8 text-[#7000FF]" />
              <h1
                className="text-lg md:text-2xl font-bold hidden sm:block"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                QuickChat
              </h1>
            </div>
            <SettingsMenu
              onProfile={() => setShowProfile(true)}
              onLogout={handleLogout}
              onTerms={() => setShowTerms(true)}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
              size={18}
            />
            <Input
              data-testid="search-input"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#7000FF] rounded-full text-sm md:text-base"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-black/50 border border-white/10 rounded-lg overflow-hidden max-h-40 md:max-h-56 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.user_id}
                  data-testid={`search-result-${user.user_id}`}
                  onClick={() => createOrOpenConversation(user.user_id)}
                  className="w-full p-2 md:p-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Avatar className="h-8 md:h-10 w-8 md:w-10">
                    <AvatarImage src={user.profile_photo} />
                    <AvatarFallback className="bg-[#7000FF]/20 text-[#7000FF]">
                      {user.real_name?.charAt(0) || user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {user.real_name}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const otherUser = conv.other_user;
            const isOnline = isUserOnline(otherUser?.user_id);

            return (
              <div
                key={conv.conversation_id}
                data-testid={`conversation-${conv.conversation_id}`}
                onClick={() => setSelectedConversation(conv)}
                className={`p-2 md:p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                  selectedConversation?.conversation_id === conv.conversation_id
                    ? "bg-white/10"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 md:h-12 w-10 md:w-12">
                      <AvatarImage src={otherUser?.profile_photo} />
                      <AvatarFallback className="bg-[#7000FF]/20 text-[#7000FF]">
                        {otherUser?.real_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-[#050505] rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white truncate text-sm md:text-base">
                        {otherUser?.real_name || otherUser?.username}
                      </p>
                      {conv.is_pinned && (
                        <Pin
                          size={14}
                          className="text-[#7000FF] flex-shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-[#A1A1AA] truncate">
                      {conv.last_message?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-1/2 md:min-h-full">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 backdrop-blur-xl bg-black/70 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Avatar className="h-8 md:h-10 w-8 md:w-10 flex-shrink-0">
                  <AvatarImage
                    src={selectedConversation.other_user?.profile_photo}
                  />
                  <AvatarFallback className="bg-[#7000FF]/20 text-[#7000FF]">
                    {selectedConversation.other_user?.real_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm md:text-base truncate">
                    {selectedConversation.other_user?.real_name}
                  </p>
                  <p className="text-xs md:text-sm text-[#A1A1AA]">
                    {isUserOnline(selectedConversation.other_user?.user_id)
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <Button
                  data-testid="voice-call-button"
                  onClick={() => startCall("audio")}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-white/10 text-[#A1A1AA] hover:text-[#00F0FF] h-8 md:h-10 w-8 md:w-10"
                >
                  <Phone size={18} className="md:w-5 md:h-5" />
                </Button>
                <Button
                  data-testid="video-call-button"
                  onClick={() => startCall("video")}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-white/10 text-[#A1A1AA] hover:text-[#00F0FF] h-8 md:h-10 w-8 md:w-10"
                >
                  <Video size={18} className="md:w-5 md:h-5" />
                </Button>
                <Button
                  onClick={() =>
                    pinConversation(
                      selectedConversation.conversation_id,
                      selectedConversation.is_pinned
                    )
                  }
                  variant="ghost"
                  size="icon"
                  className="hover:bg-white/10 text-[#A1A1AA] hover:text-[#7000FF] h-8 md:h-10 w-8 md:w-10"
                >
                  <Pin
                    size={18}
                    className={`md:w-5 md:h-5 ${
                      selectedConversation.is_pinned ? "text-[#7000FF]" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4"
              data-testid="messages-container"
              style={
                currentThemeData?.bgStyle || {
                  background:
                    "linear-gradient(135deg, rgba(5, 5, 5, 0.95), rgba(112, 0, 255, 0.1))",
                }
              }
            >
              {messages.map((message) => {
                const isOwn = message.sender_id === user.user_id;

                return (
                  <div
                    key={message.message_id}
                    data-testid={`message-${message.message_id}`}
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-3 md:px-4 py-2 rounded-2xl text-sm md:text-base ${
                        isOwn
                          ? "bg-gradient-to-br from-[#7000FF] to-[#5B00D1] text-white rounded-tr-sm"
                          : "bg-white/10 text-white rounded-tl-sm backdrop-blur-sm"
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {isOwn && (
                          <MessageReadStatus
                            status={message.status || "sent"}
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
            <div className="p-2 md:p-4 backdrop-blur-xl bg-black/70 border-t border-white/5 flex-shrink-0">
              {showEmojiPicker && (
                <div className="mb-2">
                  <EmojiPicker
                    onEmojiClick={(emoji) => {
                      setMessageInput((prev) => prev + emoji.emoji);
                    }}
                    theme="dark"
                    width="100%"
                    height="250px"
                  />
                </div>
              )}

              {/* Media Uploader */}
              {showMediaUploader && (
                <div className="mb-3">
                  <MediaUploader
                    onUpload={handleMediaUpload}
                    disabled={!selectedConversation}
                  />
                </div>
              )}

              {/* Display Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 space-y-2 mb-3">
                  <p className="text-xs font-semibold text-[#A1A1AA]">
                    Attached Files ({attachedFiles.length})
                  </p>
                  <div className="space-y-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-black/60 rounded"
                      >
                        <span className="text-sm text-white truncate">
                          {file.name}
                        </span>
                        <Button
                          onClick={() => handleRemoveMedia(file.id)}
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-500/20 h-6 w-6"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Buttons Row */}
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                <Button
                  onClick={() => setShowBackgroundSelector(true)}
                  variant="ghost"
                  size="icon"
                  title="Change Background"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <Settings size={16} />
                </Button>

                <Button
                  onClick={() => setShowCallHistory(true)}
                  variant="ghost"
                  size="icon"
                  title="Call History"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <Phone size={16} />
                </Button>

                <Button
                  onClick={() => setShowPrivacy(true)}
                  variant="ghost"
                  size="icon"
                  title="Privacy Settings"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <Shield size={16} />
                </Button>

                <Button
                  onClick={() => setShowMediaUploader(!showMediaUploader)}
                  variant="ghost"
                  size="icon"
                  title="Attach Media"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <Paperclip size={16} />
                </Button>

                <Button
                  onClick={() => setShowGifPicker(true)}
                  variant="ghost"
                  size="icon"
                  title="Insert GIF"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <Smile size={16} />
                </Button>

                <Button
                  onClick={() => setShowPollCreator(true)}
                  variant="ghost"
                  size="icon"
                  title="Create Poll"
                  className="text-[#A1A1AA] hover:text-white h-8 w-8"
                >
                  <BarChart3 size={16} />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  variant="ghost"
                  size="icon"
                  data-testid="emoji-button"
                  className="hover:bg-white/10 text-[#A1A1AA] hover:text-[#7000FF] h-8 md:h-10 w-8 md:w-10 flex-shrink-0"
                >
                  <Smile size={18} className="md:w-5 md:h-5" />
                </Button>

                <Input
                  data-testid="message-input"
                  placeholder="Message..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 bg-white/5 border-white/10 text-white focus:border-[#7000FF] rounded-full text-sm md:text-base"
                />

                <Button
                  onClick={sendMessage}
                  data-testid="send-button"
                  disabled={!messageInput.trim()}
                  className="bg-[#7000FF] hover:bg-[#5B00D1] text-white rounded-full px-3 md:px-6 shadow-[0_0_15px_rgba(112,0,255,0.4)] h-8 md:h-10 flex-shrink-0"
                >
                  <Send size={16} className="md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <MessageCircle
                className="h-16 md:h-20 w-16 md:w-20 text-[#7000FF] mx-auto mb-4"
                strokeWidth={1.5}
              />
              <h2
                className="text-xl md:text-2xl font-semibold mb-2"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Welcome to QuickChat
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {showCall && callData && (
        <CallModal
          data-testid="call-modal"
          callData={callData}
          socket={socket}
          userId={user.user_id}
          onClose={() => {
            setShowCall(false);
            setCallData(null);
          }}
        />
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Profile user={user} onBack={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <TermsAndConditions
            onBack={() => setShowTerms(false)}
            onAccept={() => setShowTerms(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Chat Background Selector Dialog */}
      <Dialog
        open={showBackgroundSelector}
        onOpenChange={setShowBackgroundSelector}
      >
        <DialogContent className="max-w-2xl">
          <ChatBackgroundSelector
            onClose={() => setShowBackgroundSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Call History Dialog */}
      <Dialog open={showCallHistory} onOpenChange={setShowCallHistory}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <CallHistory onClose={() => setShowCallHistory(false)} />
        </DialogContent>
      </Dialog>

      {/* Privacy Manager Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <PrivacyManager onClose={() => setShowPrivacy(false)} />
        </DialogContent>
      </Dialog>

      {/* GIF Picker Dialog */}
      <Dialog open={showGifPicker} onOpenChange={setShowGifPicker}>
        <DialogContent className="max-w-2xl">
          <GifPicker
            onSelect={handleSelectGif}
            onClose={() => setShowGifPicker(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Poll Creator Dialog */}
      <Dialog open={showPollCreator} onOpenChange={setShowPollCreator}>
        <DialogContent className="max-w-xl">
          <PollCreator
            onCreatePoll={handleCreatePoll}
            onClose={() => setShowPollCreator(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
