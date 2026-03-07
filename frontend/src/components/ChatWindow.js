import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Phone, Video, Calendar, Shield, MoreVertical, Eraser, MessageCircle, X, Download, MapPin, Paperclip, Reply, Smile } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
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
import MessageInput from "@/components/MessageInput";
import { Virtuoso } from "react-virtuoso";

export default function ChatWindow({
  startCall,
  dateSearch,
  setDateSearch,
  setShowPrivacy,
  clearChat,
  isCurrentChatBlocked,
  downloadFile,
}) {
  const { user, socket } = useAuth();
  const { t } = useLanguage();
  const { currentThemeData } = useTheme();
  
  const {
    selectedConversation,
    setSelectedConversation,
    onlineUsers,
    typing,
    fetchMessages,
    hasMoreMessages,
    messages,
    isLoadingMessages,
    setReplyingTo
  } = useChat();

  const isUserOnline = (userId) => onlineUsers.has(userId);

  // --- Infinite Scroll Logic ---
  const observerRef = useRef(null);
  
  const loadMoreMessages = useCallback(() => {
    if (isLoadingMessages || !hasMoreMessages || messages.length === 0 || !selectedConversation) return;
    
    // The timestamp of the oldest loaded message acts as our cursor
    const oldestMessageTimestamp = messages[0].timestamp;
    
    fetchMessages(selectedConversation.conversation_id, { before: oldestMessageTimestamp }, true);
  }, [isLoadingMessages, hasMoreMessages, messages, selectedConversation, fetchMessages]);

  const topElementRef = useCallback((node) => {
    if (isLoadingMessages) return;
    
    // Disconnect old observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      // If the top element intersects, we have scrolled to the top
      if (entries[0].isIntersecting && hasMoreMessages) {
        loadMoreMessages();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [isLoadingMessages, hasMoreMessages, loadMoreMessages]);

  return (
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
      <div className="flex-1 p-4 flex flex-col relative w-full h-full overflow-hidden">
        <Virtuoso
          className="custom-scrollbar"
          style={{ height: '100%', width: '100%', overflowX: 'hidden' }}
          data={messages}
          firstItemIndex={0}
          initialTopMostItemIndex={messages.length - 1}
          startReached={() => {
            if (hasMoreMessages && !isLoadingMessages) {
              loadMoreMessages();
            }
          }}
          components={{
            Header: () => (
              <div className="h-4 w-full flex justify-center items-center py-4">
                {isLoadingMessages && <div className="typing-dot w-2 h-2 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />}
              </div>
            )
          }}
          itemContent={(index, m) => {
            // We need to re-implement the memoized message logic per-item for Virtuoso to render
            const isOwn = user && m.sender_id === user.user_id;

            if (m.message_type === "poll") return null;

            const repliedMessage = m.reply_to ? messages.find(msg => msg.message_id === m.reply_to) : null;

            return (
              <div className="py-1">
                <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-message-in group`}>
                  <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    
                    {repliedMessage && (
                      <div className={`text-xs opacity-75 mb-1 px-3 py-1.5 rounded-lg truncate border-l-2 max-w-full cursor-pointer hover:opacity-100 transition-opacity ${isOwn ? 'border-primary/50 bg-primary/10' : 'border-muted-foreground/50 bg-muted/50'}`}>
                        <span className="font-semibold block mb-0.5">{repliedMessage.sender_id === user?.user_id ? "You" : "Them"}:</span>
                        {repliedMessage.message_type === 'text' ? repliedMessage.content : `[${repliedMessage.message_type}]`}
                      </div>
                    )}

                    <div className={`relative flex items-center gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} w-full`}>
                      <div className={`px-4 py-2.5 rounded-2xl relative z-10 w-fit ${isOwn ? "bubble-own text-white rounded-tr-sm" : "bubble-other text-foreground rounded-tl-sm"}`}>
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
                      <div className="relative group overflow-hidden rounded-xl">
                        <img src={m.content} alt="attachment" className="w-full max-h-60 object-cover" />
                        <button
                          onClick={() => downloadFile(m.content, m.file_name || "image")}
                          className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                          title="Download Image"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                    {m.message_type && ["audio", "video"].includes(m.message_type.split("/")[0]) && (
                      <div>
                        <video controls src={m.content} className="max-w-full rounded-xl" />
                      </div>
                    )}
                    {m.message_type &&
                      !["text", "location", "image", "poll"].includes(m.message_type) &&
                      !["audio", "video"].includes(m.message_type.split("/")[0]) && (
                      <button
                        onClick={() => downloadFile(m.content, m.file_name)}
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
                        <div className="text-[10px] opacity-70">
                          {m.read_by?.length > 1 ? "Read" : "Sent"}
                        </div>
                      )}
                    </div>

                    {m.reactions && m.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 -mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(m.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                          <button key={emoji} onClick={() => {
                            const userReacted = m.reactions.find(r => r.emoji === emoji && r.user_id === user.user_id);
                            if (userReacted) {
                              socket.emit("remove_reaction", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                            } else {
                              socket.emit("add_reaction", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                            }
                          }} className="text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-black/20 dark:hover:bg-black/40 transition-colors flex items-center gap-1 border border-foreground/5 text-inherit">
                            <span>{emoji}</span><span>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 shrink-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80">
                          <Smile size={14} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-auto p-2 flex gap-1 rounded-full border border-border bg-popover shadow-xl z-50">
                        {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                          <button key={emoji} onClick={() => {
                            socket.emit("add_reaction", { message_id: m.message_id, conversation_id: selectedConversation.conversation_id, emoji });
                          }} className="text-xl hover:scale-125 transition-transform p-1">
                            {emoji}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/80" onClick={() => setReplyingTo(m)}>
                      <Reply size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
          }}
        />

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start animate-fade-up absolute bottom-2 left-4 z-10 bg-card rounded-2xl shadow-lg">
            <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
              <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{background:'rgba(139,92,246,0.8)'}} />
            </div>
          </div>
        )}
      </div>
      {/* Input Bar */}
      <MessageInput
        isCurrentChatBlocked={isCurrentChatBlocked}
      />
    </div>
  );
}
